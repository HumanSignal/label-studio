import csv
import io

import pytest
from data_import.models import FileUpload
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from projects.tests.factories import ProjectFactory
from tasks.models import Task

pytestmark = pytest.mark.django_db


def _csv_bytes(headers, rows, delimiter):
    output = io.StringIO(newline='')
    writer = csv.writer(output, delimiter=delimiter, quoting=csv.QUOTE_ALL)
    writer.writerow(headers)
    writer.writerows(rows)
    return output.getvalue().encode()


@pytest.mark.parametrize('delimiter', [',', ';'])
@pytest.mark.parametrize('header_kind', ['plain', 'quoted', 'escaped', 'multiline'])
@pytest.mark.parametrize('streaming', [False, True])
def test_quoted_header_punctuation_does_not_change_the_csv_separator(
    delimiter, header_kind, streaming, settings, tmp_path
):
    settings.MEDIA_ROOT = str(tmp_path)
    other = ';' if delimiter == ',' else ','
    header = {
        'plain': 'text',
        'quoted': f'text{other}one{other}two{other}three',
        'escaped': f'text "quoted{other}one{other}two"{other}three',
        'multiline': f'text\n{other}one{other}two{other}three',
    }[header_kind]
    headers = [header, 'id']
    rows = [['hello;世界, x', 'row01'], ['"quoted" text', 'row02']]
    content = _csv_bytes(headers, rows, delimiter)
    project = ProjectFactory()
    upload = FileUpload.objects.create(
        project=project, user=project.created_by, file=ContentFile(content, name='quoted.csv')
    )

    assert upload._detect_csv_separator() == delimiter
    if streaming:
        batches = list(upload.read_tasks_streaming(batch_size=1))
        assert [len(batch) for batch in batches] == [1, 1]
        tasks = [task for batch in batches for task in batch]
    else:
        tasks = upload.read_tasks()
    assert tasks == [{'data': dict(zip(headers, row))} for row in rows]
    with upload.file.open('rb') as file:
        assert file.read() == content


@pytest.mark.parametrize('delimiter', [',', ';'])
def test_native_csv_import_api_preserves_quoted_columns(delimiter, setup_project_dialog):
    other = ';' if delimiter == ',' else ','
    headers = ['dialog', f'context{other}one{other}two{other}three']
    rows = [['hello', 'first'], ['world', 'second']]
    content = _csv_bytes(headers, rows, delimiter)
    response = setup_project_dialog.post(
        setup_project_dialog.urls.task_bulk,
        {'file': SimpleUploadedFile('quoted.csv', content, content_type='text/csv')},
    )
    assert response.status_code == 201, response.content
    tasks = Task.objects.filter(project=setup_project_dialog.project).order_by('id')
    assert [task.data for task in tasks] == [dict(zip(headers, row)) for row in rows]


def test_single_quoted_column_defaults_to_comma(settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    project = ProjectFactory()
    content = _csv_bytes(['text;with;semicolons'], [['value']], ',')
    upload = FileUpload.objects.create(
        project=project, user=project.created_by, file=ContentFile(content, name='single.csv')
    )
    assert upload._detect_csv_separator() == ','
    assert upload.read_tasks() == [{'data': {'text;with;semicolons': 'value'}}]


def test_empty_header_keeps_the_default_separator(settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    project = ProjectFactory()
    upload = FileUpload.objects.create(
        project=project, user=project.created_by, file=ContentFile(b'', name='empty.csv')
    )
    assert upload._detect_csv_separator() == ','


@pytest.mark.parametrize('delimiter', [',', ';'])
def test_literal_quotes_inside_unquoted_fields_remain_readable(delimiter, settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    project = ProjectFactory()
    content = f'a"b{delimiter}c{delimiter}d\none{delimiter}two{delimiter}three\n'
    rows = list(csv.reader(io.StringIO(content), delimiter=delimiter))
    upload = FileUpload.objects.create(
        project=project,
        user=project.created_by,
        file=ContentFile(content.encode(), name='literal-quotes.csv'),
    )
    assert upload._detect_csv_separator() == delimiter
    assert upload.read_tasks() == [{'data': dict(zip(rows[0], rows[1]))}]


@pytest.mark.parametrize('delimiter', [',', ';'])
def test_utf8_bom_does_not_hide_a_quoted_header(delimiter, settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    project = ProjectFactory()
    other = ';' if delimiter == ',' else ','
    headers = [f'text{other}one{other}two', 'id']
    content = b'\xef\xbb\xbf' + _csv_bytes(headers, [['value', 'row01']], delimiter)
    upload = FileUpload.objects.create(
        project=project, user=project.created_by, file=ContentFile(content, name='bom.csv')
    )
    assert upload._detect_csv_separator() == delimiter
    assert upload.read_tasks() == [{'data': {headers[0]: 'value', 'id': 'row01'}}]

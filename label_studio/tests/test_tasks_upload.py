"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import io
import copy
import pytest
import zipfile
import ujson as json

from rest_framework.authtoken.models import Token

from tasks.models import Task, Annotation, Prediction
from projects.models import Project


def post_data_as_format(setup, format_type, body, archive, multiply_files):
    # post as data
    if format_type == 'json_data':
        return setup.post(setup.urls.task_bulk, data=body, content_type="application/json")

    # post as files
    if format_type == 'json_file':
        files = {f'upload_file{i}.json': io.StringIO(body) for i in range(0, multiply_files)}
    elif format_type == 'csv_file':
        files = {f'upload_file{i}.csv': io.StringIO(body) for i in range(0, multiply_files)}
    elif format_type == 'tsv_file':
        files = {f'upload_file{i}.tsv': io.StringIO(body) for i in range(0, multiply_files)}
    elif format_type == 'txt_file':
        files = {f'upload_file{i}.txt': io.StringIO(body) for i in range(0, multiply_files)}
    else:
        raise Exception('Incorrect task data format to post')

    # zip: take files below and zip them
    if 'zip' in archive:
        file = io.BytesIO()
        ref = zipfile.ZipFile(file, mode='w', compression=zipfile.ZIP_DEFLATED)
        [ref.writestr(name, body.read()) for name, body in files.items()]

        ref.close()
        file.seek(0, 0)
        files = {'upload_file.zip': file}

        # replicate zip file x2
        if 'zip_x2' == archive:
            files.update({'upload_file2.zip': copy.deepcopy(file)})

    return setup.post(setup.urls.task_bulk, files)


@pytest.mark.parametrize('multiply_files', [1, 5])
@pytest.mark.parametrize('format_type', ['json_file', 'json_data'])
@pytest.mark.parametrize('tasks, status_code, task_count', [
    ([{'data': {'dialog': 'some'}}], 201, 1),
    ([{'data': {'dialog': 'some'}}]*10, 201, 10),
    ([{'data': {'another_field': 'some', 'dialog': 'some'}}], 201, 1),

    ([{'data': {'dialog': 123}, 'created_at': 123}], 201, 1),
    ([{'data': {'another_field': 'some'}}] * 10, 400, 0),
    ([{'data': {}}], 400, 0),
    ([{'data': None}], 400, 0),
    (None, 400, 0),
    ([{'data': 'string'}], 400, 0),
    ([{}, {}], 400, 0),
    ([{}], 400, 0),
    ({}, 400, 0),
    ([], 400, 0),

    ([{'dialog': 'some'}]*10, 201, 10),
    ({'dialog': 'some'}, 201, 1),
    ([{'dialog': 'some', 'second_field': 123}]*10, 201, 10),
    ([{'none': 'some', 'second_field': 123}]*10, 400, 0),
])
@pytest.mark.django_db
def test_json_task_upload(setup_project_dialog, format_type, tasks, status_code, task_count, multiply_files):
    """ Upload JSON as file and data with one task to project.
        Decorator pytest.mark.django_db means it will be clean DB setup_project_dialog for this test.
    """
    if format_type == 'json_data' and multiply_files > 1:
        pytest.skip('Senseless parameter combination')

    r = post_data_as_format(setup_project_dialog, format_type, json.dumps(tasks), 'none', multiply_files)
    print(f'Create json {format_type} tasks result:', r.content)
    assert r.status_code == status_code, f'Upload tasks failed. Response data: {r.data}'
    assert Task.objects.filter(project=setup_project_dialog.project.id).count() == task_count * multiply_files


@pytest.mark.parametrize('tasks, status_code, task_count, annotation_count', [
    ([{'data': {'dialog': 'Test'}, 'annotations': [{'result': [{'id': '123'}]}]}] * 10, 201, 10, 10),
    ([{'data': {'dialog': 'Test'}, 'annotations': [{'result': [{'id': '123'}], 'ground_truth': True}]}], 201, 1, 1),
    ([{'data': {'dialog': 'Test'}, 'annotations': [{'result': '123'}]}], 400, 0, 0),

    ([{'data': {'dialog': 'Test'}, 'meta': 'test'}] * 10, 400, 0, 0),
    ([{'data': {'dialog': 'Test'}, 'annotations': 'test'}] * 10, 400, 0, 0),
    ([{'data': {'dialog': 'Test'}, 'annotations': [{'trash': '123'}]}] * 10, 400, 0, 0),
])
@pytest.mark.django_db
def test_json_task_annotation_and_meta_upload(setup_project_dialog, tasks, status_code, task_count, annotation_count):
    """ Upload JSON task with annotation to project
    """
    format_type = 'json_file'
    multiply_files = 1

    r = post_data_as_format(setup_project_dialog, format_type, json.dumps(tasks), 'none', multiply_files)
    print('Create json tasks with annotations result:', r.content)
    assert r.status_code == status_code, 'Upload one task with annotation failed'

    # tasks
    tasks_db = Task.objects.filter(project=setup_project_dialog.project.id)
    assert tasks_db.count() == task_count * multiply_files
    for task in tasks_db:
        assert not task.is_labeled, 'Task should not be labeled since annotation is ground_truth'

    # annotations
    annotations = Annotation.objects.filter(task__project=setup_project_dialog.project.id)
    assert annotations.count() == annotation_count * multiply_files
    for i, annotation in enumerate(annotations):
        assert annotation.ground_truth


@pytest.mark.parametrize('tasks, status_code, task_count, prediction_count', [
    ([{'data': {'dialog': 'Test'}, 'predictions': [{'result': [{'id': '123'}], 'model_version': 'test'}]}], 201, 1, 1),
    ([{'data': {'dialog': 'Test'}, 'predictions': [{'WRONG_FIELD': '123'}]}], 400, 0, 0),
])
@pytest.mark.django_db
def test_json_task_predictions(setup_project_dialog, tasks, status_code, task_count, prediction_count):
    """ Upload JSON task with predictions to project
    """
    r = post_data_as_format(setup_project_dialog, 'json_file', json.dumps(tasks), 'none', 1)
    assert r.status_code == status_code, 'Upload one task with prediction failed'

    # predictions
    predictions = Prediction.objects.filter(task__project=setup_project_dialog.project.id)
    assert predictions.count() == prediction_count
    for i, predictions in enumerate(predictions):
        assert predictions.model_version == 'test'


@pytest.mark.parametrize('multiply_files', [1, 5])
@pytest.mark.parametrize('archive', ['none'])
@pytest.mark.parametrize('format_type', ['json_file'])
@pytest.mark.parametrize('tasks, status_code, task_count, annotation_count', [
    ([{'data': {'dialog': 'Test'}, 'annotations': [{'result': [{'id': '123'}]}, {'result': [{'id': '456'}]}]}]*10, 201, 10, 20),
    ([{'data': {'dialog': 'Test'}, 'annotations': [{'trash': '123'}]}]*10, 400, 0, 0),
])
@pytest.mark.django_db
def test_archives(setup_project_dialog, format_type, tasks, status_code, task_count,
                  annotation_count, archive, multiply_files):
    """ Upload JSON task with annotation to project
    """
    multiplier = (2 if 'zip_x2' == archive else 1) * multiply_files

    r = post_data_as_format(setup_project_dialog, format_type, json.dumps(tasks), archive, multiply_files)
    print('Create json tasks with annotations result:', r.content)
    assert r.status_code == status_code, 'Upload one task with annotation failed'

    # tasks
    tasks = Task.objects.filter(project=setup_project_dialog.project.id)
    assert tasks.count() == task_count * multiplier
    for task in tasks:
        assert not task.is_labeled, 'Task should not be labeled since annotation is ground_truth'

    # annotations
    annotations = Annotation.objects.filter(task__project=setup_project_dialog.project.id)
    assert annotations.count() == annotation_count * multiplier
    for annotation in annotations:
        assert annotation.ground_truth


@pytest.mark.parametrize('multiply_files', [1, 5])
@pytest.mark.parametrize('archive', ['none'])
@pytest.mark.parametrize('format_type', ['csv_file', 'tsv_file'])
@pytest.mark.parametrize('tasks, status_code, task_count', [
    ('dialog,second\ndialog 1,second 1\ndialog 2,second 2', 201, 2),
    ('dialog,second,class\ndialog 1, second 2, class 1', 201, 1),
    ('here_is_error_in_column_count,second\ndialog 1, second 1, class 1', 400, 0),
    ('empty_rows\n', 400, 0),
    ('', 400, 0)
])
@pytest.mark.django_db
def test_csv_tsv_task_upload(setup_project_dialog, format_type, tasks, status_code, task_count,
                             archive, multiply_files):
    """ Upload CSV/TSV with one task to project
    """
    multiplier = (2 if 'zip_x2' == archive else 1) * multiply_files

    tasks = tasks if format_type == 'csv_file' else tasks.replace(',', '\t')  # prepare tsv file from csv
    r = post_data_as_format(setup_project_dialog, format_type, tasks, archive, multiply_files)
    print(f'Create {format_type} tasks result:', r.content)

    assert r.status_code == status_code, f'Upload one task {format_type} failed. Response data: {r.data}'
    assert Task.objects.filter(project=setup_project_dialog.project.id).count() == task_count * multiplier


@pytest.mark.parametrize('multiply_files', [1, 5])
@pytest.mark.parametrize('format_type', ['txt_file'])
@pytest.mark.parametrize('tasks, status_code, task_count', [
    ('my text 1\nmy text 2\nmy text 3', 201, 3),
    ('', 400, 0)
])
@pytest.mark.django_db
def test_txt_task_upload(setup_project_dialog, format_type, tasks, status_code, task_count, multiply_files):
    """ Upload CSV/TSV with one task to project
    """
    multiplier = multiply_files

    r = post_data_as_format(setup_project_dialog, format_type, tasks, 'none', multiply_files)
    print(f'Create {format_type} tasks result:', r.content)

    assert r.status_code == status_code, f'Upload one task {format_type} failed. Response data: {r.data}'
    assert Task.objects.filter(project=setup_project_dialog.project.id).count() == task_count * multiplier


@pytest.mark.parametrize('tasks, status_code, task_count, max_duration', [
    ([{'data': {'dialog': 'Test'}, 'annotations': [{'result': [{'id': '123'}]}]}] * 1000, 201, 1000, 30)
])
@pytest.mark.django_db
def test_upload_duration(setup_project_dialog, tasks, status_code, task_count, max_duration):
    """ Upload JSON task with annotation to project
    """
    r = post_data_as_format(setup_project_dialog, 'json_data', json.dumps(tasks), 'none', 1)
    print('Create json tasks with annotations result:', r.content)
    assert r.status_code == status_code, ('Upload one task with annotation failed', r.content)

    # tasks
    tasks = Task.objects.filter(project=setup_project_dialog.project.id)
    assert tasks.count() == task_count
    for task in tasks:
        assert not task.is_labeled, 'Task should not be labeled since annotation is ground_truth'

    # check max duration
    result = json.loads(r.content)
    assert result['duration'] < max_duration, 'Max duration of adding tasks is exceeded'


@pytest.mark.parametrize('tasks, status_code, task_count', [
    ([{'data': {'dialog': 'Test'}, 'annotations': [{'result': [{'id': '123'}]}]}] * 100, 201, 100)
])
@pytest.mark.django_db
def test_url_upload(mocker, setup_project_dialog, tasks, status_code, task_count):
    """ Upload tasks from URL
    """
    def info():
        class Info:
            @staticmethod
            def get(name):
                return 12345
        return Info()

    urlopen_return = io.StringIO(json.dumps(tasks))
    urlopen_return.info = info

    with mocker.patch('data_import.uploader.urlopen', return_value=urlopen_return) as m:
        # m.return_value.info.get = mocker.PropertyMock(return_value=lambda x: 12345)

        url = 'http://localhost:8111/test.json'
        r = setup_project_dialog.post(setup_project_dialog.urls.task_bulk, data='url='+url,
                                      content_type="application/x-www-form-urlencoded")
        assert r.status_code == status_code, 'Upload URL failed: ' + str(r.content)

        # tasks
        tasks = Task.objects.filter(project=setup_project_dialog.project.id)
        assert tasks.count() == task_count
        for task in tasks:
            assert not task.is_labeled, 'Task should not be labeled since annotation is ground_truth'


@pytest.mark.parametrize('tasks, status_code, task_count, bad_token', [
    ([{'dialog': 'Test'}] * 1, 201, 1, False),
    ([{'dialog': 'Test'}] * 1, 401, 0, True)
])
@pytest.mark.django_db
def test_upload_with_token(setup_project_for_token, tasks, status_code, task_count, bad_token):
    """ Upload with Django Token
    """
    setup = setup_project_for_token
    token = Token.objects.get(user=setup.user)
    token = 'Token ' + str(token)
    broken_token = 'Token broken'
    data = setup.project_config
    data['organization_pk'] = setup.org.pk
    r = setup.post(setup.urls.project_create, data=data, HTTP_AUTHORIZATION=token)
    print('Project create with status code:', r.status_code, r.content)
    assert r.status_code == 201, 'Create project result should be redirect to the next page: ' + str(r.content)

    project = Project.objects.filter(title=setup.project_config['title']).first()
    setup.urls.set_project(project.pk)

    r = setup.post(setup.urls.task_bulk, data=json.dumps(tasks), content_type="application/json",
                   HTTP_AUTHORIZATION=broken_token if bad_token else token)
    assert r.status_code == status_code, 'Create json tasks result: ' + str(r.content)

    # tasks
    tasks = Task.objects.filter(project=project.id)
    assert tasks.count() == task_count


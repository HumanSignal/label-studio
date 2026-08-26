import pandas as pd
import pytest

from label_studio.tests.sdk.common import LABEL_CONFIG_AND_TASKS

pytestmark = pytest.mark.django_db
from label_studio_sdk import AsyncLabelStudio
from label_studio_sdk.client import LabelStudio


@pytest.fixture
def test_project(django_live_url, business_client):
    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
    project = ls.projects.create(title='Export Test Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])
    ls.projects.import_tasks(id=project.id, request=LABEL_CONFIG_AND_TASKS['tasks_for_import'])
    return ls, project


@pytest.mark.skip(reason='pytest-asyncio is not supported in this version of Label Studio')
async def test_project_async(django_live_url, business_client):
    ls = AsyncLabelStudio(base_url=django_live_url, api_key=business_client.api_key)
    project = await ls.projects.create(
        title='Export Test Project', label_config=LABEL_CONFIG_AND_TASKS['label_config']
    )
    await ls.projects.import_tasks(id=project.id, request=LABEL_CONFIG_AND_TASKS['tasks_for_import'])
    return ls, project


def test_export_formats(test_project):
    ls, project = test_project

    # Get available export formats
    formats = ls.projects.exports.list_formats(project.id)
    assert len(formats) > 0


def test_direct_export(test_project):
    ls, project = test_project

    # Test JSON export
    json_data = ls.projects.exports.as_json(project.id)
    assert isinstance(json_data, list)
    assert len(json_data) == 1

    # Test pandas export
    df = ls.projects.exports.as_pandas(project.id)
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 1

    # Test low level export - import new task without annotations
    ls.projects.import_tasks(
        id=project.id,
        request={
            'data': {
                'my_text': 'Opossums are great',
                'ref_id': 456,
                'meta_info': {'timestamp': '2020-03-09 18:15:28.212882', 'location': 'North Pole'},
            }
        },
    )
    data = ls.projects.exports.download_sync(project.id, download_all_tasks=False)

    def _bytestream_to_json(data):
        import json
        from io import BytesIO

        buffer = BytesIO()
        for chunk in data:
            buffer.write(chunk)
        buffer.seek(0)
        return json.load(buffer)

    assert len(_bytestream_to_json(data)) == 1

    data = ls.projects.exports.download_sync(project.id, download_all_tasks=True)

    assert len(_bytestream_to_json(data)) == 2


# TODO: support pytest-asyncio, otherwise this test will be skipped
@pytest.mark.skip(reason='pytest-asyncio is not supported in this version of Label Studio')
async def test_async_export(test_project_async):
    ls, project = test_project_async

    # Test JSON export
    json_data = await ls.projects.exports.as_json(project.id)
    assert isinstance(json_data, list)
    assert len(json_data) == 1

    # Test pandas export
    df = await ls.projects.exports.as_pandas(project.id, create_kwargs={'task_filter_options': {'finished': 'only'}})
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 1

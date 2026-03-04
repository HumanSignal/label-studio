import json

import boto3
import pytest
from io_storages.models import S3ImportStorage
from io_storages.s3.models import S3ImportStorageLink
from io_storages.tests.factories import (
    AzureBlobImportStorageFactory,
    GCSImportStorageFactory,
    RedisImportStorageFactory,
    S3ImportStorageFactory,
)
from io_storages.utils import StorageObject, load_tasks_json
from moto import mock_s3
from projects.tests.factories import ProjectFactory
from rest_framework.test import APIClient
from tasks.models import Task
from tests.utils import azure_client_mock, gcs_client_mock, redis_client_mock

#
# Integration tests for storage.sync()
#

pytestmark = pytest.mark.django_db


@pytest.fixture
def project():
    return ProjectFactory()


@pytest.fixture(scope='module')
def common_task_data():
    return [
        {'data': {'image_url': 'http://ggg.com/image.jpg', 'text': 'Task 1 text'}},
        {'data': {'image_url': 'http://ggg.com/image2.jpg', 'text': 'Task 2 text'}},
    ]


def _test_storage_import(project, storage_class, task_data, **storage_kwargs):
    """Helper to test import for a specific storage type"""
    client = APIClient()
    client.force_authenticate(user=project.created_by)

    # Setup storage with required credentials
    storage = storage_class(project=project, **storage_kwargs)

    # Save the storage to the database before syncing
    storage.save()

    # Validate connection before sync
    try:
        storage.validate_connection()
    except Exception as e:
        pytest.fail(f'Storage connection validation failed: {str(e)}')

    # Sync storage
    # Mock redis_connected to force synchronous execution in tests
    import mock

    with mock.patch('io_storages.base_models.redis_connected', return_value=False):
        storage.sync()

    # Validate tasks were imported correctly
    tasks_response = client.get(f'/api/tasks?project={project.id}')
    assert tasks_response.status_code == 200
    tasks = tasks_response.json()['tasks']
    assert len(tasks) == len(task_data)

    # Validate task content
    for task, expected_data in zip(tasks, task_data):
        assert task['data'] == expected_data['data']


def test_import_multiple_tasks_s3(project, common_task_data):
    with mock_s3():
        # Setup S3 bucket and test data
        s3 = boto3.client('s3', region_name='us-east-1')
        bucket_name = 'pytest-s3-jsons'
        s3.create_bucket(Bucket=bucket_name)

        # Put test data into S3
        s3.put_object(Bucket=bucket_name, Key='test.json', Body=json.dumps(common_task_data))

        _test_storage_import(
            project,
            S3ImportStorageFactory,
            common_task_data,
            bucket='pytest-s3-jsons',
            aws_access_key_id='example',
            aws_secret_access_key='example',
            use_blob_urls=False,
            recursive_scan=True,
        )


def test_import_multiple_tasks_gcs(project, common_task_data):
    # initialize mock with sample data
    with gcs_client_mock():
        _test_storage_import(
            project,
            GCSImportStorageFactory,
            common_task_data,
            # magic bucket name to set correct data in gcs_client_mock
            bucket='multitask_JSON',
            use_blob_urls=False,
            recursive_scan=True,
        )


def test_import_multiple_tasks_azure(project, common_task_data):
    # initialize mock with sample data
    with azure_client_mock(sample_json_contents=common_task_data, sample_blob_names=['test.json']):
        _test_storage_import(
            project,
            AzureBlobImportStorageFactory,
            common_task_data,
            use_blob_urls=False,
            recursive_scan=True,
        )


def test_import_multiple_tasks_redis(project, common_task_data):
    with redis_client_mock() as redis:
        redis.set('test.json', json.dumps(common_task_data))

        _test_storage_import(
            project,
            RedisImportStorageFactory,
            common_task_data,
            path='',
            use_blob_urls=False,
        )


def test_storagelink_fields(project, common_task_data):
    # use an actual storage and storagelink to test this, since factories aren't connected properly
    with mock_s3():
        # Setup S3 bucket and test data
        s3 = boto3.client('s3', region_name='us-east-1')
        bucket_name = 'pytest-s3-jsons'
        s3.create_bucket(Bucket=bucket_name)

        # Put test data into S3
        s3.put_object(Bucket=bucket_name, Key='test.json', Body=json.dumps(common_task_data))

        # create a real storage and sync it
        storage = S3ImportStorage(
            project=project,
            bucket=bucket_name,
            aws_access_key_id='example',
            aws_secret_access_key='example',
            use_blob_urls=False,
            recursive_scan=True,
        )
        storage.save()
        storage.sync()

        # check that the storage link fields are set correctly
        storage_links = S3ImportStorageLink.objects.filter(storage=storage).order_by('task_id')
        assert storage_links[0].row_index == 0
        assert storage_links[0].row_group is None
        assert storage_links[1].row_index == 1
        assert storage_links[1].row_group is None


def test_storage_sync_respects_overlap_cohort_percentage(project):
    project.maximum_annotations = 2
    project.overlap_cohort_percentage = 10
    project.save(update_fields=['maximum_annotations', 'overlap_cohort_percentage'])

    imported_tasks = [{'data': {'text': f'Task {idx}'}} for idx in range(10)]

    with mock_s3():
        s3 = boto3.client('s3', region_name='us-east-1')
        bucket_name = 'pytest-s3-overlap-cohort'
        s3.create_bucket(Bucket=bucket_name)
        s3.put_object(Bucket=bucket_name, Key='tasks.json', Body=json.dumps(imported_tasks))

        storage = S3ImportStorage(
            project=project,
            bucket=bucket_name,
            aws_access_key_id='example',
            aws_secret_access_key='example',
            use_blob_urls=False,
            recursive_scan=True,
        )
        storage.save()

        import mock

        with mock.patch('io_storages.base_models.redis_connected', return_value=False):
            storage.sync()

    tasks = Task.objects.filter(project=project)
    assert tasks.count() == 10
    assert tasks.filter(overlap=2).count() == 1
    assert tasks.filter(overlap=1).count() == 9


def test_quality_settings_applied_after_sync_rearranges_overlap_cohort(project):
    imported_tasks = [{'data': {'text': f'Task {idx}'}} for idx in range(10)]

    with mock_s3():
        s3 = boto3.client('s3', region_name='us-east-1')
        bucket_name = 'pytest-s3-overlap-after-sync'
        s3.create_bucket(Bucket=bucket_name)
        s3.put_object(Bucket=bucket_name, Key='tasks.json', Body=json.dumps(imported_tasks))

        storage = S3ImportStorage(
            project=project,
            bucket=bucket_name,
            aws_access_key_id='example',
            aws_secret_access_key='example',
            use_blob_urls=False,
            recursive_scan=True,
        )
        storage.save()

        import mock

        with mock.patch('io_storages.base_models.redis_connected', return_value=False):
            storage.sync()

    # Initial import with default settings should keep overlap at 1 for all tasks.
    tasks = Task.objects.filter(project=project)
    assert tasks.count() == 10
    assert tasks.filter(overlap=1).count() == 10

    # Simulate applying quality settings after sync.
    project.maximum_annotations = 2
    project.overlap_cohort_percentage = 10
    project.save(update_fields=['maximum_annotations', 'overlap_cohort_percentage'])
    project._update_tasks_states(
        maximum_annotations_changed=True,
        overlap_cohort_percentage_changed=True,
        tasks_number_changed=False,
    )

    assert tasks.filter(overlap=2).count() == 1
    assert tasks.filter(overlap=1).count() == 9


#
# Unit tests for load_tasks_json()
#


@pytest.fixture
def storage():
    project = ProjectFactory(
        label_config="""
        <View>
          <Text name="text" value="$text"/>
          <Labels name="label" toName="text">
            <Label value="FIELD" background="red"/>
            <Label value="ACTION" background="blue"/>
          </Labels>
        </View>
        """
    )
    storage = S3ImportStorage(
        project=project,
        bucket='example',
        aws_access_key_id='example',
        aws_secret_access_key='example',
        use_blob_urls=False,
    )
    storage.save()
    return project, storage


def create_tasks(storage, params_list: list[StorageObject]):
    project, storage = storage
    # check that no errors are raised during task creation; not checking the task itself
    for params in params_list:
        _ = S3ImportStorage.add_task(project, 1, 0, storage, params, S3ImportStorageLink)


# Test data
bare_task_list = [
    {
        'text': 'Test task 1',
    },
    {
        'text': 'Test task 2',
    },
]

annots_preds_task_list = [
    {
        'data': {'text': 'Machine learning models require high-quality labeled data.'},
        'annotations': [
            {
                'result': [
                    {
                        'value': {'start': 0, 'end': 22, 'text': 'Machine learning models', 'labels': ['FIELD']},
                        'from_name': 'label',
                        'to_name': 'text',
                        'type': 'labels',
                    },
                    {
                        'value': {'start': 44, 'end': 56, 'text': 'labeled data', 'labels': ['ACTION']},
                        'from_name': 'label',
                        'to_name': 'text',
                        'type': 'labels',
                    },
                ]
            }
        ],
        'predictions': [
            {
                'result': [
                    {
                        'value': {'start': 0, 'end': 22, 'text': 'Machine learning models', 'labels': ['FIELD']},
                        'from_name': 'label',
                        'to_name': 'text',
                        'type': 'labels',
                    }
                ]
            }
        ],
    },
    {'data': {'text': 'Prosper annotation helps improve model accuracy.'}},
]


def test_bare_task(storage):
    task_data = bare_task_list[0]

    blob = json.dumps(task_data).encode()
    output = load_tasks_json(blob, 'test.json')
    expected_output = [StorageObject(key='test.json', task_data=task_data)]
    assert list(output) == expected_output

    create_tasks(storage, list(output))


def test_data_key(storage):
    task_data = {'data': bare_task_list[0]}

    blob = json.dumps(task_data).encode()
    output = load_tasks_json(blob, 'test.json')
    expected_output = [StorageObject(key='test.json', task_data=task_data)]
    assert list(output) == expected_output

    create_tasks(storage, list(output))


def test_1elem_list(storage):
    task_data = bare_task_list[:1]

    blob = json.dumps(task_data).encode()
    output = load_tasks_json(blob, 'test.json')
    expected_output = [
        StorageObject(key='test.json', task_data=task_data[0], row_index=0),
    ]
    assert list(output) == expected_output

    create_tasks(storage, list(output))


def test_2elem_list(storage):
    task_data = bare_task_list

    blob = json.dumps(task_data).encode()
    output = load_tasks_json(blob, 'test.json')
    expected_output = [
        StorageObject(key='test.json', task_data=task_data[0], row_index=0),
        StorageObject(key='test.json', task_data=task_data[1], row_index=1),
    ]
    assert list(output) == expected_output

    create_tasks(storage, list(output))


def test_preds_and_annots_list(storage):
    task_data = annots_preds_task_list

    blob = json.dumps(task_data).encode()
    output = load_tasks_json(blob, 'test.json')

    expected_output = [
        StorageObject(key='test.json', task_data=task_data[0], row_index=0),
        StorageObject(key='test.json', task_data=task_data[1], row_index=1),
    ]
    assert list(output) == expected_output

    create_tasks(storage, list(output))


def test_mixed_formats(storage):
    task_data = [bare_task_list[0], annots_preds_task_list[0]]

    blob = json.dumps(task_data).encode()
    output = load_tasks_json(blob, 'test.json')

    expected_output = [
        StorageObject(key='test.json', task_data=task_data[0], row_index=0),
        StorageObject(key='test.json', task_data=task_data[1], row_index=1),
    ]
    assert list(output) == expected_output

    create_tasks(storage, list(output))


def test_list_jsonl(storage):
    task_data = bare_task_list

    blob = '\n'.join([json.dumps(task) for task in task_data]).encode()
    output = load_tasks_json(blob, 'test.jsonl')
    expected_output = [
        StorageObject(key='test.jsonl', task_data=task_data[0], row_index=0),
        StorageObject(key='test.jsonl', task_data=task_data[1], row_index=1),
    ]
    assert list(output) == expected_output

    create_tasks(storage, list(output))


def test_list_jsonl_with_preds_and_annots(storage):
    task_data = annots_preds_task_list

    blob = '\n'.join([json.dumps(task) for task in task_data]).encode()
    output = load_tasks_json(blob, 'test.jsonl')

    expected_output = [
        StorageObject(key='test.jsonl', task_data=task_data[0], row_index=0),
        StorageObject(key='test.jsonl', task_data=task_data[1], row_index=1),
    ]
    assert list(output) == expected_output

    create_tasks(storage, list(output))


def test_mixed_formats_jsonl(storage):
    task_data = [bare_task_list[0], annots_preds_task_list[0]]

    blob = '\n'.join([json.dumps(task) for task in task_data]).encode()
    output = load_tasks_json(blob, 'test.jsonl')

    expected_output = [
        StorageObject(key='test.jsonl', task_data=task_data[0], row_index=0),
        StorageObject(key='test.jsonl', task_data=task_data[1], row_index=1),
    ]
    assert list(output) == expected_output

    create_tasks(storage, list(output))


def test_list_jsonl_with_datetimes(storage):
    task_data = [
        {'data': {'text': 'Test task 1', 'created_at': '2021-01-01T00:00:00Z'}},
        {'data': {'text': 'Test task 2', 'created_at': '2021-01-02T00:00:00Z'}},
    ]

    blob = '\n'.join([json.dumps(task) for task in task_data]).encode()
    output = load_tasks_json(blob, 'test.jsonl')
    expected_output = [
        StorageObject(key='test.jsonl', task_data=task_data[0], row_index=0),
        StorageObject(key='test.jsonl', task_data=task_data[1], row_index=1),
    ]
    assert list(output) == expected_output

    create_tasks(storage, list(output))


def test_allow_skip_false_is_saved(storage):
    project, s3_storage = storage
    task_data = {
        'data': {'text': 'Task with disallowed skip'},
        'allow_skip': False,
    }
    params = StorageObject(key='test.json', task_data=task_data)
    # Create one task via cloud import pathway
    task = S3ImportStorage.add_task(project, 1, 1, s3_storage, params, S3ImportStorageLink)
    assert task.allow_skip is False


def test_add_task_respects_overlap_cohort_percentage():
    """Storage sync creates tasks with overlap=1 when overlap_cohort_percentage < 100 so
    update_tasks_states -> _rearrange_overlap_cohort can assign the correct cohort after sync.
    """
    task_data = {'data': {'text': 'Task for overlap test'}}
    params = StorageObject(key='test.json', task_data=task_data)

    # When overlap_cohort_percentage < 100, new tasks get overlap=1 (cohort assigned later)
    project_partial = ProjectFactory(
        maximum_annotations=2,
        overlap_cohort_percentage=10,
    )
    s3_storage_partial = S3ImportStorage(
        project=project_partial,
        bucket='example',
        aws_access_key_id='example',
        aws_secret_access_key='example',
        use_blob_urls=False,
    )
    s3_storage_partial.save()
    task_partial = S3ImportStorage.add_task(project_partial, 2, 1, s3_storage_partial, params, S3ImportStorageLink)
    assert task_partial.overlap == 1

    # When overlap_cohort_percentage >= 100, all tasks get maximum_annotations
    project_full = ProjectFactory(
        maximum_annotations=2,
        overlap_cohort_percentage=100,
    )
    s3_storage_full = S3ImportStorage(
        project=project_full,
        bucket='example2',
        aws_access_key_id='example',
        aws_secret_access_key='example',
        use_blob_urls=False,
    )
    s3_storage_full.save()
    task_full = S3ImportStorage.add_task(project_full, 2, 1, s3_storage_full, params, S3ImportStorageLink)
    assert task_full.overlap == 2

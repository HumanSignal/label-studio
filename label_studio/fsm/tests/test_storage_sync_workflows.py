"""
Comprehensive tests for Storage Sync FSM workflows.

This test module validates FSM state transitions for tasks created from
storage sync operations, following patterns from label_studio/tests/sdk/test_storages.py

Test Coverage:
1. S3 Import Storage Sync - create tasks from S3
2. GCS Import Storage Sync - create tasks from GCS
3. Azure Import Storage Sync - create tasks from Azure
4. Local Storage Sync - create tasks from local files
"""

import json

import pytest
from fsm.state_choices import AnnotationStateChoices, TaskStateChoices
from fsm.tests.helpers import (
    IMAGE_CLASSIFICATION_CONFIG,
    NER_CONFIG,
    assert_annotation_state,
    assert_state_exists,
    assert_task_state,
    create_sdk_client,
    setup_fsm_context,
)
from tasks.models import Annotation, Task

pytestmark = pytest.mark.django_db


class TestS3StorageSyncWorkflows:
    """Test FSM state management for S3 storage sync operations."""

    def test_s3_sync_recursive_creates_tasks_with_fsm_states(self, django_live_url, business_client):
        """Test S3 recursive sync creates tasks with FSM states.

        This test validates step by step:
        - Creating S3 storage with recursive_scan=True
        - Syncing to import files from subdirectories
        - Verifying all created tasks have FSM states
        """
        setup_fsm_context(business_client.user)
        ls = create_sdk_client(django_live_url, business_client)

        # Create project
        project = ls.projects.create(title='FSM S3 Recursive Sync Test', label_config=IMAGE_CLASSIFICATION_CONFIG)

        # Create S3 import storage with recursive scan
        storage = ls.import_storage.s3.create(
            project=project.id,
            bucket='pytest-s3-images',
            regex_filter='.*',
            use_blob_urls=True,
            recursive_scan=True,
        )

        # Trigger sync
        sync_result = ls.import_storage.s3.sync(id=storage.id)

        assert sync_result.status == 'completed'

        # Get tasks created by sync
        tasks = list(ls.tasks.list(project=project.id))

        # Verify each task has FSM state
        for task in tasks:
            task_obj = Task.objects.get(id=task.id)
            assert_state_exists(task_obj, 'task')
            assert_task_state(task.id, TaskStateChoices.CREATED)

    def test_s3_sync_multiple_times_maintains_fsm_states(self, django_live_url, business_client):
        """Test multiple S3 syncs maintain FSM state consistency.

        This test validates step by step:
        - Running initial S3 sync
        - Verifying tasks have FSM states
        - Running sync again (should be idempotent)
        - Verifying FSM states remain consistent

        Critical validation: Re-syncing should not create duplicate
        tasks or corrupt existing FSM states.
        """
        setup_fsm_context(business_client.user)
        ls = create_sdk_client(django_live_url, business_client)

        # Create project
        project = ls.projects.create(title='FSM S3 Resync Test', label_config=IMAGE_CLASSIFICATION_CONFIG)

        # Create S3 import storage
        storage = ls.import_storage.s3.create(
            project=project.id, bucket='pytest-s3-images', regex_filter='.*', use_blob_urls=True, recursive_scan=False
        )

        # First sync
        ls.import_storage.s3.sync(id=storage.id)
        tasks_after_first_sync = list(ls.tasks.list(project=project.id))
        first_sync_count = len(tasks_after_first_sync)

        # Verify FSM states
        for task in tasks_after_first_sync:
            task_obj = Task.objects.get(id=task.id)
            assert_state_exists(task_obj, 'task')

        # Second sync (should be idempotent)
        ls.import_storage.s3.sync(id=storage.id)
        tasks_after_second_sync = list(ls.tasks.list(project=project.id))

        # Task count should remain the same (idempotent)
        assert len(tasks_after_second_sync) == first_sync_count

        # FSM states should still exist and be correct
        for task in tasks_after_second_sync:
            task_obj = Task.objects.get(id=task.id)
            assert_state_exists(task_obj, 'task')
            assert_task_state(task.id, TaskStateChoices.CREATED)


class TestGCSStorageSyncWorkflows:
    """Test FSM state management for GCS storage sync operations."""

    def test_gcs_sync_creates_tasks_with_fsm_states(self, django_live_url, business_client):
        """Test GCS storage sync creates tasks with FSM states.

        This test validates step by step:
        - Setting up GCS import storage
        - Triggering sync operation
        - Verifying created tasks have FSM state records

        Critical validation: Tasks created from GCS storage sync should
        have FSM states just like S3 and direct API creation.
        """
        setup_fsm_context(business_client.user)
        ls = create_sdk_client(django_live_url, business_client)

        # Create project
        project = ls.projects.create(title='FSM GCS Sync Test', label_config=IMAGE_CLASSIFICATION_CONFIG)

        storage = ls.import_storage.gcs.create(
            project=project.id, bucket='pytest-gs-bucket', regex_filter='.*', use_blob_urls=True
        )

        # Trigger sync
        sync_result = ls.import_storage.gcs.sync(id=storage.id)
        assert sync_result.status == 'completed'

        # Get tasks created by sync
        tasks = list(ls.tasks.list(project=project.id))

        # Verify each task has FSM state
        for task in tasks:
            task_obj = Task.objects.get(id=task.id)
            assert_state_exists(task_obj, 'task')
            assert_task_state(task.id, TaskStateChoices.CREATED)


class TestAzureStorageSyncWorkflows:
    """Test FSM state management for Azure storage sync operations."""

    def test_azure_sync_creates_tasks_with_fsm_states(self, django_live_url, business_client):
        """Test Azure storage sync creates tasks with FSM states.

        This test validates step by step:
        - Setting up Azure import storage
        - Triggering sync operation
        - Verifying created tasks have FSM state records

        Critical validation: Tasks created from Azure storage sync should
        have FSM states consistent with other storage types.
        """
        setup_fsm_context(business_client.user)
        ls = create_sdk_client(django_live_url, business_client)

        # Create project
        project = ls.projects.create(title='FSM Azure Sync Test', label_config=IMAGE_CLASSIFICATION_CONFIG)

        storage = ls.import_storage.azure.create(
            project=project.id,
            container='pytest-azure-container',
            regex_filter='.*',
            use_blob_urls=True,
            account_name='pytest-azure-account',
            account_key='pytest-azure-key',
        )

        # Trigger sync
        sync_result = ls.import_storage.azure.sync(id=storage.id)
        assert sync_result.status == 'completed'

        # Get tasks created by sync
        tasks = list(ls.tasks.list(project=project.id))

        # Verify each task has FSM state
        for task in tasks:
            task_obj = Task.objects.get(id=task.id)
            assert_state_exists(task_obj, 'task')
            assert_task_state(task.id, TaskStateChoices.CREATED)


class TestLocalStorageSyncWorkflows:
    """Test FSM state management for local storage sync operations."""

    def test_local_storage_sync_creates_tasks_with_fsm_states(
        self, django_live_url, business_client, tmp_path, settings
    ):
        """Test local storage sync creates tasks with FSM states.

        This test validates step by step:
        - Setting up local import storage
        - Triggering sync operation
        - Verifying created tasks have FSM state records

        Critical validation: Tasks created from local storage sync should
        have FSM states like cloud storage types.
        """
        setup_fsm_context(business_client.user)
        ls = create_sdk_client(django_live_url, business_client)

        # Create project
        project = ls.projects.create(title='FSM Local Storage Sync Test', label_config=IMAGE_CLASSIFICATION_CONFIG)
        local_root = tmp_path / 'local-storage'
        local_root.mkdir()
        (local_root / 'image1.jpg').write_text('123')
        (local_root / 'subdir').mkdir()
        (local_root / 'subdir' / 'image2.jpg').write_text('456')

        settings.LOCAL_FILES_DOCUMENT_ROOT = tmp_path
        settings.LOCAL_FILES_SERVING_ENABLED = True

        storage = ls.import_storage.local.create(
            project=project.id, path=str(local_root), regex_filter='.*', use_blob_urls=True
        )

        # Trigger sync
        sync_result = ls.import_storage.local.sync(id=storage.id)
        assert sync_result.status == 'completed'

        # Get tasks created by sync
        tasks = list(ls.tasks.list(project=project.id))

        # Verify each task has FSM state
        for task in tasks:
            task_obj = Task.objects.get(id=task.id)
            assert_state_exists(task_obj, 'task')
            assert_task_state(task.id, TaskStateChoices.CREATED)


class TestStorageSyncWithAnnotations:
    """Test FSM state management for storage sync with pre-labeled data."""

    @pytest.fixture
    def project_id(self, django_live_url, business_client, tmp_path, settings) -> int:
        setup_fsm_context(business_client.user)
        ls = create_sdk_client(django_live_url, business_client)

        project = ls.projects.create(title='FSM Sync with Annots+Preds Test', label_config=NER_CONFIG)

        from projects.models import Project

        # tasks should be COMPLETED with 1 annotation
        Project.objects.filter(id=project.id).update(maximum_annotations=1)

        local_root = tmp_path / 'local-storage-json'
        local_root.mkdir()
        settings.LOCAL_FILES_DOCUMENT_ROOT = tmp_path
        settings.LOCAL_FILES_SERVING_ENABLED = True

        tasks_payload = [
            {
                'data': {'text': 'John Doe works at Acme Corp.'},
                'predictions': [
                    {
                        'model_version': 'test-model-v1',
                        'score': 0.9,
                        'result': [
                            {
                                'value': {'start': 0, 'end': 8, 'text': 'John Doe', 'labels': ['Person']},
                                'from_name': 'label',
                                'to_name': 'text',
                                'type': 'labels',
                            }
                        ],
                    }
                ],
                'annotations': [
                    {
                        'result': [
                            {
                                'value': {'start': 0, 'end': 8, 'text': 'John Doe', 'labels': ['Person']},
                                'from_name': 'label',
                                'to_name': 'text',
                                'type': 'labels',
                            },
                            {
                                'value': {'start': 18, 'end': 27, 'text': 'Acme Corp', 'labels': ['Organization']},
                                'from_name': 'label',
                                'to_name': 'text',
                                'type': 'labels',
                            },
                        ]
                    }
                ],
            },
            {
                'data': {'text': 'Jane visited Paris.'},
                'predictions': [
                    {
                        'model_version': 'test-model-v1',
                        'result': [
                            {
                                'value': {'start': 0, 'end': 4, 'text': 'Jane', 'labels': ['Person']},
                                'from_name': 'label',
                                'to_name': 'text',
                                'type': 'labels',
                            },
                            {
                                'value': {'start': 13, 'end': 18, 'text': 'Paris', 'labels': ['Location']},
                                'from_name': 'label',
                                'to_name': 'text',
                                'type': 'labels',
                            },
                        ],
                    }
                ],
                'annotations': [
                    {
                        'result': [
                            {
                                'value': {'start': 0, 'end': 4, 'text': 'Jane', 'labels': ['Person']},
                                'from_name': 'label',
                                'to_name': 'text',
                                'type': 'labels',
                            }
                        ]
                    }
                ],
            },
        ]
        (local_root / 'tasks.json').write_text(json.dumps(tasks_payload))

        storage = ls.import_storage.local.create(
            project=project.id,
            path=str(local_root),
            regex_filter=r'.*\.json$',
            use_blob_urls=False,
        )

        sync_result = ls.import_storage.local.sync(id=storage.id)
        assert sync_result.status == 'completed'

        return project.id

    def assert_preannotated_sync_states(self, project_id: int):
        for task in Task.objects.filter(project_id=project_id).order_by('id'):
            assert_state_exists(task, 'task')
            assert_task_state(task.id, TaskStateChoices.COMPLETED)

        for annotation in Annotation.objects.filter(project_id=project_id).order_by('id'):
            assert_state_exists(annotation, 'annotation')
            assert_annotation_state(annotation.id, AnnotationStateChoices.CREATED)

        # no states for Predictions

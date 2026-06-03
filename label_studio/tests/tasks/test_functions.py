import io
import os

import psutil
import pytest
from data_export.serializers import ExportDataSerializer
from django.conf import settings
from tasks.functions import bulk_create_annotations_with_side_effects, export_project
from tasks.models import Annotation

pytestmark = pytest.mark.django_db


def memory_limit(max_mem):
    try:
        import resource
    except ImportError:

        def decorator(f):
            return f

        return decorator

    def decorator(f):
        def wrapper(*args, **kwargs):
            process = psutil.Process(os.getpid())
            prev_limits = resource.getrlimit(resource.RLIMIT_AS)
            resource.setrlimit(resource.RLIMIT_AS, (process.memory_info().rss + max_mem, -1))
            result = f(*args, **kwargs)
            resource.setrlimit(resource.RLIMIT_AS, prev_limits)
            return result

        return wrapper

    return decorator


class TestExportProject:
    @pytest.fixture
    def generate_export_file(self, mocker):
        return mocker.patch(
            'tasks.functions.DataExport.generate_export_file',
            return_value=(io.BytesIO(b'stream'), 'application/json', 'project.json'),
        )

    @pytest.fixture
    def project(self, configured_project):
        return configured_project

    def test_export_project(self, mocker, generate_export_file, project):
        data = ExportDataSerializer(
            project.tasks.all(),
            many=True,
            context={'interpolate_key_frames': settings.INTERPOLATE_KEY_FRAMES},
        ).data

        with mocker.patch('builtins.open'):
            filepath = export_project(project.id, 'JSON', settings.EXPORT_DIR)

        assert filepath == os.path.join(settings.EXPORT_DIR, 'project.json')

        generate_export_file.assert_called_once_with(project, data, 'JSON', settings.CONVERTER_DOWNLOAD_RESOURCES, {})

    def test_project_does_not_exist(self, mocker, generate_export_file):
        with mocker.patch('builtins.open'):
            with pytest.raises(Exception):
                export_project(1, 'JSON', settings.EXPORT_DIR)

        generate_export_file.assert_not_called()


class TestBulkCreateAnnotationsWithSideEffects:
    def test_runs_enabled_side_effects(self, mocker, configured_project, business_client):
        project = configured_project
        task = project.tasks.first()
        annotation = Annotation(
            task=task,
            project=project,
            completed_by=business_client.user,
            result=[
                {
                    'from_name': 'label',
                    'to_name': 'text',
                    'type': 'choices',
                    'value': {'choices': ['pos']},
                }
            ],
        )
        project.summary.created_labels = {}
        project.summary.save(update_fields=['created_labels'])
        post_process = mocker.patch('tasks.serializers.TaskSerializerBulk.post_process_annotations')
        emit_webhook = mocker.patch('webhooks.utils.emit_webhooks_for_instance')
        update_counters = mocker.patch.object(project, 'update_tasks_counters_and_is_labeled')
        fsm_initializer = mocker.Mock()
        mocker.patch('tasks.functions.load_func', return_value=fsm_initializer)
        recalculate_stats = mocker.Mock()
        stats_module = mocker.Mock(recalculate_stats_async_or_sync=recalculate_stats)
        mocker.patch('tasks.functions.import_module', return_value=stats_module)

        db_annotations = bulk_create_annotations_with_side_effects(
            [annotation],
            project=project,
            user=business_client.user,
            action='submitted',
            tasks_queryset=project.tasks.filter(id=task.id),
            emit_created_webhook=True,
        )

        assert len(db_annotations) == 1
        project.summary.refresh_from_db()
        assert project.summary.created_labels == {'label': {'pos': 1}}
        post_process.assert_called_once_with(business_client.user, db_annotations, 'submitted')
        emit_webhook.assert_called_once()
        fsm_initializer.assert_called_once_with(db_annotations, business_client.user, project)
        update_counters.assert_called_once()
        recalculate_stats.assert_called_once_with(project, all=False)

        task.refresh_from_db()
        assert task.updated_by == business_client.user

    def test_respects_disabled_side_effect_options(self, mocker, configured_project, business_client):
        project = configured_project
        task = project.tasks.first()
        original_updated_at = task.updated_at
        annotation = Annotation(
            task=task,
            project=project,
            completed_by=business_client.user,
            result=[
                {
                    'from_name': 'label',
                    'to_name': 'text',
                    'type': 'choices',
                    'value': {'choices': ['pos']},
                }
            ],
        )
        project.summary.created_labels = {}
        project.summary.save(update_fields=['created_labels'])
        post_process = mocker.patch('tasks.serializers.TaskSerializerBulk.post_process_annotations')
        emit_webhook = mocker.patch('webhooks.utils.emit_webhooks_for_instance')
        update_counters = mocker.patch.object(project, 'update_tasks_counters_and_is_labeled')
        load_func = mocker.patch('tasks.functions.load_func')
        import_module = mocker.patch('tasks.functions.import_module')

        db_annotations = bulk_create_annotations_with_side_effects(
            [annotation],
            project=project,
            user=business_client.user,
            action='submitted',
            tasks_queryset=project.tasks.filter(id=task.id),
            update_project_summary=False,
            post_process_annotations=False,
            initialize_fsm_states=False,
            emit_created_webhook=False,
            update_task_timestamps=False,
            update_task_counters=False,
            recalculate_stats=False,
        )

        assert len(db_annotations) == 1
        project.summary.refresh_from_db()
        assert project.summary.created_labels == {}
        post_process.assert_not_called()
        emit_webhook.assert_not_called()
        load_func.assert_not_called()
        update_counters.assert_not_called()
        import_module.assert_not_called()

        task.refresh_from_db()
        assert task.updated_at == original_updated_at
        assert task.updated_by is None

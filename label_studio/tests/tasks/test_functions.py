import io
import os

import psutil
import pytest
from data_export.serializers import ExportDataSerializer
from django.conf import settings
from django.core.management import call_command
from tasks.functions import bulk_create_annotations_with_side_effects, export_project
from tasks.models import Annotation, Task

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

    def test_counters_update_with_state_dependent_queryset(self, configured_project, business_client):
        """TRIAG-2440: counters must update even when tasks_queryset is a state-dependent filter.

        Bulk labeling from the Data Manager passes a lazy, filtered queryset (e.g. a
        "not labeled" / "Annotations = 0" view). Re-evaluating that queryset AFTER the
        annotations are created matches zero rows, so the counter update used to be a no-op
        and total_annotations / is_labeled stayed stale. The freshly-created annotations
        must drive the recount instead.
        """
        project = configured_project
        tasks = list(project.tasks.all())
        assert len(tasks) == 2
        for task in tasks:
            assert task.total_annotations == 0
            assert task.is_labeled is False

        # State-dependent queryset: only matches tasks WITHOUT annotations. Once the
        # annotations below are created, this queryset re-evaluates to empty.
        unlabeled_qs = project.tasks.filter(annotations__isnull=True)

        annotations = [
            Annotation(
                task=task,
                project=project,
                completed_by=business_client.user,
                result=[
                    {
                        'from_name': 'text_class',
                        'to_name': 'text',
                        'type': 'choices',
                        'value': {'choices': ['class_A']},
                    }
                ],
            )
            for task in tasks
        ]

        bulk_create_annotations_with_side_effects(
            annotations,
            project=project,
            user=business_client.user,
            action='submitted',
            tasks_queryset=unlabeled_qs,
        )

        for task in tasks:
            task.refresh_from_db()
            assert task.total_annotations == 1, f'counter not updated for task {task.id}'
            assert task.is_labeled is True, f'is_labeled not updated for task {task.id}'


class TestAnnotationDeleteCounterSignal:
    def test_raw_queryset_delete_resets_counter(self, configured_project, business_client):
        """post_delete safety net: a raw QuerySet.delete() (SDK/script path that bypasses
        Annotation.delete() and the bulk-delete jobs) must not leave total_annotations stale."""
        project = configured_project
        task = project.tasks.first()
        Annotation.objects.create(task=task, project=project, completed_by=business_client.user, result=[])
        task.refresh_from_db()
        assert task.total_annotations == 1

        # Raw queryset delete: no Annotation.delete(), no bulk-delete job, no flag set.
        Annotation.objects.filter(task=task).delete()

        task.refresh_from_db()
        assert task.total_annotations == 0
        assert task.is_labeled is False

    def test_partial_raw_delete_keeps_correct_count(self, configured_project, business_client):
        project = configured_project
        task = project.tasks.first()
        a1 = Annotation.objects.create(task=task, project=project, completed_by=business_client.user, result=[])
        Annotation.objects.create(task=task, project=project, completed_by=business_client.user, result=[])
        task.refresh_from_db()
        assert task.total_annotations == 2

        Annotation.objects.filter(id=a1.id).delete()

        task.refresh_from_db()
        assert task.total_annotations == 1


class TestRecalculateTaskCountersCommand:
    def test_repairs_drifted_counter(self, configured_project):
        project = configured_project
        task = project.tasks.first()
        # Simulate drift: cached counter says 1 and task looks labeled, but there are zero
        # real annotations.
        Task.objects.filter(id=task.id).update(total_annotations=1, is_labeled=True)

        call_command('recalculate_task_counters', project=project.id)

        task.refresh_from_db()
        assert task.total_annotations == 0
        # is_labeled must be repaired too, not just the numeric counters
        assert task.is_labeled is False

    def test_dry_run_does_not_modify(self, configured_project):
        project = configured_project
        task = project.tasks.first()
        Task.objects.filter(id=task.id).update(total_annotations=1)

        call_command('recalculate_task_counters', project=project.id, dry_run=True)

        task.refresh_from_db()
        assert task.total_annotations == 1

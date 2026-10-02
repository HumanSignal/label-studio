"""UTC-1335: import/reimport status observability (progress, stale fail, list, safety)."""

from contextlib import ExitStack
from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
from data_import.functions import (
    _async_import_background_streaming,
    _async_reimport_background_streaming,
    set_import_background_failure,
)
from data_import.models import FileUpload
from django.core.files.base import ContentFile
from django.urls import reverse
from django.utils import timezone
from projects.import_health import health_check_import_job, mark_import_job_finished
from projects.models import ProjectImport, ProjectReimport
from projects.tests.factories import ProjectFactory
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


@pytest.fixture
def project():
    return ProjectFactory(label_config='<View><Text name="text" value="$text"/></View>')


@pytest.fixture
def user(project):
    return project.created_by


@pytest.fixture
def other_project(project):
    return ProjectFactory(
        organization=project.organization,
        created_by=project.created_by,
        label_config='<View><Text name="text" value="$text"/></View>',
    )


@pytest.fixture
def api_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def create_file_upload(user, project, body: bytes, name: str):
    return FileUpload.objects.create(user=user, project=project, file=ContentFile(body, name=name))


class TestImportProgressUpdates:
    @pytest.mark.parametrize(
        'kind,batch_setting,payload,expected_counts',
        [
            (
                'reimport',
                'REIMPORT_BATCH_SIZE',
                b'[{"text":"A"},{"text":"B"},{"text":"C"},{"text":"D"},{"text":"E"}]',
                [2, 4, 5],
            ),
            (
                'import',
                'IMPORT_BATCH_SIZE',
                b'[{"text":"A"},{"text":"B"},{"text":"C"},{"text":"D"}]',
                [2, 4],
            ),
        ],
    )
    def test_streaming_updates_task_count_after_each_batch(
        self, user, project, settings, kind, batch_setting, payload, expected_counts
    ):
        setattr(settings, batch_setting, 2)
        fu = create_file_upload(user, project, payload, 'a.json')
        counts_seen = []

        from projects import import_health

        real_update = import_health.update_import_job_progress

        def tracking_update(job, **kwargs):
            real_update(job, **kwargs)
            job.refresh_from_db()
            counts_seen.append(job.task_count)

        if kind == 'reimport':
            job = ProjectReimport.objects.create(
                project=project,
                file_upload_ids=[fu.id],
                status=ProjectReimport.Status.IN_PROGRESS,
            )
            patches = [patch('data_import.functions.update_import_job_progress', side_effect=tracking_update)]

            def run():
                _async_reimport_background_streaming(job, project, project.organization_id, user)

            expected_status = ProjectReimport.Status.COMPLETED
        else:
            job = ProjectImport.objects.create(
                project=project,
                file_upload_ids=[fu.id],
                commit_to_project=True,
                status=ProjectImport.Status.IN_PROGRESS,
            )
            patches = [
                patch('data_import.functions.flag_set', return_value=False),
                patch('data_import.functions.update_import_job_progress', side_effect=tracking_update),
            ]

            def run():
                _async_import_background_streaming(job, user)

            expected_status = ProjectImport.Status.COMPLETED

        with ExitStack() as stack:
            for p in patches:
                stack.enter_context(p)
            run()

        job.refresh_from_db()
        assert job.status == expected_status
        assert job.task_count == expected_counts[-1]
        assert counts_seen == expected_counts
        assert job.finished_at is not None
        assert job.updated_at is not None
        assert isinstance(job.duration, int)
        assert job.duration >= 0


class TestImportStaleHealthCheck:
    def test_stale_in_progress_reimport_marked_failed_on_get(self, api_client, project, settings):
        settings.IMPORT_STALE_TIMEOUT = 1.0
        reimport = ProjectReimport.objects.create(
            project=project,
            status=ProjectReimport.Status.IN_PROGRESS,
            job_id='stale-no-redis',
            task_count=12,
            updated_at=timezone.now() - timedelta(seconds=30),
        )

        url = reverse('projects:api:project-reimports', kwargs={'pk': project.id, 'reimport_pk': reimport.id})
        # No Redis: wall-clock still applies when job_id was recorded from a prior enqueue.
        with patch('projects.import_health.redis_connected', return_value=False):
            response = api_client.get(url)

        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'failed'
        assert data['task_count'] == 12
        assert data['finished_at'] is not None

        reimport.refresh_from_db()
        assert reimport.status == ProjectReimport.Status.FAILED

    def test_missing_rq_job_marks_failed(self, project, settings):
        import rq

        settings.IMPORT_STALE_TIMEOUT = 1000.0
        pimport = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.IN_PROGRESS,
            job_id='missing-job-id',
            updated_at=timezone.now(),
            task_count=3,
        )

        with (
            patch('projects.import_health.redis_connected', return_value=True),
            patch('projects.import_health.Job.fetch', side_effect=rq.exceptions.NoSuchJobError()),
        ):
            health_check_import_job(pimport)

        pimport.refresh_from_db()
        assert pimport.status == ProjectImport.Status.FAILED
        assert pimport.task_count == 3

    def test_created_dead_rq_marks_failed(self, project, settings):
        """Lost queued RQ job while still created must be marked failed (safe core)."""
        import rq

        settings.IMPORT_CREATED_NOT_FOUND_GRACE = 0.0
        pimport = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.CREATED,
            job_id='gone-before-start',
            created_at=timezone.now() - timedelta(seconds=120),
        )

        with (
            patch('projects.import_health.redis_connected', return_value=True),
            patch('projects.import_health.Job.fetch', side_effect=rq.exceptions.NoSuchJobError()),
        ):
            health_check_import_job(pimport)

        pimport.refresh_from_db()
        assert pimport.status == ProjectImport.Status.FAILED
        assert pimport.failed_by_health_check is True
        assert 'never started' in pimport.error

    def test_created_not_found_within_grace_stays_created(self, project, settings):
        """Fresh CREATED + RQ not found must not false-fail during enqueue race."""
        import rq

        settings.IMPORT_CREATED_NOT_FOUND_GRACE = 60.0
        pimport = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.CREATED,
            job_id='just-enqueued',
            created_at=timezone.now(),
        )

        with (
            patch('projects.import_health.redis_connected', return_value=True),
            patch('projects.import_health.Job.fetch', side_effect=rq.exceptions.NoSuchJobError()),
        ):
            health_check_import_job(pimport)

        pimport.refresh_from_db()
        assert pimport.status == ProjectImport.Status.CREATED
        assert pimport.finished_at is None

    def test_created_explicit_rq_failed_marks_failed_immediately(self, project, settings):
        """Explicit RQ failed/stopped/canceled still fails CREATED without waiting for grace."""
        settings.IMPORT_CREATED_NOT_FOUND_GRACE = 3600.0
        pimport = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.CREATED,
            job_id='failed-queued',
            created_at=timezone.now(),
        )
        rq_job = MagicMock()
        rq_job.get_status.return_value = 'failed'

        with (
            patch('projects.import_health.redis_connected', return_value=True),
            patch('projects.import_health.Job.fetch', return_value=rq_job),
        ):
            health_check_import_job(pimport)

        pimport.refresh_from_db()
        assert pimport.status == ProjectImport.Status.FAILED
        assert pimport.failed_by_health_check is True

    def test_progress_update_skips_terminal_rows(self, project):
        """Mid-batch progress must not mutate counters after the row is already FAILED."""
        from projects.import_health import update_import_job_progress

        pimport = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.FAILED,
            task_count=3,
            annotation_count=0,
            prediction_count=0,
            updated_at=timezone.now() - timedelta(seconds=30),
            finished_at=timezone.now() - timedelta(seconds=30),
            failed_by_health_check=True,
        )
        before = pimport.updated_at

        update_import_job_progress(pimport, task_count=99, annotation_count=1, prediction_count=2)

        pimport.refresh_from_db()
        assert pimport.status == ProjectImport.Status.FAILED
        assert pimport.task_count == 3
        assert pimport.annotation_count == 0
        assert pimport.prediction_count == 0
        assert pimport.updated_at == before

    def test_worker_reclaims_health_check_failed_created(self, project):
        """Live worker must reclaim a false health-check FAILED and continue."""
        from projects.import_health import claim_import_job_in_progress

        pimport = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.FAILED,
            error='stale',
            traceback='stale',
            finished_at=timezone.now(),
            failed_by_health_check=True,
            job_id='eventually-started',
        )

        assert claim_import_job_in_progress(pimport) is True
        pimport.refresh_from_db()
        assert pimport.status == ProjectImport.Status.IN_PROGRESS
        assert pimport.failed_by_health_check is False
        assert pimport.finished_at is None
        assert pimport.error in (None, '')
        assert pimport.traceback in (None, '')

    def test_worker_does_not_reclaim_real_failure(self, project):
        from projects.import_health import claim_import_job_in_progress

        pimport = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.FAILED,
            error='Worker raised',
            finished_at=timezone.now(),
            failed_by_health_check=False,
        )

        assert claim_import_job_in_progress(pimport) is False
        pimport.refresh_from_db()
        assert pimport.status == ProjectImport.Status.FAILED
        assert pimport.error == 'Worker raised'

    def test_created_live_rq_stays_created(self, project):
        """Queued/started RQ must not fail a created row (long queues are normal)."""
        pimport = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.CREATED,
            job_id='still-queued',
            created_at=timezone.now() - timedelta(hours=2),
        )
        rq_job = MagicMock()
        rq_job.get_status.return_value = 'queued'

        with (
            patch('projects.import_health.redis_connected', return_value=True),
            patch('projects.import_health.Job.fetch', return_value=rq_job),
        ):
            health_check_import_job(pimport)

        pimport.refresh_from_db()
        assert pimport.status == ProjectImport.Status.CREATED
        assert pimport.finished_at is None

    def test_in_progress_without_job_id_skips_wall_clock(self, project, settings):
        """Local sync / missing job_id must not wall-clock-fail (no RQ to correlate)."""
        settings.IMPORT_STALE_TIMEOUT = 1.0
        pimport = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.IN_PROGRESS,
            job_id=None,
            updated_at=timezone.now() - timedelta(seconds=120),
            task_count=10,
        )

        with patch('projects.import_health.redis_connected', return_value=False):
            health_check_import_job(pimport)

        pimport.refresh_from_db()
        assert pimport.status == ProjectImport.Status.IN_PROGRESS
        assert pimport.finished_at is None

    def test_live_rq_job_skips_wall_clock_stale_check(self, project, settings):
        """A started RQ job must not be failed just because a batch took > threshold."""
        settings.IMPORT_STALE_TIMEOUT = 1.0
        pimport = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.IN_PROGRESS,
            job_id='live-job-id',
            updated_at=timezone.now() - timedelta(seconds=120),
            task_count=50,
        )
        rq_job = MagicMock()
        rq_job.get_status.return_value = 'started'

        with (
            patch('projects.import_health.redis_connected', return_value=True),
            patch('projects.import_health.Job.fetch', return_value=rq_job),
        ):
            health_check_import_job(pimport)

        pimport.refresh_from_db()
        assert pimport.status == ProjectImport.Status.IN_PROGRESS
        assert pimport.finished_at is None

    def test_real_failure_wins_over_worker_completed(self, project):
        """Conditional COMPLETED update must not clobber a real worker FAILED."""
        pimport = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.IN_PROGRESS,
            task_count=12,
            updated_at=timezone.now(),
        )
        worker_job = ProjectImport.objects.get(pk=pimport.pk)

        ProjectImport.objects.filter(pk=pimport.pk).update(
            status=ProjectImport.Status.FAILED,
            error='Worker raised',
            finished_at=timezone.now(),
            task_count=12,
            failed_by_health_check=False,
        )

        worker_job.status = ProjectImport.Status.IN_PROGRESS
        mark_import_job_finished(worker_job, ProjectImport.Status.COMPLETED, duration=3.0)

        worker_job.refresh_from_db()
        assert worker_job.status == ProjectImport.Status.FAILED
        assert worker_job.task_count == 12
        assert worker_job.finished_at is not None
        assert worker_job.failed_by_health_check is False

    def test_null_failed_by_health_check_treated_as_real_failure(self, project):
        """Pre-migration FAILED rows (NULL flag) must not be overwritten by COMPLETED."""
        pimport = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.IN_PROGRESS,
            task_count=4,
            updated_at=timezone.now(),
        )
        worker_job = ProjectImport.objects.get(pk=pimport.pk)

        ProjectImport.objects.filter(pk=pimport.pk).update(
            status=ProjectImport.Status.FAILED,
            error='Legacy failure',
            finished_at=timezone.now(),
            task_count=4,
            failed_by_health_check=None,
        )

        worker_job.status = ProjectImport.Status.IN_PROGRESS
        mark_import_job_finished(worker_job, ProjectImport.Status.COMPLETED, duration=1.0)

        worker_job.refresh_from_db()
        assert worker_job.status == ProjectImport.Status.FAILED
        assert worker_job.error == 'Legacy failure'
        assert worker_job.failed_by_health_check is None

    def test_worker_completed_replaces_stale_health_failure(self, project):
        """A genuine COMPLETED must replace an inferred health-check FAILED."""
        pimport = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.IN_PROGRESS,
            task_count=12,
            updated_at=timezone.now(),
        )
        worker_job = ProjectImport.objects.get(pk=pimport.pk)

        from projects.import_health import _mark_stale_failed

        _mark_stale_failed(pimport, error='stale', traceback='stale')
        pimport.refresh_from_db()
        assert pimport.status == ProjectImport.Status.FAILED
        assert pimport.failed_by_health_check is True

        worker_job.status = ProjectImport.Status.IN_PROGRESS
        mark_import_job_finished(worker_job, ProjectImport.Status.COMPLETED, duration=3.0)

        worker_job.refresh_from_db()
        assert worker_job.status == ProjectImport.Status.COMPLETED
        assert worker_job.task_count == 12
        assert worker_job.duration == 3
        assert worker_job.failed_by_health_check is False
        assert worker_job.error in (None, '')
        assert worker_job.finished_at is not None
        assert worker_job.updated_at == worker_job.finished_at

    def test_stale_health_does_not_overwrite_completed(self, project):
        """Conditional FAILED update must not clobber a racing worker COMPLETED."""
        from projects.import_health import _mark_stale_failed

        pimport = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.IN_PROGRESS,
            task_count=12,
            updated_at=timezone.now(),
        )
        poller_job = ProjectImport.objects.get(pk=pimport.pk)

        ProjectImport.objects.filter(pk=pimport.pk).update(
            status=ProjectImport.Status.COMPLETED,
            finished_at=timezone.now(),
            task_count=12,
        )

        poller_job.status = ProjectImport.Status.IN_PROGRESS
        _mark_stale_failed(poller_job, error='stale', traceback='stale')

        poller_job.refresh_from_db()
        assert poller_job.status == ProjectImport.Status.COMPLETED
        assert poller_job.task_count == 12
        assert poller_job.error in (None, '')
        assert poller_job.finished_at is not None

    def test_rq_finished_does_not_mark_failed_while_worker_completing(self, project, settings):
        """RQ ``finished`` alone must not fail the row (worker may still write COMPLETED)."""
        settings.IMPORT_STALE_TIMEOUT = 1.0
        pimport = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.IN_PROGRESS,
            job_id='finishing-job',
            updated_at=timezone.now(),
            task_count=50,
        )
        rq_job = MagicMock()
        rq_job.get_status.return_value = 'finished'

        with (
            patch('projects.import_health.redis_connected', return_value=True),
            patch('projects.import_health.Job.fetch', return_value=rq_job),
            patch('projects.import_health.logger.warning') as warn,
        ):
            health_check_import_job(pimport)

        pimport.refresh_from_db()
        assert pimport.status == ProjectImport.Status.IN_PROGRESS
        assert pimport.finished_at is None
        warn.assert_not_called()

    def test_rq_finished_stale_progress_still_wall_clock_fails(self, project, settings):
        """After RQ finished, a stuck row with stale updated_at still fails via the timer."""
        settings.IMPORT_STALE_TIMEOUT = 1.0
        pimport = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.IN_PROGRESS,
            job_id='finished-stuck',
            updated_at=timezone.now() - timedelta(seconds=30),
            task_count=50,
        )
        rq_job = MagicMock()
        rq_job.get_status.return_value = 'finished'

        with (
            patch('projects.import_health.redis_connected', return_value=True),
            patch('projects.import_health.Job.fetch', return_value=rq_job),
            patch('projects.import_health.logger.warning') as warn,
        ):
            health_check_import_job(pimport)

        pimport.refresh_from_db()
        assert pimport.status == ProjectImport.Status.FAILED
        assert pimport.failed_by_health_check is True
        warn.assert_not_called()

    def test_rq_failure_handler_does_not_overwrite_completed(self, project):
        """RQ on_failure must use race-safe finish (not raw UPDATE that clobbers COMPLETED)."""
        pimport = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.COMPLETED,
            task_count=4,
            finished_at=timezone.now(),
        )
        rq_job = MagicMock()
        rq_job.args = [pimport.id]
        set_import_background_failure(rq_job, None, Exception, Exception('boom'), None)

        pimport.refresh_from_db()
        assert pimport.status == ProjectImport.Status.COMPLETED
        assert pimport.task_count == 4

    def test_early_failure_marks_created_job_failed(self, project):
        """RQ on_failure before IN_PROGRESS must still mark the row failed."""
        pimport = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.CREATED,
            task_count=0,
        )
        rq_job = MagicMock()
        rq_job.args = [pimport.id]
        set_import_background_failure(rq_job, None, Exception, Exception('deserialize failed'), None)

        pimport.refresh_from_db()
        assert pimport.status == ProjectImport.Status.FAILED
        assert 'deserialize failed' in pimport.error
        assert pimport.finished_at is not None

    def test_redis_transport_error_does_not_mark_failed(self, project, settings):
        """Redis hiccups must not be treated as a missing/dead RQ job."""
        settings.IMPORT_STALE_TIMEOUT = 1.0
        pimport = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.IN_PROGRESS,
            job_id='live-job-id',
            updated_at=timezone.now() - timedelta(seconds=120),
            task_count=50,
        )

        with (
            patch('projects.import_health.redis_connected', return_value=True),
            patch('projects.import_health.Job.fetch', side_effect=TimeoutError('redis timeout')),
        ):
            health_check_import_job(pimport)

        pimport.refresh_from_db()
        assert pimport.status == ProjectImport.Status.IN_PROGRESS
        assert pimport.finished_at is None

    def test_real_failure_replaces_stale_health_failure(self, project):
        """A genuine worker FAILED must replace an inferred health-check FAILED (better error)."""
        from projects.import_health import _mark_stale_failed

        pimport = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.IN_PROGRESS,
            task_count=12,
            updated_at=timezone.now(),
        )
        _mark_stale_failed(pimport, error='stale', traceback='stale')
        pimport.refresh_from_db()
        assert pimport.status == ProjectImport.Status.FAILED
        assert pimport.failed_by_health_check is True

        mark_import_job_finished(
            pimport,
            ProjectImport.Status.FAILED,
            error='Worker raised deserialize failed',
            traceback_text='tb',
        )
        pimport.refresh_from_db()
        assert pimport.status == ProjectImport.Status.FAILED
        assert pimport.failed_by_health_check is False
        assert pimport.error == 'Worker raised deserialize failed'
        assert pimport.traceback == 'tb'


class TestImportListAndSafety:
    def test_list_imports_and_filter_by_status(self, api_client, project):
        completed = ProjectImport.objects.create(project=project, status=ProjectImport.Status.COMPLETED, task_count=5)
        ProjectImport.objects.create(project=project, status=ProjectImport.Status.FAILED, task_count=1)
        ProjectImport.objects.create(project=project, status=ProjectImport.Status.IN_PROGRESS, task_count=2)

        list_url = reverse('projects:api:project-import-list', kwargs={'pk': project.id})
        response = api_client.get(list_url)
        assert response.status_code == 200
        body = response.json()
        assert body['count'] == 3
        assert len(body['results']) == 3

        response = api_client.get(list_url, {'status': 'completed'})
        assert response.status_code == 200
        data = response.json()
        assert data['count'] == 1
        assert data['results'][0]['id'] == completed.id
        assert 'task_ids' not in data['results'][0]
        assert 'tasks' not in data['results'][0]

    def test_list_imports_invalid_status_returns_400(self, api_client, project):
        list_url = reverse('projects:api:project-import-list', kwargs={'pk': project.id})
        response = api_client.get(list_url, {'status': 'nope'})
        assert response.status_code == 400
        body = response.json()
        assert body.get('detail') == 'Validation error'
        assert 'status' in (body.get('validation_errors') or {})

    def test_list_status_filter_drops_rows_failed_by_health_check(self, api_client, project, settings):
        """status=in_progress must not return rows health-check flipped to failed."""
        settings.IMPORT_STALE_TIMEOUT = 1.0
        live = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.IN_PROGRESS,
            job_id='still-running',
            updated_at=timezone.now(),
            task_count=2,
        )
        stale = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.IN_PROGRESS,
            job_id='stale-no-redis',
            updated_at=timezone.now() - timedelta(seconds=30),
            task_count=12,
        )
        list_url = reverse('projects:api:project-import-list', kwargs={'pk': project.id})

        # Redis down + job_id: wall-clock applies. Live updated_at is fresh; stale fails.
        with patch('projects.import_health.redis_connected', return_value=False):
            response = api_client.get(list_url, {'status': 'in_progress'})

        assert response.status_code == 200
        body = response.json()
        ids = [row['id'] for row in body['results']]
        assert live.id in ids
        assert stale.id not in ids
        assert all(row['status'] == 'in_progress' for row in body['results'])
        # count must match filtered results after health-check flips (not a stale total).
        assert body['count'] == len(body['results']) == 1

        stale.refresh_from_db()
        assert stale.status == ProjectImport.Status.FAILED

        # Unfiltered list still surfaces the health-check failure.
        response = api_client.get(list_url)
        assert response.status_code == 200
        by_id = {row['id']: row for row in response.json()['results']}
        assert by_id[stale.id]['status'] == 'failed'

    def test_list_status_filter_rebuilds_until_stable(self, api_client, project, settings):
        """Repeated flips on rebuild must not leave a short filtered page."""
        settings.IMPORT_STALE_TIMEOUT = 1.0
        live = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.IN_PROGRESS,
            job_id='still-running',
            updated_at=timezone.now(),
            task_count=1,
        )
        # Two stale rows: first pass fails one, rebuilt page still has the other stale.
        stale_a = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.IN_PROGRESS,
            job_id='stale-a',
            updated_at=timezone.now() - timedelta(seconds=30),
            task_count=2,
        )
        stale_b = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.IN_PROGRESS,
            job_id='stale-b',
            updated_at=timezone.now() - timedelta(seconds=30),
            task_count=3,
        )
        list_url = reverse('projects:api:project-import-list', kwargs={'pk': project.id})

        call_count = {'n': 0}
        from projects import import_health as ih

        real_ensure = ih.ensure_import_job_statuses

        def ensure_flip_one(jobs):
            # First ensure: fail only the first stale on the page; second ensure fails the rest.
            call_count['n'] += 1
            if call_count['n'] == 1:
                targets = [j for j in jobs if j.id == stale_a.id]
                real_ensure(targets or jobs[:1])
            else:
                real_ensure(jobs)

        with (
            patch('projects.import_health.redis_connected', return_value=False),
            patch('projects.api.ensure_import_job_statuses', side_effect=ensure_flip_one),
        ):
            response = api_client.get(list_url, {'status': 'in_progress'})

        assert response.status_code == 200
        body = response.json()
        ids = [row['id'] for row in body['results']]
        assert ids == [live.id]
        assert body['count'] == 1
        stale_a.refresh_from_db()
        stale_b.refresh_from_db()
        assert stale_a.status == ProjectImport.Status.FAILED
        assert stale_b.status == ProjectImport.Status.FAILED

    def test_list_imports_pagination(self, api_client, project):
        for i in range(5):
            ProjectImport.objects.create(project=project, status=ProjectImport.Status.COMPLETED, task_count=i)
        list_url = reverse('projects:api:project-import-list', kwargs={'pk': project.id})
        response = api_client.get(list_url, {'page_size': 2, 'page': 1})
        assert response.status_code == 200
        body = response.json()
        assert body['count'] == 5
        assert len(body['results']) == 2
        assert body['next'] is not None

    def test_list_reimports(self, api_client, project):
        ProjectReimport.objects.create(project=project, status=ProjectReimport.Status.COMPLETED, task_count=9)
        url = reverse('projects:api:project-reimport-list', kwargs={'pk': project.id})
        response = api_client.get(url)
        assert response.status_code == 200
        body = response.json()
        assert body['count'] == 1
        assert body['results'][0]['task_count'] == 9
        assert 'created_at' in body['results'][0]

    def test_list_reimports_null_created_at_sorts_after_timestamped(self, api_client, project):
        """Pre-migration reimports have NULL created_at; they must not float above newer rows."""
        legacy = ProjectReimport.objects.create(project=project, status=ProjectReimport.Status.COMPLETED, task_count=1)
        ProjectReimport.objects.filter(pk=legacy.pk).update(created_at=None)
        newer = ProjectReimport.objects.create(project=project, status=ProjectReimport.Status.COMPLETED, task_count=2)
        assert newer.created_at is not None

        url = reverse('projects:api:project-reimport-list', kwargs={'pk': project.id})
        response = api_client.get(url)
        assert response.status_code == 200
        ids = [row['id'] for row in response.json()['results']]
        assert ids == [newer.id, legacy.id]

    def test_import_detail_omits_tasks_payload(self, api_client, project):
        pimport = ProjectImport.objects.create(
            project=project,
            status=ProjectImport.Status.COMPLETED,
            tasks=[{'data': {'text': 'secret'}}],
            task_count=1,
        )
        url = reverse('projects:api:project-imports', kwargs={'pk': project.id, 'import_pk': pimport.id})
        response = api_client.get(url)
        assert response.status_code == 200
        assert 'tasks' not in response.json()

    @pytest.mark.parametrize(
        'model,url_name,pk_kwarg',
        [
            (ProjectImport, 'projects:api:project-imports', 'import_pk'),
            (ProjectReimport, 'projects:api:project-reimports', 'reimport_pk'),
        ],
    )
    def test_detail_scoped_to_project(self, api_client, project, other_project, model, url_name, pk_kwarg):
        job = model.objects.create(project=project, status=model.Status.COMPLETED)
        wrong = reverse(url_name, kwargs={'pk': other_project.id, pk_kwarg: job.id})
        right = reverse(url_name, kwargs={'pk': project.id, pk_kwarg: job.id})
        assert api_client.get(wrong).status_code == 404
        assert api_client.get(right).status_code == 200


class TestEnqueueFailureMarksFailed:
    def test_async_import_enqueue_failure_marks_row_failed(self, user, project):
        from data_import.api import _ENQUEUE_FAIL_ERROR, ImportAPI

        request = MagicMock()
        request.FILES = {}
        request.content_type = 'application/json'
        request.data = [{'text': 'hello'}]
        request.user = user

        with patch('data_import.api.start_job_async_or_sync', side_effect=RuntimeError('redis down')):
            with pytest.raises(RuntimeError, match='redis down'):
                ImportAPI().async_import(request, project, None, True, False)

        pimport = ProjectImport.objects.get(project=project)
        assert pimport.status == ProjectImport.Status.FAILED
        assert pimport.job_id in (None, '')
        assert pimport.error == _ENQUEUE_FAIL_ERROR
        assert pimport.failed_by_health_check is False
        assert pimport.finished_at is not None

    def test_async_reimport_enqueue_failure_marks_row_failed(self, user, project):
        from data_import.api import _ENQUEUE_FAIL_ERROR, ReImportAPI

        view = ReImportAPI()
        view.request = MagicMock(user=user)

        with patch('data_import.api.start_job_async_or_sync', side_effect=RuntimeError('redis down')):
            with pytest.raises(RuntimeError, match='redis down'):
                view.async_reimport(project, [], True, project.organization_id)

        reimport = ProjectReimport.objects.get(project=project)
        assert reimport.status == ProjectReimport.Status.FAILED
        assert reimport.job_id in (None, '')
        assert reimport.error == _ENQUEUE_FAIL_ERROR
        assert reimport.failed_by_health_check is False
        assert reimport.finished_at is not None

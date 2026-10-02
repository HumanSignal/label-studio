"""Progress updates and stale-job detection for ProjectImport / ProjectReimport."""

import logging

import django_rq
import rq
from core.redis import redis_connected
from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from rq.job import Job

logger = logging.getLogger(__name__)

_STALE_ERROR = (
    'Import job stopped updating progress and was marked failed. '
    'Partial data may already be committed; inspect task_count and the project before retrying. '
    'This typically occurs if the worker was killed (OOM, timeout, deploy) or the RQ job disappeared.'
)

_CREATED_DEAD_RQ_ERROR = (
    'Import job never started and its RQ job is gone or failed. '
    'No tasks were committed from this job; safe to retry the import.'
)

# RQ statuses that mean the worker/queue still owns the job — do not wall-clock-fail these.
_LIVE_RQ_STATUSES = frozenset({'queued', 'started', 'deferred', 'scheduled'})
# RQ ended without our row reaching a terminal status — treat as stale.
_DEAD_RQ_STATUSES = frozenset({'failed', 'not found', 'stopped', 'canceled', 'cancelled'})
# RQ reports finished while our row may still be writing COMPLETED — never dead-fail on
# this alone; fall through to the wall-clock timer (no "unrecognized status" warning).
_FINISHING_RQ_STATUSES = frozenset({'finished'})

# Extra fields mark_import_job_finished may persist in the same terminal UPDATE.
_TERMINAL_EXTRA_FIELDS = frozenset(
    {
        'task_count',
        'annotation_count',
        'prediction_count',
        'file_upload_ids',
        'found_formats',
        'data_columns',
        'task_ids',
    }
)


def update_import_job_progress(job, *, task_count, annotation_count=0, prediction_count=0):
    """Persist running counters after a committed batch (ProjectImport or ProjectReimport).

    Only applies while ``in_progress`` so a mid-batch worker cannot bump counters /
    ``updated_at`` on a row that health-check (or a real failure) already finalized.
    """
    now = timezone.now()
    fields = {
        'task_count': task_count,
        'annotation_count': annotation_count,
        'prediction_count': prediction_count,
        'updated_at': now,
    }
    updated = type(job).objects.filter(pk=job.pk, status=job.Status.IN_PROGRESS).update(**fields)
    if updated == 0:
        job.refresh_from_db()
        return
    for key, value in fields.items():
        setattr(job, key, value)


def claim_import_job_in_progress(job):
    """Worker claim: CREATED (or inferred health-check FAILED) → IN_PROGRESS.

    A false ``not found`` health-check can mark CREATED as FAILED before the worker
    starts. Allowing reclaim of ``failed_by_health_check=True`` lets a live worker
    continue instead of exiting on ``status != created``.

    Returns True if this caller claimed the row; False if another status won.
    """
    now = timezone.now()
    fields = {
        'status': job.Status.IN_PROGRESS,
        'updated_at': now,
        'finished_at': None,
        'error': None,
        'traceback': None,
        'failed_by_health_check': False,
    }
    updated = (
        type(job)
        .objects.filter(pk=job.pk)
        .filter(Q(status=job.Status.CREATED) | Q(status=job.Status.FAILED, failed_by_health_check=True))
        .update(**fields)
    )
    if updated == 0:
        job.refresh_from_db()
        return False
    for key, value in fields.items():
        setattr(job, key, value)
    return True


def mark_import_job_finished(
    job,
    status,
    *,
    error=None,
    traceback_text=None,
    duration=None,
    failed_by_health_check=False,
    **extras,
):
    """Set terminal status, finished_at, and updated_at in one conditional UPDATE.

    Optional ``extras`` (task_count, file_upload_ids, …) are written in the same
    UPDATE so callers do not need a separate progress save before completing.

    Terminal writes are conditional so concurrent COMPLETED and FAILED cannot overwrite
    each other incorrectly:

    - COMPLETED refuses a real worker FAILED (``failed_by_health_check`` is not True,
      including NULL pre-migration rows), but may replace an inferred health-check FAILED.
    - FAILED applies while ``created`` or ``in_progress`` (early RQ failures can land
      before the worker flips the row to ``in_progress``), and may replace an inferred
      health-check FAILED with the real worker error. Real FAILED is never overwritten.
    """
    unknown = set(extras) - _TERMINAL_EXTRA_FIELDS
    if unknown:
        raise TypeError(f'Unsupported mark_import_job_finished extras: {sorted(unknown)}')

    now = timezone.now()
    fields = {
        'status': status,
        'finished_at': now,
        'updated_at': now,
        'failed_by_health_check': failed_by_health_check,
    }
    if duration is not None:
        fields['duration'] = int(duration)
    fields.update(extras)

    qs = type(job).objects.filter(pk=job.pk)
    if status == job.Status.COMPLETED:
        # Clear leftover failure fields when a real completion wins over a stale fail.
        fields['error'] = error
        fields['traceback'] = traceback_text
        fields['failed_by_health_check'] = False
        # Only inferred health-check failures (True) may be corrected. False and NULL
        # (legacy / pre-migration FAILED rows) are treated as real failures.
        updated = qs.filter(~Q(status=job.Status.FAILED) | Q(failed_by_health_check=True)).update(**fields)
        if updated == 0:
            current = qs.values_list('status', 'task_count').first()
            current_status = current[0] if current else None
            task_count = current[1] if current else getattr(job, 'task_count', None)
            if current_status == job.Status.FAILED:
                logger.warning(
                    'Import job %s already marked failed; refusing to overwrite with completed '
                    '(partial task_count=%s). Inspect the project before retrying.',
                    job.id,
                    task_count,
                )
            job.refresh_from_db()
            return
    else:
        if error is not None:
            fields['error'] = error
        if traceback_text is not None:
            fields['traceback'] = traceback_text
        # Allow created/in_progress, or replace an inferred health-check failure.
        updated = qs.filter(
            Q(status__in=[job.Status.CREATED, job.Status.IN_PROGRESS])
            | Q(status=job.Status.FAILED, failed_by_health_check=True)
        ).update(**fields)
        if updated == 0:
            job.refresh_from_db()
            logger.info(
                'Import job %s not marked %s (status=%s); refusing to overwrite',
                job.id,
                status,
                job.status,
            )
            return

    for key, value in fields.items():
        setattr(job, key, value)


def ensure_import_job_statuses(jobs):
    """Run health checks for each import/reimport job on the page."""
    for job in jobs:
        try:
            health_check_import_job(job)
        except Exception:
            logger.warning('Health check failed for import job %s', getattr(job, 'id', job), exc_info=True)


def health_check_import_job(job):
    """Mark stuck import/reimport rows failed when RQ is dead or (in_progress) progress is stale.

    Prefer RQ job state when Redis and ``job_id`` are available.

    - ``created``: only act on dead RQ (lost queued job). Live queued/started stays
      ``created``. No wall-clock — long queues are normal.
    - ``in_progress``: live RQ skips the wall-clock timer; dead RQ fails immediately;
      ``finished`` / unrecognized fall through to wall-clock on ``updated_at``.
    - No ``job_id`` (local sync / enqueue race): never wall-clock-fail — sync runs
      inline without an RQ id, and inventing failure would false-fail healthy work.
    """
    if job.status == job.Status.CREATED:
        _health_check_created_job(job)
        return

    if job.status != job.Status.IN_PROGRESS:
        return

    if redis_connected() and job.job_id:
        rq_status = _fetch_rq_job_status(job)
        if rq_status in _DEAD_RQ_STATUSES:
            _mark_stale_failed(
                job,
                error=_STALE_ERROR,
                traceback=f'RQ job {job.job_id} is {rq_status}. {_STALE_ERROR}',
            )
            logger.info(
                'Import job %s marked failed because RQ job %s is %s',
                job.id,
                job.job_id,
                rq_status,
            )
            return
        if rq_status in _LIVE_RQ_STATUSES:
            return
        # Redis transport errors: do not infer failure (would false-fail healthy jobs).
        if rq_status == 'unknown':
            return
        # finished: fall through to wall-clock (do not warn — expected during COMPLETED race).
        if rq_status not in _FINISHING_RQ_STATUSES:
            logger.warning(
                'Import job %s has unrecognized RQ status %r; falling back to wall-clock stale check',
                job.id,
                rq_status,
            )
    elif not job.job_id:
        # Sync/dev (no Redis job) or job_id not written yet — do not invent a stale failure.
        return

    now = timezone.now()
    progress_at = job.updated_at or job.created_at or now
    delta = (now - progress_at).total_seconds()
    # Absolute wall-clock stale threshold (default 5 minutes), keyed off updated_at.
    threshold = getattr(settings, 'IMPORT_STALE_TIMEOUT', 300.0)
    if delta > threshold:
        _mark_stale_failed(job, error=_STALE_ERROR, traceback=_STALE_ERROR)
        logger.info(
            'Import job %s marked failed: last progress %.0fs ago (threshold %.0fs)',
            job.id,
            delta,
            threshold,
        )


def _health_check_created_job(job):
    """Fail created rows only when their RQ job is known-dead (safe core).

    ``not found`` is deferred by ``IMPORT_CREATED_NOT_FOUND_GRACE`` (default 60s) so a
    poll immediately after enqueue cannot false-fail before Redis registers the job.
    Explicit dead statuses (failed / stopped / canceled) still fail immediately.
    """
    if not (redis_connected() and job.job_id):
        return

    rq_status = _fetch_rq_job_status(job)
    if rq_status not in _DEAD_RQ_STATUSES:
        return

    if rq_status == 'not found':
        grace = float(getattr(settings, 'IMPORT_CREATED_NOT_FOUND_GRACE', 60.0))
        created_at = job.created_at or job.updated_at
        if created_at is not None:
            age = (timezone.now() - created_at).total_seconds()
            if age < grace:
                return

    _mark_stale_failed(
        job,
        error=_CREATED_DEAD_RQ_ERROR,
        traceback=f'RQ job {job.job_id} is {rq_status} while import status is created. {_CREATED_DEAD_RQ_ERROR}',
    )
    logger.info(
        'Import job %s marked failed while created because RQ job %s is %s',
        job.id,
        job.job_id,
        rq_status,
    )


def _fetch_rq_job_status(job):
    queue = django_rq.get_queue('high')
    try:
        rq_job = Job.fetch(job.job_id, connection=queue.connection)
        return rq_job.get_status()
    except (rq.exceptions.NoSuchJobError, TypeError):
        return 'not found'
    except Exception as e:
        # Redis transport / timeout errors must not be treated as a missing job.
        logger.warning('Failed to query RQ status for job %s from Redis: %s', job.job_id, e)
        return 'unknown'


def _mark_stale_failed(job, *, error, traceback):
    """Mark failed while created/in_progress (conditional update via mark_import_job_finished)."""
    mark_import_job_finished(
        job,
        job.Status.FAILED,
        error=error,
        traceback_text=traceback,
        failed_by_health_check=True,
    )

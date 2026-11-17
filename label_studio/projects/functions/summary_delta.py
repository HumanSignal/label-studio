"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

# Summary decrements applied after commit with a bounded lock wait, so task deletes do not serialize on the summary row.

import json
import logging
import threading
from collections import Counter
from dataclasses import dataclass, field
from typing import Iterable, Optional

from core.current_request import CurrentContext
from core.feature_flags import flag_set_for_org_id
from core.job_deduplication import (
    DeduplicationKeys,
    _get_redis_connection,
    deduplicated_worker_run,
    enqueue_with_deduplication,
    release_deduplication_slot,
)
from django.conf import settings
from django.db import DatabaseError, connection, transaction
from django.db.utils import OperationalError
from psycopg import errors as pg_errors

logger = logging.getLogger(__name__)

SUMMARY_DELTA_FLAG = 'fflag_fix_back_plt_1311_summary_delta_after_commit_16112026_short'

_NAMESPACE = 'project_summary_delta'
_PENDING_DELTA_TTL_SECONDS = 24 * 60 * 60
_ID_CHUNK_SIZE = 500

_FIELDS = ('all_data_columns', 'created_annotations', 'created_labels', 'created_labels_drafts')
_NESTED_FIELDS = ('created_labels', 'created_labels_drafts')
_RESETTABLE_FIELDS = ('created_annotations', 'created_labels', 'created_labels_drafts')

# projects whose summary row timed out during the current run of on_commit callbacks
_local = threading.local()


@dataclass
class SummaryDelta:
    """Amounts to subtract from ProjectSummary counters (all values are positive)."""

    all_data_columns: Counter = field(default_factory=Counter)
    created_annotations: Counter = field(default_factory=Counter)
    created_labels: dict = field(default_factory=dict)
    created_labels_drafts: dict = field(default_factory=dict)
    # columns to clear instead of decrementing, e.g. when every annotation of the project is deleted
    reset: set = field(default_factory=set)

    def is_empty(self) -> bool:
        return not (
            self.reset
            or +self.all_data_columns
            or +self.created_annotations
            or any(+c for c in self.created_labels.values())
            or any(+c for c in self.created_labels_drafts.values())
        )

    def merge(self, other: 'SummaryDelta') -> 'SummaryDelta':
        self.reset |= other.reset
        self.all_data_columns.update(other.all_data_columns)
        self.created_annotations.update(other.created_annotations)
        for name in _NESTED_FIELDS:
            target = getattr(self, name)
            for from_name, counts in getattr(other, name).items():
                target.setdefault(from_name, Counter()).update(counts)
        return self

    def to_redis_fields(self) -> dict:
        fields = {json.dumps(['reset', name]): 1 for name in self.reset}
        for name in ('all_data_columns', 'created_annotations'):
            for key, count in getattr(self, name).items():
                if count > 0:
                    fields[json.dumps([name, key])] = count
        for name in _NESTED_FIELDS:
            for from_name, counts in getattr(self, name).items():
                for label, count in counts.items():
                    if count > 0:
                        fields[json.dumps([name, from_name, label])] = count
        return fields

    @classmethod
    def from_redis_fields(cls, raw: dict) -> 'SummaryDelta':
        delta = cls()
        for raw_key, raw_count in raw.items():
            if isinstance(raw_key, bytes):
                raw_key = raw_key.decode()
            try:
                path = json.loads(raw_key)
                count = int(raw_count)
            except (TypeError, ValueError):
                logger.warning('Skipping malformed project summary delta field %r', raw_key)
                continue
            if count <= 0 or not isinstance(path, list) or not path:
                continue
            if path[0] == 'reset' and len(path) == 2 and path[1] in _RESETTABLE_FIELDS:
                delta.reset.add(path[1])
                continue
            if path[0] not in _FIELDS:
                continue
            name = path[0]
            if name in _NESTED_FIELDS and len(path) == 3:
                getattr(delta, name).setdefault(path[1], Counter())[path[2]] += count
            elif name not in _NESTED_FIELDS and len(path) == 2:
                getattr(delta, name)[path[1]] += count
        return delta


# =========== COLLECTING ===========


def _summary_helper():
    from projects.models import ProjectSummary

    # _get_annotation_key/_get_labels do not touch instance state
    return ProjectSummary()


def add_annotation_results(delta: SummaryDelta, results_list: Iterable) -> SummaryDelta:
    """Mirror of ProjectSummary._atomic_update_created_annotations_and_labels for decrements."""
    helper = _summary_helper()
    for results in results_list:
        if not isinstance(results, list):
            continue
        for result in results:
            if not isinstance(result, dict):
                continue
            key = helper._get_annotation_key(result)
            if not key:
                continue
            delta.created_annotations[key] += 1
            labels = delta.created_labels.setdefault(result['from_name'], Counter())
            for label in helper._get_labels(result):
                labels[label] += 1
    return delta


def add_draft_results(delta: SummaryDelta, results_list: Iterable) -> SummaryDelta:
    """Mirror of ProjectSummary._atomic_update_created_labels_drafts for decrements."""
    helper = _summary_helper()
    for results in results_list:
        if not isinstance(results, list):
            continue
        for result in results:
            if not isinstance(result, dict) or 'from_name' not in result:
                continue
            labels = delta.created_labels_drafts.setdefault(result['from_name'], Counter())
            for label in helper._get_labels(result):
                labels[label] += 1
    return delta


def add_task_data(delta: SummaryDelta, data_list: Iterable) -> SummaryDelta:
    for data in data_list:
        if isinstance(data, dict):
            delta.all_data_columns.update(data.keys())
    return delta


def _chunks(ids: list, size: int = _ID_CHUNK_SIZE):
    for i in range(0, len(ids), size):
        yield ids[i : i + size]


def add_tasks_data_columns(delta: SummaryDelta, task_ids: list) -> SummaryDelta:
    """Count data keys of the given tasks in the database, without loading task.data into Python."""
    for chunk in _chunks(list(task_ids)):
        with connection.cursor() as cursor:
            cursor.execute(
                'SELECT k, COUNT(*) FROM task t CROSS JOIN LATERAL jsonb_object_keys(t.data) k '
                "WHERE t.id = ANY(%s) AND jsonb_typeof(t.data) = 'object' GROUP BY k",
                [chunk],
            )
            for key, count in cursor.fetchall():
                delta.all_data_columns[key] += count
    return delta


def add_tasks_annotations_and_drafts(delta: SummaryDelta, task_ids: list) -> SummaryDelta:
    from tasks.models import Annotation, AnnotationDraft

    for chunk in _chunks(list(task_ids)):
        add_annotation_results(delta, Annotation.objects.filter(task_id__in=chunk).values_list('result', flat=True))
        add_draft_results(delta, AnnotationDraft.objects.filter(task_id__in=chunk).values_list('result', flat=True))
    return delta


# =========== APPLYING ===========


def _object_or_empty(expr: str) -> str:
    return f"(CASE WHEN jsonb_typeof({expr}) = 'object' THEN {expr} ELSE '{{}}'::jsonb END)"


def _subtract_flat_sql(src: str, delta: str) -> str:
    """{key: n} minus {key: m}; keys of the delta that drop to <= 0 are removed, other keys are kept as is."""
    return (
        "(SELECT COALESCE(jsonb_object_agg(s.k, s.v), '{}'::jsonb) FROM ("
        'SELECT e.key AS k, d.value IS NOT NULL AS touched, '
        "CASE WHEN jsonb_typeof(e.value) = 'number' AND jsonb_typeof(d.value) = 'number' "
        'THEN to_jsonb(e.value::text::numeric - d.value::text::numeric) ELSE e.value END AS v '
        f'FROM jsonb_each({src}) e LEFT JOIN jsonb_each({delta}) d ON d.key = e.key'
        ") s WHERE NOT (s.touched AND jsonb_typeof(s.v) = 'number' AND s.v::text::numeric <= 0))"
    )


def _subtract_nested_sql(src: str, delta: str) -> str:
    """{from_name: {label: n}} minus a delta of the same shape; a touched from_name left empty is removed."""
    inner = _subtract_flat_sql('p.value', 'dp.value')
    return (
        "(SELECT COALESCE(jsonb_object_agg(p.key, n.v), '{}'::jsonb) "
        f'FROM jsonb_each({src}) p LEFT JOIN jsonb_each({delta}) dp ON dp.key = p.key '
        "CROSS JOIN LATERAL (SELECT CASE WHEN jsonb_typeof(p.value) = 'object' AND jsonb_typeof(dp.value) = 'object' "
        f'THEN {inner} ELSE p.value END AS v) n '
        "WHERE NOT (dp.value IS NOT NULL AND n.v = '{}'::jsonb))"
    )


def apply_delta(project_id: int, delta: SummaryDelta) -> None:
    """Subtract ``delta`` from the summary row in place (PostgreSQL only)."""
    set_clauses, params = [], []
    reset = sorted(name for name in delta.reset if name in _RESETTABLE_FIELDS)
    for name in reset:
        set_clauses.append(f"{name} = '{{}}'::jsonb")
    for name in ('all_data_columns', 'created_annotations'):
        if name in reset:
            continue
        counts = {k: v for k, v in getattr(delta, name).items() if v > 0}
        if counts:
            set_clauses.append(f'{name} = {_subtract_flat_sql(_object_or_empty(name), "%s::jsonb")}')
            params.append(json.dumps(counts))
    for name in _NESTED_FIELDS:
        if name in reset:
            continue
        counts = {
            from_name: {label: v for label, v in labels.items() if v > 0}
            for from_name, labels in getattr(delta, name).items()
        }
        counts = {from_name: labels for from_name, labels in counts.items() if labels}
        if counts:
            set_clauses.append(f'{name} = {_subtract_nested_sql(_object_or_empty(name), "%s::jsonb")}')
            params.append(json.dumps(counts))
    if not set_clauses:
        return

    removed_columns = [k for k, v in delta.all_data_columns.items() if v > 0]
    with transaction.atomic(), connection.cursor() as cursor:
        cursor.execute(
            f'UPDATE projects_projectsummary SET {", ".join(set_clauses)} WHERE project_id = %s',
            params + [project_id],
        )
        if removed_columns:
            # same semantics as ProjectSummary.remove_data_columns: drop common columns that no longer exist
            cursor.execute(
                'UPDATE projects_projectsummary SET common_data_columns = ('
                "SELECT COALESCE(jsonb_agg(c.value ORDER BY c.ord), '[]'::jsonb) "
                'FROM jsonb_array_elements(common_data_columns) WITH ORDINALITY c(value, ord) '
                "WHERE NOT (c.value #>> '{}') = ANY(%s) "
                "OR jsonb_exists(COALESCE(all_data_columns, '{}'::jsonb), c.value #>> '{}')) "
                "WHERE project_id = %s AND jsonb_typeof(common_data_columns) = 'array'",
                [removed_columns, project_id],
            )


def _is_lock_timeout(exc: Exception) -> bool:
    return isinstance(exc, OperationalError) and isinstance(exc.__cause__, pg_errors.LockNotAvailable)


def _apply_with_lock_timeout(project_id: int, delta: SummaryDelta) -> None:
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute("SELECT set_config('lock_timeout', %s, true)", [settings.PROJECT_SUMMARY_LOCK_TIMEOUT])
        apply_delta(project_id, delta)


def _busy_projects() -> set:
    busy = getattr(_local, 'busy_projects', None)
    if busy is None:
        busy = _local.busy_projects = set()
    return busy


def _flush(project_id: int, organization_id: Optional[int], delta: SummaryDelta, wait_for_lock: bool) -> None:
    if wait_for_lock or delta.reset:
        # a reset applied later would wipe increments made after this commit, so it never goes to the background
        try:
            apply_delta(project_id, delta)
            return
        except DatabaseError:
            if delta.reset:
                logger.error('Project summary reset failed for project_id=%s', project_id, exc_info=True)
                return
            logger.warning('Project summary decrement failed for project_id=%s, deferring', project_id, exc_info=True)
    else:
        busy = _busy_projects()
        if project_id not in busy:
            try:
                _apply_with_lock_timeout(project_id, delta)
                return
            except DatabaseError as exc:
                if _is_lock_timeout(exc):
                    # the row is held by someone else: do not wait again for every task of a bulk delete
                    busy.add(project_id)
                else:
                    logger.warning(
                        'Project summary decrement failed for project_id=%s, deferring', project_id, exc_info=True
                    )
    defer_summary_delta(project_id, organization_id, delta)


def schedule_summary_delta(
    project_id: int, organization_id: Optional[int], delta: SummaryDelta, wait_for_lock: bool = False
) -> None:
    """Apply ``delta`` once the current transaction commits; nothing is applied on rollback.

    ``wait_for_lock`` waits for the summary row instead of handing the delta to a background job;
    use it in background jobs, where waiting does not hold a web worker.
    """
    if delta.is_empty():
        return
    # callbacks of the previous commit have run by now, so their busy marks no longer apply
    _local.busy_projects = set()
    # the delete is already committed: a failure here must not turn the response into an error
    transaction.on_commit(lambda: _flush(project_id, organization_id, delta, wait_for_lock), robust=True)


def use_summary_delta(organization_id: Optional[int]) -> bool:
    if connection.vendor != 'postgresql':
        return False
    cache = CurrentContext.request_cache('summary_delta_flag')
    if cache is not None and organization_id in cache:
        return cache[organization_id]
    enabled = bool(flag_set_for_org_id(SUMMARY_DELTA_FLAG, organization_id))
    if cache is not None:
        cache[organization_id] = enabled
    return enabled


# =========== BACKGROUND ===========


def _keys(project_id: int) -> DeduplicationKeys:
    return DeduplicationKeys(namespace=_NAMESPACE, target=str(project_id))


def _pending_delta_key(project_id: int) -> str:
    return f'{_NAMESPACE}:delta:{project_id}'


def _store_pending_delta(redis, project_id: int, delta: SummaryDelta) -> None:
    key = _pending_delta_key(project_id)
    with redis.pipeline(transaction=True) as pipe:
        for redis_field, count in delta.to_redis_fields().items():
            pipe.hincrby(key, redis_field, count)
        pipe.expire(key, _PENDING_DELTA_TTL_SECONDS)
        pipe.execute()


def defer_summary_delta(project_id: int, organization_id: Optional[int], delta: SummaryDelta) -> None:
    """Park the delta in Redis and make sure one job per project applies it."""
    redis = _get_redis_connection()
    if redis is not None:
        try:
            _store_pending_delta(redis, project_id, delta)
        except Exception:
            logger.warning('Failed to store project summary delta in Redis', exc_info=True)
            redis = None
    if redis is None:
        # no place to park it: wait for the row as the legacy path did
        apply_delta(project_id, delta)
        return
    enqueue_pending_summary_deltas(project_id, organization_id)


def enqueue_pending_summary_deltas(project_id: int, organization_id: Optional[int]) -> None:
    from core.redis import start_job_async_or_sync

    def do_enqueue() -> None:
        start_job_async_or_sync(
            apply_pending_summary_deltas,
            project_id,
            organization_id,
            queue_name='low',
            on_failure=_release_slot_on_failure,
            job_tenant=organization_id,
        )

    enqueue_with_deduplication(keys=_keys(project_id), do_enqueue=do_enqueue)


def _drain_pending_delta(redis, project_id: int) -> SummaryDelta:
    key = _pending_delta_key(project_id)
    # MULTI/EXEC makes read-and-delete atomic, so a retried job cannot apply the same decrement twice
    with redis.pipeline(transaction=True) as pipe:
        pipe.hgetall(key)
        pipe.delete(key)
        raw, _ = pipe.execute()
    return SummaryDelta.from_redis_fields(raw or {})


def apply_pending_summary_deltas(project_id: int, organization_id: Optional[int] = None) -> None:
    """RQ job: apply every decrement parked for the project since the last run."""
    with deduplicated_worker_run(
        keys=_keys(project_id),
        enqueue_followup=lambda: enqueue_pending_summary_deltas(project_id, organization_id),
    ):
        redis = _get_redis_connection()
        if redis is None:
            return
        delta = _drain_pending_delta(redis, project_id)
        if delta.is_empty():
            return
        try:
            apply_delta(project_id, delta)
        except Exception:
            # the drain already removed it from Redis; put it back so a retry does not lose it
            try:
                _store_pending_delta(redis, project_id, delta)
            except Exception:
                logger.error('Lost project summary delta for project_id=%s', project_id, exc_info=True)
            raise


def _release_slot_on_failure(job, connection, exc_type, exc_value, traceback) -> None:
    try:
        project_id, organization_id = job.args[0], (job.args[1] if len(job.args) > 1 else None)
    except Exception:
        logger.exception('project summary delta on_failure: could not read project_id from job %r', job)
        return
    release_deduplication_slot(
        connection=connection,
        keys=_keys(project_id),
        enqueue_followup=lambda: enqueue_pending_summary_deltas(project_id, organization_id),
    )


# =========== TASK STATES AFTER DELETE ===========


def _tasks_states_keys(project_id: int) -> DeduplicationKeys:
    return DeduplicationKeys(namespace='project_tasks_states_after_delete', target=str(project_id))


def schedule_tasks_states_after_delete(project_id: int, organization_id: Optional[int]) -> None:
    """One tasks-states update per project for a burst of task deletes, started after commit."""
    transaction.on_commit(lambda: enqueue_tasks_states_after_delete(project_id, organization_id), robust=True)


def enqueue_tasks_states_after_delete(project_id: int, organization_id: Optional[int]) -> None:
    from core.redis import start_job_async_or_sync

    def do_enqueue() -> None:
        start_job_async_or_sync(
            update_tasks_states_after_delete,
            project_id,
            organization_id,
            on_failure=_release_tasks_states_slot_on_failure,
            job_tenant=organization_id,
        )

    enqueue_with_deduplication(keys=_tasks_states_keys(project_id), do_enqueue=do_enqueue)


def update_tasks_states_after_delete(project_id: int, organization_id: Optional[int] = None) -> None:
    from projects.models import Project

    with deduplicated_worker_run(
        keys=_tasks_states_keys(project_id),
        enqueue_followup=lambda: enqueue_tasks_states_after_delete(project_id, organization_id),
    ):
        project = Project.objects.filter(id=project_id).first()
        if project is None:
            return
        project._update_tasks_states(
            maximum_annotations_changed=False,
            overlap_cohort_percentage_changed=False,
            tasks_number_changed=True,
        )


def _release_tasks_states_slot_on_failure(job, connection, exc_type, exc_value, traceback) -> None:
    try:
        project_id, organization_id = job.args[0], (job.args[1] if len(job.args) > 1 else None)
    except Exception:
        logger.exception('tasks states on_failure: could not read project_id from job %r', job)
        return
    release_deduplication_slot(
        connection=connection,
        keys=_tasks_states_keys(project_id),
        enqueue_followup=lambda: enqueue_tasks_states_after_delete(project_id, organization_id),
    )

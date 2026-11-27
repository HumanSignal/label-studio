"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

# Two-key Redis deduplication primitive for RQ-based async jobs.
#
# Use this when a burst of signals (e.g. many annotations saved on the same task
# in quick succession) would otherwise enqueue N independent jobs doing the same
# logical work, racing each other to write the same rows. Classic consequences
# are UniqueViolation, ForeignKeyViolation, and lost updates.
#
# Naming note: although we call this "deduplication" for team clarity, the
# mechanism is stricter than classic dedup. Duplicate enqueues are NOT silently
# dropped — a follow-up key captures them, and the in-flight job's completion
# hook enqueues exactly one follow-up job to cover every signal that arrived
# during execution. See the "No-data-loss invariant" section below.
#
# Design
# ------
# For each logical deduplication target (e.g. (task_id, trigger)), we maintain
# two Redis keys, both with a safety TTL:
#
#   * running_key  — set atomically via SET NX when a job is enqueued. Released
#                    when the worker finishes (success or failure). Concurrency
#                    guard: at most one in-flight job per target.
#
#   * pending_key  — sticky flag set by any enqueue attempt that loses the NX
#                    race. Means "at least one signal arrived while a job was
#                    already in flight". Checked and cleared by the worker at
#                    completion; if it was set, exactly one follow-up job is
#                    enqueued.
#
# No-data-loss invariant
# ----------------------
# Every signal whose DB state must be reflected in the precomputed output is
# guaranteed to be processed by either:
#   (a) the currently-running job, if its SELECTs see the signal's commit, OR
#   (b) the follow-up job enqueued at the current job's completion, because
#       the signal arrived too late for (a) and set the pending flag.
#
# The invariant holds because the worker-side wrapper clears pending_key BEFORE
# reading any DB state:
#
#     worker start:
#         DEL pending_key                    <-- boundary
#         SELECT ... (reads everything committed up to now)
#         ... does work ...
#     worker finish:
#         DEL running_key
#         if DEL pending_key returned 1: enqueue follow-up
#
# Any signal committed before the DEL boundary is visible to this job's
# SELECTs. Any signal committed after the DEL boundary sets pending_key again,
# so the follow-up DEL at completion returns 1 and a follow-up is enqueued.
# There is no third timing — it's a strict before-or-after with no silent drop.
#
# Degraded mode
# -------------
# If Redis is unavailable, enqueues fall through to the underlying do_enqueue
# callable with no deduplication, and the worker-side wrapper is a no-op. The
# system continues to work correctly (just with more duplicate work under
# bursts).
#

import logging
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Callable, Iterator, Optional

from core.redis import redis_connected
from django_rq import get_connection

logger = logging.getLogger(__name__)


# Safety TTL for both deduplication keys. Should be comfortably longer than the
# maximum plausible job runtime (including RQ retries); short enough to recover
# the slot quickly if a worker crashes before releasing the keys.
DEFAULT_DEDUPLICATION_TTL_SECONDS = 3900  # 1h + 300s buffer


@dataclass(frozen=True)
class DeduplicationKeys:
    """Standard Redis key pair for the two-key deduplication pattern.

    Every caller of this primitive constructs one of these and passes it to
    ``enqueue_with_deduplication`` / ``deduplicated_worker_run`` /
    ``release_deduplication_slot``. Centralising the key-format here keeps the
    naming convention (``<namespace>:running:<target>`` and
    ``<namespace>:pending:<target>``) identical across every job type using
    this primitive, so that debugging via ``redis-cli KEYS '<namespace>:*'``
    always returns the same shape.

    Args:
        namespace: Stable prefix identifying the class of work being
            deduplicated. Example: ``"lse:dim_recompute"`` for Agreement V2
            dimension recomputes. Should not change across deploys for a
            given job type — an in-flight job that was enqueued under one
            namespace cannot release a slot under another.
        target: Stable identifier of the specific deduplication target
            within the namespace. Example: ``f"{task_id}:{trigger.value}"``
            for dimension recomputes. Two enqueues with the same
            (namespace, target) pair coalesce; different targets run
            independently.
    """

    namespace: str
    target: str

    @property
    def running(self) -> str:
        """Redis key held for the duration of a pending-or-running job."""
        return f'{self.namespace}:running:{self.target}'

    @property
    def pending(self) -> str:
        """Redis key set when an enqueue was skipped because a job was
        already in flight. Checked at job completion to decide whether to
        fire a follow-up."""
        return f'{self.namespace}:pending:{self.target}'


def _get_redis_connection():
    """Return a live Redis connection, or ``None`` if Redis is unavailable.

    Callers MUST handle the ``None`` case by falling through to un-deduplicated
    behavior, so that correctness is preserved when Redis is down.
    """
    if not redis_connected():
        return None
    try:
        return get_connection()
    except Exception:
        logger.warning('Failed to obtain Redis connection for job deduplication', exc_info=True)
        return None


def enqueue_with_deduplication(
    *,
    keys: DeduplicationKeys,
    do_enqueue: Callable[[], None],
    ttl_seconds: int = DEFAULT_DEDUPLICATION_TTL_SECONDS,
) -> bool:
    """Enqueue a job for ``keys``, or mark the target as pending if a job for
    that key-pair is already in flight.

    Intended call site: inside a ``transaction.on_commit`` hook in a signal
    handler, wrapping an ``rq`` enqueue.

    Behavior:

    * If ``keys.running`` is free, acquire it atomically (``SET NX EX``) and
      invoke ``do_enqueue()`` exactly once.
    * If ``keys.running`` is held, set ``keys.pending`` (also with TTL). The
      currently-running job's completion hook will see ``keys.pending`` and
      enqueue exactly one follow-up job — so this caller's state change is
      not lost.
    * If Redis is unavailable, invoke ``do_enqueue()`` unconditionally (no
      deduplication, but correctness preserved).

    Args:
        keys: Redis key pair for this deduplication target. See
            ``DeduplicationKeys`` for the naming convention.
        do_enqueue: Zero-arg callable that performs the actual enqueue —
            typically a lambda wrapping ``start_job_async_or_sync``. Invoked
            exactly once when the slot is acquired; never invoked when the
            slot is held. The caller controls any enqueue-time options here,
            including delayed enqueue via ``in_seconds=...``.
        ttl_seconds: Safety TTL applied to both keys.

    Returns:
        True if a new job was enqueued (slot acquired), False if this enqueue
        was deduplicated into the pending flag. Useful for metrics; not
        required for correctness.
    """
    redis = _get_redis_connection()
    if redis is None:
        do_enqueue()
        return True

    try:
        acquired = bool(redis.set(keys.running, 1, nx=True, ex=ttl_seconds))
    except Exception:
        logger.warning(
            'Redis SET NX failed for job deduplication; falling through to direct enqueue',
            exc_info=True,
        )
        do_enqueue()
        return True

    if acquired:
        do_enqueue()
        return True

    try:
        redis.set(keys.pending, 1, ex=ttl_seconds)
    except Exception:
        logger.warning(
            'Redis SET of pending_key failed; a signal may be lost unless another enqueue lands',
            exc_info=True,
        )
    return False


def release_deduplication_slot(
    *,
    connection,
    keys: DeduplicationKeys,
    enqueue_followup: Optional[Callable[[], None]] = None,
) -> bool:
    """Release a deduplication slot: DEL ``keys.running``, check / DEL
    ``keys.pending``, fire ``enqueue_followup`` if pending was set.

    This is the shared cleanup path used in two places:

    * ``deduplicated_worker_run``'s ``finally`` (normal completion of the
      wrapped job — success or exception).
    * An RQ ``on_failure`` callback (invoked when the worker dies without
      running ``finally`` and the abandoned job is later reaped by RQ's
      cleanup on another worker).

    Both paths may run for the same job — the normal one from the worker
    that ran the job, then ``on_failure`` either on the same worker (for
    exceptions) or on another worker (for crashes). That is fine: the
    operations are **idempotent**:

    * ``DEL`` on an already-cleared key is a no-op (returns 0).
    * ``was_pending`` will be False on the second pass, so ``enqueue_followup``
      runs at most once per lost-or-completed job.

    This helper NEVER raises. It's intended to be called from a ``finally``
    block where a raised exception would clobber the user's original
    exception, and from an ``on_failure`` callback where RQ does not expect
    another failure.

    Args:
        connection: Redis-like connection. Callers that already have one (e.g.
            RQ's ``on_failure`` callback) should pass it through; other
            callers can pass the result of ``_get_redis_connection()``.
        keys: same key pair used by ``enqueue_with_deduplication``.
        enqueue_followup: zero-arg callable that re-enqueues the same logical
            job. Called at most once, only if ``keys.pending`` was set when
            we arrived. ``None`` disables the follow-up (cleanup-only mode).

    Returns:
        ``True`` if ``keys.pending`` was set (and ``enqueue_followup``, if
        provided, was invoked). ``False`` if no follow-up was needed.
    """
    try:
        connection.delete(keys.running)
    except Exception:
        logger.warning(
            'Failed to release running_key during cleanup; slot recovers on TTL expiry',
            exc_info=True,
        )

    was_pending = False
    try:
        was_pending = bool(connection.delete(keys.pending))
    except Exception:
        logger.warning(
            'Failed to check pending_key during cleanup; skipping follow-up enqueue',
            exc_info=True,
        )

    if was_pending and enqueue_followup is not None:
        try:
            enqueue_followup()
        except Exception:
            # Log for Sentry but do NOT re-raise. Called from `finally` or
            # from an RQ `on_failure` callback — raising from either context
            # would suppress the user's original exception or trigger RQ
            # failure cascades.
            logger.exception('Failed to enqueue follow-up job during deduplication slot release')

    return was_pending


@contextmanager
def deduplicated_worker_run(
    *,
    keys: DeduplicationKeys,
    enqueue_followup: Callable[[], None],
) -> Iterator[None]:
    """Worker-side context manager for a deduplicated job. Wrap the body of the
    RQ job function with this.

    On entry:
        Clears ``keys.pending``. This is the boundary that declares "every
        signal committed before now is my responsibility to reflect in the
        output". It MUST happen before the body reads any DB state.

    On exit (both success and failure):
        1. Releases ``keys.running`` so new enqueues can acquire it.
        2. Atomically ``DEL``s ``keys.pending``. If that returned 1, at least
           one signal arrived after our boundary and before we finished — we
           enqueue exactly one follow-up job to process it.

    If Redis is unavailable, this context manager is a no-op: the body runs
    once with no deduplication bookkeeping.

    Exception handling:
        The wrapped body's exceptions propagate out of the ``with`` block as
        normal. We still release ``keys.running`` and still check / enqueue
        the follow-up in ``finally``:

        * Failing forever to release ``keys.running`` would block all future
          recomputes until TTL expiry.
        * If a signal arrived during our (failed) run, it still deserves a
          chance at a clean retry. The follow-up won't inherit our failure
          unless the failure is deterministic, in which case RQ retry and
          Sentry will surface it loudly rather than silently dropping work.

    Args:
        keys: same key pair that ``enqueue_with_deduplication`` used.
        enqueue_followup: zero-arg callable that re-enqueues the SAME logical
            job for the SAME target. Called at most once per ``with`` block,
            only if a signal landed during execution.
    """
    redis = _get_redis_connection()
    if redis is None:
        yield
        return

    try:
        redis.delete(keys.pending)
    except Exception:
        # Soft failure: we cannot drop anything, but may end up enqueuing a
        # needless follow-up. Log and proceed.
        logger.warning(
            'Failed to clear pending_key at worker start; may cause a spurious follow-up',
            exc_info=True,
        )

    try:
        yield
    finally:
        # Delegate to release_deduplication_slot — same cleanup used by the
        # RQ on_failure callback. That helper is guaranteed not to raise,
        # so the user's original exception (if any) from `yield` propagates
        # out of the `with` block unchanged.
        release_deduplication_slot(
            connection=redis,
            keys=keys,
            enqueue_followup=enqueue_followup,
        )

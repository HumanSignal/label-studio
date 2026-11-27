"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

"""Unit tests for core.job_deduplication (two-key Redis deduplication primitive).

These are pure unit tests — no DB, no real Redis, no RQ workers. We mock
``redis_connected`` and ``get_connection`` at the module boundary so every
branch of the deduplication logic can be exercised deterministically.

What we can unit-test:
    * The branching of ``enqueue_with_deduplication`` (slot free / held / Redis down / Redis raises).
    * ``release_deduplication_slot`` idempotency, exception-swallowing, and follow-up firing.
    * ``deduplicated_worker_run`` context-manager semantics, especially that
      exceptions from the wrapped body propagate even when the cleanup
      itself encounters Redis failures. This is the regression test for the
      return-in-finally bug.
    * ``DeduplicationKeys`` format invariants (namespace / running / pending shape).

What we cannot unit-test here (requires integration / real RQ):
    * Actual RQ ``on_failure`` reap timing.
    * Real Redis ``SET NX EX`` atomicity under concurrent writers.
    * Cross-worker serialization of the callback.

Those are covered elsewhere (or not at all — live-fire observability is how
we catch them).
"""

from unittest.mock import MagicMock, patch

import pytest
from core.job_deduplication import DeduplicationKeys

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


# Shared canonical keys used across the suite. Any namespace/target would work —
# we pick stable strings so assertions can compare against `KEYS.running` /
# `KEYS.pending` without re-deriving the format in every test.
KEYS = DeduplicationKeys(namespace='ns', target='t')


class _FakeRedis:
    """Minimal stand-in for a Redis client. Tracks calls so tests can assert on them.

    Only implements .set() and .delete() with the semantics the primitive uses
    (NX behavior + return values matching redis-py).
    """

    def __init__(self):
        self._store: dict = {}
        self.calls: list[tuple[str, tuple, dict]] = []

    def set(self, key, value, nx: bool = False, ex: int | None = None):
        self.calls.append(('set', (key, value), {'nx': nx, 'ex': ex}))
        if nx and key in self._store:
            return None  # redis-py returns None when NX fails
        self._store[key] = value
        return True

    def delete(self, key):
        self.calls.append(('delete', (key,), {}))
        existed = key in self._store
        self._store.pop(key, None)
        return 1 if existed else 0


@pytest.fixture
def fake_redis():
    """Patch both _get_redis_connection returns and the underlying helpers so
    every code path uses the same fake client instance.
    """
    fake = _FakeRedis()
    # Patch at the module boundary where the primitive resolves the connection.
    with patch('core.job_deduplication._get_redis_connection', return_value=fake):
        yield fake


@pytest.fixture
def no_redis():
    with patch('core.job_deduplication._get_redis_connection', return_value=None):
        yield


# ---------------------------------------------------------------------------
# DeduplicationKeys
# ---------------------------------------------------------------------------


class TestDeduplicationKeys:
    def test_key_format(self):
        """Every caller relies on this exact format — DO NOT change without
        considering in-flight jobs on the old format."""
        k = DeduplicationKeys(namespace='lse:dim_recompute', target='42:annotation')
        assert k.running == 'lse:dim_recompute:running:42:annotation'
        assert k.pending == 'lse:dim_recompute:pending:42:annotation'

    def test_frozen(self):
        """Immutable so callers can't accidentally mutate mid-function."""
        k = DeduplicationKeys(namespace='a', target='b')
        with pytest.raises(Exception):
            k.namespace = 'mutated'  # type: ignore[misc]

    def test_different_targets_distinct_keys(self):
        """Same namespace, different targets → disjoint slots."""
        a = DeduplicationKeys(namespace='ns', target='1')
        b = DeduplicationKeys(namespace='ns', target='2')
        assert a.running != b.running
        assert a.pending != b.pending


# ---------------------------------------------------------------------------
# enqueue_with_deduplication
# ---------------------------------------------------------------------------


class TestEnqueueWithDeduplication:
    def test_redis_unavailable_falls_through(self, no_redis):
        """When Redis is down, do_enqueue must still fire so we don't silently
        drop jobs. Deduplication degrades to un-deduplicated enqueue."""
        from core.job_deduplication import enqueue_with_deduplication

        called = []
        result = enqueue_with_deduplication(
            keys=KEYS,
            do_enqueue=lambda: called.append(True),
        )
        assert called == [True]
        assert result is True

    def test_slot_free_acquires_and_enqueues(self, fake_redis):
        """Happy path: SET NX succeeds, do_enqueue is called exactly once,
        pending_key is NEVER set on this code path (otherwise we'd double-fire)."""
        from core.job_deduplication import enqueue_with_deduplication

        called = []
        result = enqueue_with_deduplication(
            keys=KEYS,
            do_enqueue=lambda: called.append(True),
            ttl_seconds=123,
        )

        assert called == [True]
        assert result is True
        # Exactly one set call (NX on running_key); no pending set.
        assert len(fake_redis.calls) == 1
        assert fake_redis.calls[0] == ('set', (KEYS.running, 1), {'nx': True, 'ex': 123})

    def test_slot_held_sets_pending_and_skips_enqueue(self, fake_redis):
        """Deduplication behavior: when running_key is held, we mark pending and
        do NOT invoke do_enqueue. This is what prevents duplicate racing jobs."""
        from core.job_deduplication import enqueue_with_deduplication

        # Pre-populate running_key so NX fails.
        fake_redis._store[KEYS.running] = 1

        called = []
        result = enqueue_with_deduplication(
            keys=KEYS,
            do_enqueue=lambda: called.append(True),
            ttl_seconds=123,
        )

        assert called == [], 'do_enqueue must not fire when slot is held'
        assert result is False
        # First op is the (failed) NX; second is the pending SET.
        ops = [c for c in fake_redis.calls if c[0] == 'set']
        assert ops[0] == ('set', (KEYS.running, 1), {'nx': True, 'ex': 123})
        assert ops[1] == ('set', (KEYS.pending, 1), {'nx': False, 'ex': 123})
        assert fake_redis._store.get(KEYS.pending) == 1

    def test_set_nx_raises_falls_through(self, fake_redis):
        """If Redis SET NX raises, prefer correctness (un-deduplicated enqueue)
        over silent loss. Warning is logged but not asserted here."""
        from core.job_deduplication import enqueue_with_deduplication

        fake_redis.set = MagicMock(side_effect=ConnectionError('redis down'))

        called = []
        result = enqueue_with_deduplication(
            keys=KEYS,
            do_enqueue=lambda: called.append(True),
        )
        assert called == [True]
        assert result is True

    def test_pending_set_raises_does_not_propagate(self, fake_redis):
        """If the SET pending_key op fails, we log and return False — must not
        raise out to the signal handler."""
        from core.job_deduplication import enqueue_with_deduplication

        fake_redis._store[KEYS.running] = 1  # force NX fail

        # Real set for NX, raise for pending.
        real_set = fake_redis.set
        call_count = {'n': 0}

        def set_spy(*args, **kwargs):
            call_count['n'] += 1
            if call_count['n'] == 1:
                return real_set(*args, **kwargs)  # NX path
            raise ConnectionError('pending set failed')

        fake_redis.set = set_spy

        called = []
        result = enqueue_with_deduplication(
            keys=KEYS,
            do_enqueue=lambda: called.append(True),
        )
        assert called == []
        assert result is False


# ---------------------------------------------------------------------------
# release_deduplication_slot
# ---------------------------------------------------------------------------


class TestReleaseDeduplicationSlot:
    def test_no_pending_no_followup(self, fake_redis):
        """When nothing was pending, follow-up must not fire."""
        from core.job_deduplication import release_deduplication_slot

        fake_redis._store[KEYS.running] = 1  # running held
        # pending not set

        followup_calls = []
        result = release_deduplication_slot(
            connection=fake_redis,
            keys=KEYS,
            enqueue_followup=lambda: followup_calls.append(True),
        )
        assert result is False
        assert followup_calls == []
        assert KEYS.running not in fake_redis._store  # running cleared

    def test_pending_set_fires_followup_exactly_once(self, fake_redis):
        from core.job_deduplication import release_deduplication_slot

        fake_redis._store[KEYS.running] = 1
        fake_redis._store[KEYS.pending] = 1

        followup_calls = []
        result = release_deduplication_slot(
            connection=fake_redis,
            keys=KEYS,
            enqueue_followup=lambda: followup_calls.append(True),
        )
        assert result is True
        assert followup_calls == [True]
        assert KEYS.pending not in fake_redis._store

    def test_idempotent_second_call_no_followup(self, fake_redis):
        """Calling release twice for the same job (e.g. finally + on_failure
        for the exception case) must fire the follow-up at most once."""
        from core.job_deduplication import release_deduplication_slot

        fake_redis._store[KEYS.running] = 1
        fake_redis._store[KEYS.pending] = 1

        fires = []

        def _fu():
            fires.append(True)

        # First call: fires follow-up.
        release_deduplication_slot(connection=fake_redis, keys=KEYS, enqueue_followup=_fu)
        # Second call: keys already cleared, must NOT fire again.
        result2 = release_deduplication_slot(connection=fake_redis, keys=KEYS, enqueue_followup=_fu)

        assert fires == [True], 'follow-up must fire exactly once across idempotent calls'
        assert result2 is False

    def test_no_followup_callable_still_clears_keys(self, fake_redis):
        """enqueue_followup=None is valid (cleanup-only mode used from
        on_failure when we only want to release the slot)."""
        from core.job_deduplication import release_deduplication_slot

        fake_redis._store[KEYS.running] = 1
        fake_redis._store[KEYS.pending] = 1

        result = release_deduplication_slot(
            connection=fake_redis,
            keys=KEYS,
            enqueue_followup=None,
        )
        assert result is True
        assert KEYS.running not in fake_redis._store
        assert KEYS.pending not in fake_redis._store

    def test_delete_running_raises_does_not_propagate(self, fake_redis):
        """If DEL running_key raises, the helper must continue to check pending
        and not propagate. Otherwise a Redis blip would crash the worker."""
        from core.job_deduplication import release_deduplication_slot

        fake_redis._store[KEYS.pending] = 1

        def _delete(key):
            if key == KEYS.running:
                raise ConnectionError('boom')
            existed = key in fake_redis._store
            fake_redis._store.pop(key, None)
            return 1 if existed else 0

        fake_redis.delete = _delete

        fires = []
        # Must NOT raise.
        result = release_deduplication_slot(
            connection=fake_redis,
            keys=KEYS,
            enqueue_followup=lambda: fires.append(True),
        )
        # pending was set so follow-up still fires even though running DEL failed.
        assert result is True
        assert fires == [True]

    def test_delete_pending_raises_skips_followup(self, fake_redis):
        """If we can't check pending, we don't know whether a follow-up is
        needed — err on the side of not firing (a future signal will kick one)."""
        from core.job_deduplication import release_deduplication_slot

        def _delete(key):
            if key == KEYS.pending:
                raise ConnectionError('boom')
            return 0

        fake_redis.delete = _delete

        fires = []
        result = release_deduplication_slot(
            connection=fake_redis,
            keys=KEYS,
            enqueue_followup=lambda: fires.append(True),
        )
        assert result is False
        assert fires == []

    def test_followup_raises_is_swallowed(self, fake_redis):
        """The callback must not propagate — it's called from a finally block
        (and from RQ's on_failure). Raising would clobber the user's exception
        or trigger an RQ failure cascade."""
        from core.job_deduplication import release_deduplication_slot

        fake_redis._store[KEYS.running] = 1
        fake_redis._store[KEYS.pending] = 1

        def _raising_followup():
            raise RuntimeError('oops')

        # Must NOT raise.
        result = release_deduplication_slot(
            connection=fake_redis,
            keys=KEYS,
            enqueue_followup=_raising_followup,
        )
        assert result is True  # pending WAS set even though the callback threw


# ---------------------------------------------------------------------------
# deduplicated_worker_run
# ---------------------------------------------------------------------------


class TestDeduplicatedWorkerRun:
    def test_redis_unavailable_yields_noop(self, no_redis):
        """When Redis is down, the context manager yields and does nothing
        else. The wrapped body runs with no deduplication bookkeeping."""
        from core.job_deduplication import deduplicated_worker_run

        fires = []

        with deduplicated_worker_run(
            keys=KEYS,
            enqueue_followup=lambda: fires.append(True),
        ):
            pass

        assert fires == []

    def test_happy_path_clears_pending_at_start_and_releases_at_end(self, fake_redis):
        """On entry, pending_key is DELed (the boundary). On exit, running_key
        is DELed. No follow-up when pending wasn't set."""
        from core.job_deduplication import deduplicated_worker_run

        fake_redis._store[KEYS.running] = 1  # running held (acquired at enqueue time)

        # Sanity: no pending at start.
        assert KEYS.pending not in fake_redis._store

        entered = []
        fires = []
        with deduplicated_worker_run(
            keys=KEYS,
            enqueue_followup=lambda: fires.append(True),
        ):
            entered.append(True)
            # Inside the body: pending has been cleared already.
            assert any(c[0] == 'delete' and c[1] == (KEYS.pending,) for c in fake_redis.calls), (
                'pending_key must be cleared BEFORE the body executes'
            )

        assert entered == [True]
        assert fires == []
        assert KEYS.running not in fake_redis._store

    def test_pending_set_during_body_fires_followup(self, fake_redis):
        """Signal arrives mid-job: pending_key gets set during the body; at
        exit we see it and enqueue a follow-up."""
        from core.job_deduplication import deduplicated_worker_run

        fake_redis._store[KEYS.running] = 1

        fires = []
        with deduplicated_worker_run(
            keys=KEYS,
            enqueue_followup=lambda: fires.append(True),
        ):
            # Simulate a concurrent signal setting pending_key mid-job.
            fake_redis._store[KEYS.pending] = 1

        assert fires == [True]

    def test_exception_in_body_propagates_and_cleanup_runs(self, fake_redis):
        """REGRESSION: the wrapped body's exception must propagate out of the
        ``with`` block AND cleanup must still run in ``finally``. This was the
        return-in-finally bug.

        Pending is set mid-body (simulating a concurrent signal arriving while
        the job runs), so the exception path must still fire the follow-up on
        exit — otherwise a failing job would silently drop any signal that
        arrived during its execution."""
        from core.job_deduplication import deduplicated_worker_run

        fake_redis._store[KEYS.running] = 1

        fires = []

        with pytest.raises(ValueError, match='job failed'):
            with deduplicated_worker_run(
                keys=KEYS,
                enqueue_followup=lambda: fires.append(True),
            ):
                # Concurrent signal lands mid-job (after the entry DEL, before the raise).
                fake_redis._store[KEYS.pending] = 1
                raise ValueError('job failed')

        # Both keys cleared and follow-up fired, even though the body raised.
        assert KEYS.running not in fake_redis._store
        assert KEYS.pending not in fake_redis._store
        assert fires == [True]

    def test_exception_propagates_even_when_cleanup_redis_also_fails(self, fake_redis):
        """Worst case: wrapped body raises AND a Redis DEL during cleanup also
        raises. The user's exception MUST still propagate — it must not be
        suppressed by cleanup errors."""
        from core.job_deduplication import deduplicated_worker_run

        fake_redis._store[KEYS.running] = 1

        # Break delete entirely.
        fake_redis.delete = MagicMock(side_effect=ConnectionError('redis ded'))

        with pytest.raises(ValueError, match='original'):
            with deduplicated_worker_run(
                keys=KEYS,
                enqueue_followup=lambda: None,
            ):
                raise ValueError('original')

    def test_followup_raising_does_not_mask_body_exception(self, fake_redis):
        """If both the body AND the follow-up enqueue raise, the body's
        exception wins — the follow-up failure is only logged."""
        from core.job_deduplication import deduplicated_worker_run

        fake_redis._store[KEYS.running] = 1

        def _raising_followup():
            raise RuntimeError('followup boom')

        with pytest.raises(ValueError, match='body boom'):
            with deduplicated_worker_run(
                keys=KEYS,
                enqueue_followup=_raising_followup,
            ):
                fake_redis._store[KEYS.pending] = 1  # concurrent signal -> follow-up will be attempted
                raise ValueError('body boom')

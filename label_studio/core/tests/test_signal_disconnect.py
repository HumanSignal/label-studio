"""Regression tests for ``temporary_disconnect_all_signals`` (FIT-2368).

Django caches resolved receivers per sender in ``Signal.sender_receivers_cache``.
``temporary_disconnect_all_signals`` mutates ``signal.receivers`` directly instead of
going through ``Signal.connect``/``disconnect`` (which clear that cache), so it must
invalidate the cache itself. Otherwise a ``signal.send(sender=...)`` during the
disconnected window caches an empty receiver list for that sender that survives the
"reconnect", permanently silencing the signal for that sender in the process.
"""

from core.utils.common import temporary_disconnect_all_signals
from django.dispatch import Signal


class _Sender:
    pass


def test_temporary_disconnect_all_signals_does_not_poison_sender_cache():
    # ``use_caching=True`` mirrors Django's ModelSignal (post_save/pre_delete/...).
    signal = Signal(use_caching=True)
    received = []

    def receiver(sender, **kwargs):
        received.append(sender)

    signal.connect(receiver, sender=_Sender, dispatch_uid='regression_receiver')

    with temporary_disconnect_all_signals(disabled_signals=[signal]):
        # A send while disconnected must not permanently cache an empty receiver list
        # for this sender (this is what fired for cascade-deleted ProjectRole rows).
        signal.send(sender=_Sender)

    assert received == []  # nothing fired while disconnected

    # After reconnect the receiver must fire again for the same sender.
    signal.send(sender=_Sender)
    assert received == [_Sender]


def test_temporary_disconnect_all_signals_restores_receivers():
    signal = Signal(use_caching=True)
    received = []

    def receiver(sender, **kwargs):
        received.append(sender)

    signal.connect(receiver, sender=_Sender, dispatch_uid='regression_receiver_restore')

    with temporary_disconnect_all_signals(disabled_signals=[signal]):
        assert signal.receivers == []

    signal.send(sender=_Sender)
    assert received == [_Sender]

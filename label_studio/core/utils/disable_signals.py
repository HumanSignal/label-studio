from collections import defaultdict
from django.db.models.signals import (
    pre_init,
    post_init,
    pre_save,
    post_save,
    pre_delete,
    post_delete,
    pre_migrate,
    post_migrate,
)


class DisableSignals(object):
    def __init__(self, disabled_signals=None):
        self.stashed_signals = defaultdict(list)
        self.disabled_signals = disabled_signals or [
            pre_init,
            post_init,
            pre_save,
            post_save,
            pre_delete,
            post_delete,
            pre_migrate,
            post_migrate,
        ]

    def __enter__(self):
        for signal in self.disabled_signals:
            self.disconnect(signal)

    def __exit__(self, exc_type, exc_val, exc_tb):
        for signal in list(self.stashed_signals):
            self.reconnect(signal)

    def disconnect(self, signal):
        self.stashed_signals[signal] = signal.receivers
        signal.receivers = []

    def reconnect(self, signal):
        signal.receivers = self.stashed_signals.get(signal, [])
        del self.stashed_signals[signal]

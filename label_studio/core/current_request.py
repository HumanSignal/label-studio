from threading import local
from typing import Any

from django.core.signals import request_finished
from django.dispatch import receiver
from django.middleware.common import CommonMiddleware

_thread_locals = local()


class CurrentContext:
    @classmethod
    def set(cls, key: str, value: Any, shared: bool = True) -> None:
        if not hasattr(_thread_locals, 'data'):
            _thread_locals.data = {}
        if not hasattr(_thread_locals, 'job_data'):
            _thread_locals.job_data = {}

        if shared:
            _thread_locals.job_data[key] = value
        else:
            _thread_locals.data[key] = value

    @classmethod
    def get(cls, key: str, default=None):
        return getattr(_thread_locals, 'job_data', {}).get(key, getattr(_thread_locals, 'data', {}).get(key, default))

    @classmethod
    def set_request(cls, request):
        _thread_locals.request = request
        if request.user:
            cls.set_user(request.user)

    @classmethod
    def get_organization_id(cls):
        return cls.get('organization_id')

    @classmethod
    def set_organization_id(cls, organization_id: int):
        cls.set('organization_id', organization_id)

    @classmethod
    def get_user(cls):
        return cls.get('user')

    @classmethod
    def set_user(cls, user):
        cls.set('user', user)
        if getattr(user, 'active_organization_id', None):
            cls.set_organization_id(user.active_organization_id)

    @classmethod
    def set_fsm_disabled(cls, disabled: bool):
        """
        Temporarily disable/enable FSM for the current thread.

        This is useful for test cleanup and bulk operations where FSM state
        tracking is not needed and would cause performance issues.

        Args:
            disabled: True to disable FSM, False to enable it
        """
        cls.set('fsm_disabled', disabled)

    @classmethod
    def is_fsm_disabled(cls) -> bool:
        """
        Check if FSM is disabled for the current thread.

        Returns:
            True if FSM is disabled, False otherwise
        """
        return cls.get('fsm_disabled', False)

    @classmethod
    def get_job_data(cls) -> dict:
        """
        This data will be shared to jobs spawned by the current thread.
        """
        return getattr(_thread_locals, 'job_data', {})

    @classmethod
    def clear(cls) -> None:
        if hasattr(_thread_locals, 'data'):
            delattr(_thread_locals, 'data')

        if hasattr(_thread_locals, 'job_data'):
            delattr(_thread_locals, 'job_data')

        if hasattr(_thread_locals, 'request'):
            del _thread_locals.request

    @classmethod
    def get_request(cls):
        return getattr(_thread_locals, 'request', None)


def get_current_request():
    """returns the request object for this thread"""
    result = CurrentContext.get_request()
    return result


class ThreadLocalMiddleware(CommonMiddleware):
    def process_request(self, request):
        CurrentContext.set_request(request)


@receiver(request_finished)
def clean_request(sender, **kwargs):
    CurrentContext.clear()

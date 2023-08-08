from threading import local
from django.middleware.common import CommonMiddleware
from django.core.signals import request_finished
from django.dispatch import receiver


_thread_locals = local()


def get_current_request():  # type: ignore[no-untyped-def]
    """ returns the request object for this thread """
    result = getattr(_thread_locals, "request", None)
    return result


class ThreadLocalMiddleware(CommonMiddleware):
    def process_request(self, request):  # type: ignore[no-untyped-def]
        _thread_locals.request = request


@receiver(request_finished)
def clean_request(sender, **kwargs):  # type: ignore[no-untyped-def]
    if hasattr(_thread_locals, 'request'):
        del _thread_locals.request

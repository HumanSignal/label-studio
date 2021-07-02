import logging
from functools import wraps

import requests
from django.conf import settings
from django.db import models
from django.db.models import Q

from .models import Webhook, WebhookAction


def run_webhook(webhook, action, payload=None):
    """Run one webhook for action.

    This function must not raise any exceptions.
    """
    data = {
        'action': action,
    }
    if webhook.send_payload and payload:
        data.update(payload)
    try:
        return requests.post(
            webhook.url,
            headers=webhook.headers,
            json=data,
            timeout=settings.WEBHOOK_TIMEOUT,
        )
    except requests.RequestException as exc:
        logging.error(exc, exc_info=True)
        return


def get_active_webhooks(organization, action):
    """Return all active webhooks for organization by action.
    """
    return Webhook.objects.filter(
        Q(organization=organization) &
        Q(is_active=True) &
        (
            Q(send_for_all_actions=True) |
            Q(id__in=WebhookAction.objects.filter(
                webhook__organization=organization,
                action=action
            ).values_list('webhook_id', flat=True))
        )
    )


def emit_webhooks(organization, action, payload):
    """Run all active webhooks for the action.
    """
    webhooks = get_active_webhooks(organization, action)
    for wh in webhooks:
        run_webhook(wh, action, payload)


def emit_webhooks_for_instanses(organization, action, instanses=None):
    """Run all active webhooks for the action using instanses as payload.

    Be sure WebhookAction.ACTIONS contains all required fields.
    """
    webhooks = get_active_webhooks(organization, action)
    if not webhooks.exists():
        return
    payload = None
    # if instanses and there is a webhook that sends payload
    # get serialized payload
    if instanses and webhooks.filter(send_payload=True).exists():
        serializer_class = WebhookAction.ACTIONS[action].get('serializer')
        if serializer_class:
            data = serializer_class(instance=instanses, many=True).data
            payload = {WebhookAction.ACTIONS[action]['key']: data}
    for wh in webhooks:
        run_webhook(wh, action, payload)


def api_webhook(action):
    """Decorator emit webhooks for APIView methods: post, put, patch.

    Used for simple Create/Update methods.
    The decorator expects authorized request and response with 'id' key in data.

    Example:
        ```
        @api_webhook(WebhookAction.PROJECT_UPDATED)
        def put(self, request, *args, **kwargs):
            return super(ProjectAPI, self).put(request, *args, **kwargs)
        ```
    """
    def decorator(func):
        @wraps(func)
        def wrap(self, request, *args, **kwargs):
            responce = func(self, request, *args, **kwargs)
            emit_webhooks_for_instanses(
                request.user.active_organization,
                action,
                [WebhookAction.ACTIONS[action]['model'].objects.get(id=responce.data.get('id'))]
            )
            return responce
        return wrap
    return decorator


def api_webhook_for_delete(action):
    """Decorator emit webhooks for APIView delete method.

    The decorator expects authorized request and use get_object() method 
    before delete.

    Example:
        ```
        @swagger_auto_schema(tags=['Annotations'])
        @api_webhook_for_delete(WebhookAction.ANNOTATION_DELETED)
        def delete(self, request, *args, **kwargs):
            return super(AnnotationAPI, self).delete(request, *args, **kwargs)
        ```
    """
    def decorator(func):
        @wraps(func)
        def wrap(self, request, *args, **kwargs):
            obj = {'id': self.get_object().pk}
            responce = func(self, request, *args, **kwargs)
            emit_webhooks_for_instanses(
                request.user.active_organization,
                action,
                [obj]
            )
            return responce
        return wrap
    return decorator

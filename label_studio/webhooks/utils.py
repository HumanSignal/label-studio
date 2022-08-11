import logging
from functools import wraps

import requests
from core.utils.common import load_func
from django.conf import settings
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
        logging.debug('Run webhook %s for action %s', webhook.id, action)
        return requests.post(
            webhook.url,
            headers=webhook.headers,
            json=data,
            timeout=settings.WEBHOOK_TIMEOUT,
        )
    except requests.RequestException as exc:
        logging.error(exc, exc_info=True)
        return


def get_active_webhooks(organization, project, action):
    """Return all active webhooks for organization or project by action.

    If project is None - function return only organization hooks
    else project is not None - function return project and organization hooks
    Organization hooks are global hooks.
    """
    action_meta = WebhookAction.ACTIONS[action]
    if project and action_meta.get('organization-only'):
        raise ValueError("There is no project webhooks for organization-only action")

    return Webhook.objects.filter(
        Q(organization=organization)
        & (Q(project=project) | Q(project=None))
        & Q(is_active=True)
        & (
            Q(send_for_all_actions=True)
            | Q(
                id__in=WebhookAction.objects.filter(webhook__organization=organization, action=action).values_list(
                    'webhook_id', flat=True
                )
            )
        )
    ).distinct()


def emit_webhooks(organization, project, action, payload):
    """Run all active webhooks for the action."""
    webhooks = get_active_webhooks(organization, project, action)
    if project and payload and webhooks.filter(send_payload=True).exists():
        payload['project'] = load_func(settings.WEBHOOK_SERIALIZERS['project'])(instance=project).data
    for wh in webhooks:
        run_webhook(wh, action, payload)


def emit_webhooks_for_instance(organization, project, action, instance=None):
    """Run all active webhooks for the action using instances as payload.

    Be sure WebhookAction.ACTIONS contains all required fields.
    """
    webhooks = get_active_webhooks(organization, project, action)
    if not webhooks.exists():
        return
    payload = {}
    # if instances and there is a webhook that sends payload
    # get serialized payload
    action_meta = WebhookAction.ACTIONS[action]
    if instance and webhooks.filter(send_payload=True).exists():
        serializer_class = action_meta.get('serializer')
        if serializer_class:
            payload[action_meta['key']] = serializer_class(instance=instance, many=action_meta['many']).data
        if project and payload:
            payload['project'] = load_func(settings.WEBHOOK_SERIALIZERS['project'])(instance=project).data
        if payload and 'nested-fields' in action_meta:
            for key, value in action_meta['nested-fields'].items():
                payload[key] = value['serializer'](
                    instance=get_nested_field(instance, value['field']), many=value['many']
                ).data
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

            action_meta = WebhookAction.ACTIONS[action]
            many = action_meta['many']
            instance = action_meta['model'].objects.get(id=responce.data.get('id'))
            if many:
                instance = [instance]
            project = None
            if 'project-field' in action_meta:
                project = get_nested_field(instance, action_meta['project-field'])
            emit_webhooks_for_instance(
                request.user.active_organization,
                project,
                action,
                instance,
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
        @api_webhook_for_delete(WebhookAction.ANNOTATIONS_DELETED)
        def delete(self, request, *args, **kwargs):
            return super(AnnotationAPI, self).delete(request, *args, **kwargs)
        ```
    """

    def decorator(func):
        @wraps(func)
        def wrap(self, request, *args, **kwargs):
            instance = self.get_object()
            action_meta = WebhookAction.ACTIONS[action]
            many = action_meta['many']
            project = None
            if 'project-field' in action_meta:
                project = get_nested_field(instance, action_meta['project-field'])

            obj = {'id': instance.pk}
            if many:
                obj = [obj]

            responce = func(self, request, *args, **kwargs)

            emit_webhooks_for_instance(request.user.active_organization, project, action, obj)
            return responce

        return wrap

    return decorator


def get_nested_field(value, field):
    """
    Get nested field from list of objects or single instance
    :param value: Single instance or list to look up field
    :param field: Field to lookup
    :return: List or single instance of looked up field
    """
    if field == '__self__':
        return value
    fields = field.split('__')
    for fld in fields:
        if isinstance(value, list):
            value = [getattr(v, fld) for v in value]
        else:
            value = getattr(value, fld)
    return value
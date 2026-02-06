import logging
from functools import wraps

import requests
from core.feature_flags import flag_set
from core.redis import start_job_async_or_sync
from core.utils.common import load_func
from django.conf import settings
from django.db.models import Q
from django.db.models.query import QuerySet

from .models import Webhook, WebhookAction

logger = logging.getLogger(__name__)


def get_active_webhooks(organization, project, action):
    """Return all active webhooks for organization or project by action.

    If project is None - function return only organization hooks
    else project is not None - function return project and organization hooks
    Organization hooks are global hooks.
    """
    action_meta = WebhookAction.ACTIONS[action]
    if project and action_meta.get('organization-only'):
        raise ValueError('There is no project webhooks for organization-only action')

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


def run_webhook_sync(webhook, action, payload=None):
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


def emit_webhooks_sync(organization, project, action, payload):
    """
    Run all active webhooks for the action.
    """
    webhooks = get_active_webhooks(organization, project, action)
    if project and payload and webhooks.filter(send_payload=True).exists():
        payload['project'] = load_func(settings.WEBHOOK_SERIALIZERS['project'])(instance=project).data
    for wh in webhooks:
        run_webhook_sync(wh, action, payload)


def _process_webhook_batch(webhooks, project, action, batch, action_meta):
    """Process a single batch of instances for webhooks.

    Args:
        webhooks: Active webhooks to send
        project: Project instance (optional)
        action: Action name
        batch: Batch of instances to process
        action_meta: Action metadata from WebhookAction.ACTIONS
    """
    payload = {}

    if batch and webhooks.filter(send_payload=True).exists():
        serializer_class = action_meta.get('serializer')
        if serializer_class:
            payload[action_meta['key']] = serializer_class(instance=batch, many=action_meta['many']).data
        if project and payload:
            payload['project'] = load_func(settings.WEBHOOK_SERIALIZERS['project'])(instance=project).data
        if payload and 'nested-fields' in action_meta:
            for key, value in action_meta['nested-fields'].items():
                payload[key] = value['serializer'](
                    instance=get_nested_field(batch, value['field']), many=value['many']
                ).data

    for wh in webhooks:
        run_webhook_sync(wh, action, payload)


def emit_webhooks_for_instance_sync(organization, project, action, instance=None):
    """Run all active webhooks for the action using instances as payload.

    Be sure WebhookAction.ACTIONS contains all required fields.
    """
    webhooks = get_active_webhooks(organization, project, action)
    if not webhooks.exists():
        return

    action_meta = WebhookAction.ACTIONS[action]

    # Convert list of IDs to queryset
    if instance and isinstance(instance, list) and isinstance(instance[0], int):
        instance = action_meta['model'].objects.filter(id__in=instance)

    # Check if batching is needed
    is_batch_collection = isinstance(instance, (list, QuerySet))
    use_batching = is_batch_collection and flag_set('fflag_fix_back_plt_843_webhook_memory_improvement_12082025_short')

    if use_batching:
        # Process in batches
        batch_size = settings.WEBHOOK_BATCH_SIZE

        if isinstance(instance, QuerySet):
            # For QuerySets, use iterator with chunk_size
            total_count = instance.count()
            logger.debug(f'Processing webhook for {total_count} instances in batches of {batch_size}')
            for i in range(0, total_count, batch_size):
                batch = instance[i : i + batch_size]
                logger.debug(f'Processing batch {i // batch_size + 1} with {batch.count()} instances')
                _process_webhook_batch(webhooks, project, action, batch, action_meta)
        else:
            # For lists, slice directly
            total_count = len(instance)
            logger.debug(f'Processing webhook for {total_count} instances in batches of {batch_size}')
            for i in range(0, len(instance), batch_size):
                batch = instance[i : i + batch_size]
                logger.debug(f'Processing batch {i // batch_size + 1} with {len(batch)} instances')
                _process_webhook_batch(webhooks, project, action, batch, action_meta)
    else:
        # Original behavior - process all at once
        _process_webhook_batch(webhooks, project, action, instance, action_meta)


def run_webhook(webhook, action, payload=None):
    """Run one webhook for action.

    This function must not raise any exceptions.

    Will run a webhook in an RQ worker.
    """
    if flag_set('fflag_fix_back_lsdv_4604_excess_sql_queries_in_api_short'):
        start_job_async_or_sync(
            run_webhook_sync,
            webhook,
            action,
            payload,
            queue_name='high',
        )
    else:
        run_webhook_sync(webhook, action, payload)


def emit_webhooks_for_instance(organization, project, action, instance=None):
    """Run all active webhooks for the action using instances as payload.

    Be sure WebhookAction.ACTIONS contains all required fields.

    Will run all selected webhooks in an RQ worker.
    """
    if flag_set('fflag_fix_plt_1004_skip_job_for_disabled_webhook_04022026_short'):
        webhooks = get_active_webhooks(organization, project, action)
        if not webhooks.exists():
            return
    if flag_set('fflag_fix_back_lsdv_4604_excess_sql_queries_in_api_short'):
        start_job_async_or_sync(emit_webhooks_for_instance_sync, organization, project, action, instance)
    else:
        emit_webhooks_for_instance_sync(organization, project, action, instance)


def emit_webhooks(organization, project, action, payload):
    """
    Run all active webhooks for the action.

    Will run all selected webhooks in an RQ worker.
    """
    if flag_set('fflag_fix_back_lsdv_4604_excess_sql_queries_in_api_short'):
        start_job_async_or_sync(emit_webhooks_sync, organization, project, action, payload)
    else:
        emit_webhooks_sync(organization, project, action, payload)


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
            response = func(self, request, *args, **kwargs)

            action_meta = WebhookAction.ACTIONS[action]
            many = action_meta['many']
            instance = action_meta['model'].objects.get(id=response.data.get('id'))
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
            return response

        return wrap

    return decorator


def api_webhook_for_delete(action):
    """Decorator emit webhooks for APIView delete method.

    The decorator expects authorized request and use get_object() method
    before delete.

    Example:
        ```
        @extend_schema(tags=['Annotations'])
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

            response = func(self, request, *args, **kwargs)

            emit_webhooks_for_instance(request.user.active_organization, project, action, obj)
            return response

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

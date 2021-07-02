import requests
from core.validators import JSONSchemaValidator
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings
import logging

from projects.models import Project
from tasks.models import Task, Annotation
from .serializers_for_hooks import OnlyIDWebhookSerializer, ProjectWebhookSerializer, TaskWebhookSerializer, AnnotationWebhookSerializer

HEADERS_SCHEMA = {
    "type": "object",
    "patternProperties": {
        "^[a-zA-Z0-9-_]+$": {"type": "string"},
    },
    "maxProperties": 10,
    "additionalProperties": False
}


class Webhook(models.Model):

    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='webhooks')

    url = models.URLField(_('URL of webhook'), max_length=2048)

    send_payload = models.BooleanField(_("does webhook send the payload"), default=True)

    send_for_all_actions = models.BooleanField(_("Use webhook for all actions"), default=True)

    headers = models.JSONField(_("request extra headers of webhook"),
                               validators=[JSONSchemaValidator(HEADERS_SCHEMA)],
                               default=dict)

    is_active = models.BooleanField(_("is webhook active"), default=True)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    def get_actions(self):
        return WebhookAction.objects.filter(webhook=self).values_list('action', flat=True)

    def set_actions(self, actions):
        if not actions:
            actions = set()
        actions = set(actions)
        old_actions = set(self.get_actions())

        for new_action in list(actions - old_actions):
            WebhookAction.objects.create(webhook=self, action=new_action)

        WebhookAction.objects.filter(webhook=self, action__in=(old_actions-actions)).delete()

    def has_permission(self, user):
        return self.organization.has_user(user)

    class Meta:
        db_table = 'webhook'


class WebhookAction(models.Model):
    PROJECT_CREATED = 'PROJECT_CREATED'
    PROJECT_UPDATED = 'PROJECT_UPDATED'
    PROJECT_DELETED = 'PROJECT_DELETED'

    TASK_CREATED = 'TASK_CREATED'
    TASK_UPDATED = 'TASK_UPDATED'
    TASK_DELETED = 'TASK_DELETED'

    ANNOTATION_CREATED = 'ANNOTATION_CREATED'
    ANNOTATION_UPDATED = 'ANNOTATION_UPDATED'
    ANNOTATION_DELETED = 'ANNOTATION_DELETED'

    ACTIONS = {
        PROJECT_CREATED: {
            'name': _('Project created'),
            'description': _(''),
            'key': 'projects',
            'model': Project,
            'serializer': ProjectWebhookSerializer,
        },
        PROJECT_UPDATED: {
            'name': _('Project updated'),
            'description': _(''),
            'key': 'projects',
            'model': Project,
            'serializer': ProjectWebhookSerializer,
        },
        PROJECT_DELETED: {
            'name': _('Project deleted'),
            'description': _(''),
            'key': 'projects',
            'model': Project,
            'serializer': OnlyIDWebhookSerializer,
        },
        TASK_CREATED: {
            'name': _('Task created'),
            'description': _(''),
            'key': 'tasks',
            'model': Task,
            'serializer': TaskWebhookSerializer,
        },
        TASK_UPDATED: {
            'name': _('Task updated'),
            'description': _(''),
            'key': 'tasks',
            'model': Task,
            'serializer': TaskWebhookSerializer,
        },
        TASK_DELETED: {
            'name': _('Task deleted'),
            'description': _(''),
            'key': 'tasks',
            'model': Task,
            'serializer': OnlyIDWebhookSerializer,
        },
        ANNOTATION_CREATED: {
            'name': _('Annotation created'),
            'description': _(''),
            'key': 'annotations',
            'model': Annotation,
            'serializer': AnnotationWebhookSerializer,
        },
        ANNOTATION_UPDATED: {
            'name': _('Annotation updated'),
            'description': _(''),
            'key': 'annotations',
            'model': Annotation,
            'serializer': AnnotationWebhookSerializer,
        },
        ANNOTATION_DELETED: {
            'name': _('Annotation deleted'),
            'description': _(''),
            'key': 'annotations',
            'model': Annotation,
            'serializer': OnlyIDWebhookSerializer,
        },
    }

    webhook = models.ForeignKey(Webhook, on_delete=models.CASCADE, related_name='actions')

    action = models.CharField(
        _('action of webhook'),
        choices=[[key, value['name']] for key, value in ACTIONS.items()],
        max_length=128, db_index=True,
    )

    class Meta:
        db_table = 'webhook_action'
        unique_together = [['webhook', 'action']]

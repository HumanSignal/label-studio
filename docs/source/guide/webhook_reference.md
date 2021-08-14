---
title: Webhook event format reference 
short: Webhook Event Reference
type: guide
order: 653
meta_title: Label Studio Webhook Event Reference 
meta_description: Label Studio reference documentation for webhook event fields and payloads sent from Label Studio for integration with your machine learning pipeline. 
---


### Event reference

It works according to algorithm and uses webhooks serialisers label_studio/webhooks/serializers_for_hooks.py. Also ACTIONS field in model.

Webhook's payload can be different.
But for now I try do it by declarative way. And I use ACTIONS to describe it. https://github.com/heartexlabs/label-studio/pull/1156/files#diff-ce7daadc1ac182002d7ea3d42e0a83f25061d208ab81e7fae7472378a455ef44R94 
Every webhook is run through run_webhook function https://github.com/heartexlabs/label-studio/pull/1156/files#diff-bf91bd7b648d9f117495b4b92cfc8b0399fbf465592318e2d94a0682eeaeed61R13 and as you can see: every payload has action key.
But of course it's not interesting and def emit_webhooks_for_instance(organization, project, action, instance=None) is mostly used in code to do it. (to be honest only it's used now) https://github.com/heartexlabs/label-studio/pull/1156/files#diff-bf91bd7b648d9f117495b4b92cfc8b0399fbf465592318e2d94a0682eeaeed61R71 
Project is required field here but it may be None (we have 2 kinds of webhooks: for organization and for project. If project is None it's organization webhook (global)).
So
and we serialize instance using ACTIONS metadata.
Сonsequently:
Now webhook's payload has: action key, project key (if it's project webhook), and key from ACTIONS with serialized instance (or list).
In the future we might get new kinds of webhooks so they would not use ACTIONS and would be imperative but now it fits into the declarative model.

Expected format/content of what is sent from each event

When are the events sent? 
What data is included in each POST to the webhook URL?


GitHub Webhook docs list common info and common header info, then event-specific stuff separately:
https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#webhook-payload-object-common-properties
Seems like a good idea
https://docs.github.com/en/developers/webhooks-and-events/events/github-event-types






















```python
class WebhookAction(models.Model):
    PROJECT_CREATED = 'PROJECT_CREATED'
    PROJECT_UPDATED = 'PROJECT_UPDATED'
    PROJECT_DELETED = 'PROJECT_DELETED'

    TASKS_CREATED = 'TASKS_CREATED'
    TASKS_DELETED = 'TASKS_DELETED'

    ANNOTATION_CREATED = 'ANNOTATION_CREATED'
    ANNOTATION_UPDATED = 'ANNOTATION_UPDATED'
    ANNOTATIONS_DELETED = 'ANNOTATIONS_DELETED'

    ACTIONS = {
        PROJECT_CREATED: {
            'name': _('Project created'),
            'description': _(''),
            'key': 'project',
            'many': False,
            'model': Project,
            'serializer': ProjectWebhookSerializer,
            'organization-only': True,
        },
        PROJECT_UPDATED: {
            'name': _('Project updated'),
            'description': _(''),
            'key': 'project',
            'many': False,
            'model': Project,
            'serializer': ProjectWebhookSerializer,
            'organization-only': True,
        },
        PROJECT_DELETED: {
            'name': _('Project deleted'),
            'description': _(''),
            'key': 'project',
            'many': False,
            'model': Project,
            'serializer': OnlyIDWebhookSerializer,
            'organization-only': True,
        },
        TASKS_CREATED: {
            'name': _('Task created'),
            'description': _(''),
            'key': 'tasks',
            'many': True,
            'model': Task,
            'serializer': TaskWebhookSerializer,
            'project-field': 'project',
        },
        TASKS_DELETED: {
            'name': _('Task deleted'),
            'description': _(''),
            'key': 'tasks',
            'many': True,
            'model': Task,
            'serializer': OnlyIDWebhookSerializer,
            'project-field': 'project',
        },
        ANNOTATION_CREATED: {
            'name': _('Annotation created'),
            'description': _(''),
            'key': 'annotation',
            'many': False,
            'model': Annotation,
            'serializer': AnnotationWebhookSerializer,
            'project-field': 'task__project',
        },
        ANNOTATION_UPDATED: {
            'name': _('Annotation updated'),
            'description': _(''),
            'key': 'annotation',
            'many': False,
            'model': Annotation,
            'serializer': AnnotationWebhookSerializer,
            'project-field': 'task__project',
        },
        ANNOTATIONS_DELETED: {
            'name': _('Annotation deleted'),
            'description': _(''),
            'key': 'annotations',
            'many': True,
            'model': Annotation,
            'serializer': OnlyIDWebhookSerializer,
            'project-field': 'task__project',
        },
    }
```


```python
class OnlyIDWebhookSerializer(serializers.Serializer):
    id = serializers.IntegerField()

    class Meta:
        fields: ('id',)


class ProjectWebhookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'


class TaskWebhookSerializer(serializers.ModelSerializer):
    # resolve $undefined$ key in task data, if any
    def to_representation(self, task):
        project = task.project
        data = task.data

        replace_task_data_undefined_with_config_field(data, project)
        return super().to_representation(task)

    class Meta:
        model = Task
        fields = '__all__'


class AnnotationWebhookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Annotation
        fields = '__all__'
```













"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import json
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.utils import timezone
from tasks.models import Annotation, AnnotationComment, AuditLog, AnnotationVersion, Task
from tasks.api import create_audit_log, create_annotation_version


# Store original values before save for change tracking
_pre_save_instances = {}


@receiver(pre_save, sender=Annotation)
def annotation_pre_save(sender, instance, **kwargs):
    """Store original annotation state before save"""
    if instance.pk:
        try:
            original = Annotation.objects.get(pk=instance.pk)
            _pre_save_instances[f'annotation_{instance.pk}'] = {
                'result': original.result,
                'lead_time': original.lead_time,
                'was_cancelled': original.was_cancelled,
                'review_status': original.review_status,
            }
        except Annotation.DoesNotExist:
            pass


@receiver(post_save, sender=Annotation)
def annotation_post_save(sender, instance, created, **kwargs):
    """Create audit log and version when annotation is saved"""
    from core.current_request import get_current_request
    request = get_current_request()
    user = request.user if request and request.user.is_authenticated else None

    if created:
        # New annotation created
        create_audit_log(
            user=user,
            action='create',
            entity_type='annotation',
            entity_id=instance.id,
            project=instance.project,
            description=f'Created annotation {instance.id} for task {instance.task_id}',
            changes={'created': True},
        )

        # Create initial version
        if user:
            create_annotation_version(
                annotation=instance,
                user=user,
                change_summary='Initial version',
            )
    else:
        # Annotation updated
        key = f'annotation_{instance.pk}'
        if key in _pre_save_instances:
            original = _pre_save_instances[key]
            changes = {}

            # Track what changed
            if original['result'] != instance.result:
                changes['result'] = {'old': original['result'], 'new': instance.result}

            if original['review_status'] != instance.review_status:
                changes['review_status'] = {
                    'old': original['review_status'],
                    'new': instance.review_status
                }

            if original['was_cancelled'] != instance.was_cancelled:
                changes['was_cancelled'] = {
                    'old': original['was_cancelled'],
                    'new': instance.was_cancelled
                }

            if changes:
                create_audit_log(
                    user=user,
                    action='update',
                    entity_type='annotation',
                    entity_id=instance.id,
                    project=instance.project,
                    description=f'Updated annotation {instance.id}',
                    changes=changes,
                )

                # Create new version if result changed
                if 'result' in changes and user:
                    create_annotation_version(
                        annotation=instance,
                        user=user,
                        change_summary='Annotation updated',
                    )

            # Clean up stored instance
            del _pre_save_instances[key]


@receiver(post_delete, sender=Annotation)
def annotation_post_delete(sender, instance, **kwargs):
    """Create audit log when annotation is deleted"""
    from core.current_request import get_current_request
    request = get_current_request()
    user = request.user if request and request.user.is_authenticated else None

    create_audit_log(
        user=user,
        action='delete',
        entity_type='annotation',
        entity_id=instance.id,
        project=instance.project,
        description=f'Deleted annotation {instance.id}',
        changes={'deleted': True},
    )


@receiver(post_save, sender=Task)
def task_post_save(sender, instance, created, **kwargs):
    """Create audit log when task is created or updated"""
    from core.current_request import get_current_request
    request = get_current_request()
    user = request.user if request and request.user.is_authenticated else None

    if created:
        create_audit_log(
            user=user,
            action='create',
            entity_type='task',
            entity_id=instance.id,
            project=instance.project,
            description=f'Created task {instance.id}',
            changes={'created': True},
        )


@receiver(post_delete, sender=Task)
def task_post_delete(sender, instance, **kwargs):
    """Create audit log when task is deleted"""
    from core.current_request import get_current_request
    request = get_current_request()
    user = request.user if request and request.user.is_authenticated else None

    create_audit_log(
        user=user,
        action='delete',
        entity_type='task',
        entity_id=instance.id,
        project=instance.project,
        description=f'Deleted task {instance.id}',
        changes={'deleted': True},
    )


@receiver(post_save, sender=AnnotationComment)
def comment_post_save(sender, instance, created, **kwargs):
    """Create audit log when comment is created"""
    from core.current_request import get_current_request
    request = get_current_request()
    user = request.user if request and request.user.is_authenticated else None

    if created:
        create_audit_log(
            user=user,
            action='comment',
            entity_type='annotation',
            entity_id=instance.annotation_id,
            project=instance.annotation.project,
            description=f'Added comment to annotation {instance.annotation_id}',
            changes={'comment_id': instance.id, 'text': instance.text[:100]},
        )


@receiver(post_delete, sender=AnnotationComment)
def comment_post_delete(sender, instance, **kwargs):
    """Create audit log when comment is deleted"""
    from core.current_request import get_current_request
    request = get_current_request()
    user = request.user if request and request.user.is_authenticated else None

    create_audit_log(
        user=user,
        action='delete',
        entity_type='comment',
        entity_id=instance.id,
        project=instance.annotation.project,
        description=f'Deleted comment from annotation {instance.annotation_id}',
        changes={'deleted': True},
    )

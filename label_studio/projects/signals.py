from django.db.models.signals import post_save
from django.dispatch import Signal, receiver


class ProjectSignals:
    """
    Signals for project: implements observer pattern for custom signals.
    Example:

    # publisher
    ProjectSignals.my_signal.send(sender=self, project=project)

    # observer
    @receiver(ProjectSignals.my_signal)
    def my_observer(sender, **kwargs):
        ...
    """

    post_label_config_and_import_tasks = Signal()


@receiver(post_save, sender='projects.Project')
def create_project_owner_membership(sender, instance, created, **kwargs):
    """
    Automatically assign project creator as owner when a new project is created
    """
    from projects.models import ProjectMember

    if created and instance.created_by:
        # Create owner membership for project creator
        ProjectMember.objects.get_or_create(
            user=instance.created_by,
            project=instance,
            defaults={
                'role': ProjectMember.OWNER,
                'enabled': True
            }
        )

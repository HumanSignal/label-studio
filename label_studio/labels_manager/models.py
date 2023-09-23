from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Label(models.Model):
    created_at = models.DateTimeField(_('Created at'), auto_now_add=True, help_text='Time of label creation')
    updated_at = models.DateTimeField(_('Updated at'), auto_now=True, help_text='Time of label modification')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name='labels', on_delete=models.CASCADE, help_text='User who made this label'
    )
    value = models.JSONField('value', null=False, help_text='Label value')
    title = models.CharField(_('Title'), max_length=2048, help_text='Label title')
    description = models.TextField(_('Description'), help_text='Label description', blank=True, null=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='labels_approved',
        on_delete=models.CASCADE,
        help_text='User who approved this label',
        null=True,
    )
    approved = models.BooleanField(default=False, help_text='Status of label')
    projects = models.ManyToManyField('projects.Project', through='LabelLink')
    organization = models.ForeignKey('organizations.Organization', related_name='labels', on_delete=models.CASCADE)

    def has_permission(self, user):
        return self.organization_id == user.active_organization_id

    class Meta:
        constraints = [models.UniqueConstraint(fields=['title', 'organization'], name='unique_title')]


class LabelLink(models.Model):
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE)
    label = models.ForeignKey(Label, on_delete=models.CASCADE, related_name='links')
    from_name = models.CharField(_('Tag name'), max_length=2048, help_text='Tag name')

    class Meta:
        constraints = [models.UniqueConstraint(fields=['project', 'label'], name='unique_label_project')]

    def has_permission(self, user):
        user.project = self.project  # link for activity log
        return self.project.has_permission(user)

from core.utils.common import load_func
from django.conf import settings
from projects.models import Project


def accessible_projects(user):
    """Projects in the user's active organization that org-wide operations may change for the user, as one queryset.

    Lets callers scope an org-wide operation in one query instead of checking `Project.has_permission`
    project by project. LSE overrides it through `settings.ACCESSIBLE_PROJECTS_FUNCTION` with its role and
    workspace rules (project-list visibility).
    """
    organization = user.active_organization
    if organization is None or organization.has_deleted(user):
        return Project.objects.none()
    return Project.objects.filter(organization=organization)


def filter_accessible(queryset, user, project_field='project'):
    """Rows of ``queryset`` whose project ``user`` may access.

    Use it on list and bulk endpoints, where DRF never calls the object's ``has_permission``: a queryset
    scoped only by organization lets a member of one project read or change rows of another. ``project_field``
    is the lookup from the row to its project (``'project'``, ``'task__project'``, ...).
    """
    project_ids = load_func(settings.ACCESSIBLE_PROJECTS_FUNCTION)(user).values('id')
    return queryset.filter(**{f'{project_field}__in': project_ids})

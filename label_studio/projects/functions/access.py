from core.utils.common import load_func
from django.conf import settings
from django.shortcuts import get_object_or_404
from projects.models import Project
from rest_framework.exceptions import PermissionDenied


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


def get_permitted_project(user, pk):
    """The project ``pk`` in the user's active organization, if ``Project.has_permission`` allows the user.

    ``Project.objects.for_user`` only filters by organization; endpoints that load a project from the URL
    and then read or change its rows need the membership check too. Raises 404 for an unknown project and
    DRF ``PermissionDenied`` (403) when the user may not access it, so call it from DRF views only.
    """
    project = get_object_or_404(Project.objects.for_user(user), pk=pk)
    if not project.has_permission(user):
        raise PermissionDenied(f"You don't have access to project {project.id}")
    return project

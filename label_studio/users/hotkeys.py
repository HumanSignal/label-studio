import re

from projects.models import Project
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

PROJECT_ID_PATTERN = re.compile(r'^[1-9][0-9]*$')


def get_hotkey_project(user, project_id) -> Project | None:
    if project_id is None:
        return None

    if not isinstance(project_id, str) or PROJECT_ID_PATTERN.fullmatch(project_id) is None:
        raise ValidationError({'project': 'Project must be an integer.'}) from None

    project_id = int(project_id)
    project = Project.objects.filter(
        pk=project_id,
        organization=user.active_organization,
    ).first()
    if project is None:
        raise NotFound('Project not found.')
    if not project.has_permission(user):
        raise PermissionDenied('You do not have access to this project.')
    return project

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

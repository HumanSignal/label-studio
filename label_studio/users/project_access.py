from projects.models import ProjectMember


def get_user_ids_in_projects(project_ids: list[int], organization_id: int) -> list[int]:
    """Return user IDs with access to the given projects in LSO.

    LSO project access is modeled via direct ``ProjectMember`` rows only.
    """
    if not project_ids:
        return []

    return list(
        ProjectMember.objects.filter(
            project_id__in=project_ids,
            project__organization_id=organization_id,
        )
        .values_list('user_id', flat=True)
        .distinct()
    )

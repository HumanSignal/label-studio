"""
Django-rules permission predicates for project-level RBAC

This module defines role-based access control predicates for Label Studio projects.
Roles are hierarchical: Owner > Reviewer > Annotator
"""
import rules


@rules.predicate
def is_project_owner(user, project):
    """Check if user is project owner"""
    if not user or not user.is_authenticated:
        return False

    from projects.models import ProjectMember

    try:
        membership = ProjectMember.objects.get(
            user=user,
            project=project,
            enabled=True
        )
        return membership.role == ProjectMember.OWNER
    except ProjectMember.DoesNotExist:
        return False


@rules.predicate
def is_project_reviewer(user, project):
    """Check if user is project reviewer or owner (hierarchical)"""
    if not user or not user.is_authenticated:
        return False

    from projects.models import ProjectMember

    try:
        membership = ProjectMember.objects.get(
            user=user,
            project=project,
            enabled=True
        )
        return membership.role in [ProjectMember.OWNER, ProjectMember.REVIEWER]
    except ProjectMember.DoesNotExist:
        return False


@rules.predicate
def is_project_annotator(user, project):
    """Check if user is project member with any role"""
    if not user or not user.is_authenticated:
        return False

    from projects.models import ProjectMember

    return ProjectMember.objects.filter(
        user=user,
        project=project,
        enabled=True
    ).exists()


# Alias for clarity
is_project_member = is_project_annotator


# Combined predicates for specific permissions
can_view_project = is_project_member
can_annotate = is_project_member
can_review_annotations = is_project_reviewer
can_manage_project = is_project_owner
can_manage_members = is_project_owner


# Register rules with django-rules
# Project-level permissions
rules.add_rule('projects.view_project', can_view_project)
rules.add_rule('projects.change_project', can_manage_project)
rules.add_rule('projects.delete_project', can_manage_project)
rules.add_rule('projects.manage_members', can_manage_members)
rules.add_rule('projects.reset_cache', can_manage_project)

# Task permissions (contextual based on project)
rules.add_rule('tasks.view_task', can_view_project)
rules.add_rule('tasks.create_task', can_manage_project)
rules.add_rule('tasks.change_task', can_manage_project)
rules.add_rule('tasks.delete_task', can_manage_project)

# Annotation permissions
rules.add_rule('annotations.create_annotation', can_annotate)
rules.add_rule('annotations.view_annotation', can_view_project)
rules.add_rule('annotations.change_annotation', can_review_annotations)
rules.add_rule('annotations.delete_annotation', can_review_annotations)

# Export permissions (reviewer and above)
rules.add_rule('exports.create_export', can_review_annotations)
rules.add_rule('exports.download_export', can_review_annotations)

# ML backend permissions (owner only)
rules.add_rule('ml.view_backend', can_review_annotations)
rules.add_rule('ml.manage_backend', can_manage_project)

# Webhook permissions (owner only)
rules.add_rule('webhooks.view', can_review_annotations)
rules.add_rule('webhooks.manage', can_manage_project)

# Storage permissions (owner only)
rules.add_rule('storages.view', can_review_annotations)
rules.add_rule('storages.manage', can_manage_project)
rules.add_rule('storages.sync', can_manage_project)


def get_user_role(user, project):
    """
    Get user's role in a project

    Args:
        user: User instance
        project: Project instance

    Returns:
        str: Role name ('owner', 'reviewer', 'annotator') or None
    """
    if not user or not user.is_authenticated:
        return None

    from projects.models import ProjectMember

    try:
        membership = ProjectMember.objects.get(
            user=user,
            project=project,
            enabled=True
        )
        return membership.role
    except ProjectMember.DoesNotExist:
        return None


def has_permission(user, permission, project):
    """
    Check if user has specific permission on project

    Args:
        user: User instance
        permission: Permission string (e.g., 'projects.manage_project')
        project: Project instance

    Returns:
        bool: True if user has permission
    """
    return rules.test_rule(permission, user, project)

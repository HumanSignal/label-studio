"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import rules

from core.permissions import make_perm


@rules.predicate
def is_org_member(user, obj):
    return obj.has_user(user)


make_perm('organizations.view_organization', rules.is_authenticated)
make_perm('organizations.change_organization', rules.always_allow)
make_perm('organizations.delete_organization', rules.always_allow)
make_perm('projects_nav', rules.always_allow)


def get_organization(obj):
    from projects.models import Project, ProjectTemplate, ProjectSummary
    from io_storages.base_models import Storage
    from ml.models import MLBackend
    from tasks.models import Task, Annotation, AnnotationDraft
    from organizations.models import Organization, OrganizationMember
    from data_manager.models import View

    if isinstance(obj, Organization):
        return obj
    elif isinstance(obj, (OrganizationMember, ProjectTemplate)):
        return obj.organization
    elif isinstance(obj, Project):
        return obj.organization
    elif isinstance(obj, (Task, Storage, ProjectSummary, MLBackend)):
        return obj.project.organization
    elif isinstance(obj, (Annotation, AnnotationDraft)):
        return obj.task.project.organization
    elif isinstance(obj,View):
        return obj.project.organization
    elif isinstance(obj, (str, int)):
        # assume obj is primary key
        return Organization.objects.get(pk=obj)
    else:
        raise AttributeError(f'Can\'t get Organization from instance {obj}')

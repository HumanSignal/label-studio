from core.permissions import all_permissions
from data_manager.actions import check_action_permission
from django.contrib.auth.models import AnonymousUser
from django.test import TestCase
from projects.tests.factories import ProjectFactory


class TestCheckActionPermission(TestCase):
    def test_check_action_permission(self):
        project = ProjectFactory()
        user = project.created_by
        action = {
            'permission': [all_permissions.tasks_delete, all_permissions.projects_view],
        }
        assert check_action_permission(user, action, project) is True

        anon_user = AnonymousUser()   # Unauthenticated user
        assert check_action_permission(anon_user, action, project) is False

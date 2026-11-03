"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from unittest.mock import patch

from core.permissions import ViewClassPermission
from data_manager.api import ProjectActionsAPI
from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory, TestCase
from django.utils import timezone
from organizations.models import OrganizationMember
from projects.action_permissions import (
    PERMISSION_ACTIONS,
    PUBLIC_VIEWS,
    Action,
    ProjectActionPermission,
    ensure_can_create_project,
    ensure_org_owner,
    ensure_project_manage,
    ensure_project_visible,
    project_actions_api_action,
    resolve_permission_name,
    webhook_permission_action,
)
from projects.api import LabelConfigValidateAPI
from projects.tests.access_setup import make_access_world
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.viewsets import ViewSet
from tasks.tests.factories import AnnotationDraftFactory, AnnotationFactory, TaskFactory, TaskLockFactory
from webhooks.api import WebhookInfoAPI
from webhooks.models import Webhook

# Binding table from the task brief. Keys and actions are verbatim.
EXPECTED_PERMISSION_ACTIONS = {
    'projects.view': Action.ACCESS,
    'tasks.view': Action.ACCESS,
    'annotations.view': Action.ACCESS,
    'annotations.create': Action.ACCESS,
    'views.view': Action.ACCESS,
    'projects.change': Action.MANAGE,
    'projects.delete': Action.MANAGE,
    'projects.reset_cache': Action.MANAGE,
    'tasks.create': Action.MANAGE,
    'tasks.change': Action.MANAGE,
    'tasks.delete': Action.MANAGE,
    'views.create': Action.MANAGE,
    'views.change': Action.MANAGE,
    'views.delete': Action.MANAGE,
    'views.reset': Action.MANAGE,
    'actions.perform': Action.MANAGE,
    'predictions.any': Action.MANAGE,
    'storages.view': Action.MANAGE,
    'storages.change': Action.MANAGE,
    'storages.sync': Action.MANAGE,
    'labels.create': Action.MANAGE,
    'labels.view': Action.MANAGE,
    'labels.change': Action.MANAGE,
    'labels.delete': Action.MANAGE,
    'models.create': Action.MANAGE,
    'models.view': Action.MANAGE,
    'models.change': Action.MANAGE,
    'models.delete': Action.MANAGE,
    'webhooks.view': Action.MANAGE,
    'webhooks.change': Action.MANAGE,
    'projects.create': Action.CREATE_PROJECT,
    'organizations.change': Action.ORG_OWNER,
    'organizations.delete': Action.ORG_OWNER,
    'organizations.invite': Action.ORG_OWNER,
    'organizations.create': Action.ORG_OWNER,
    'model_provider_connection.create': Action.ORG_OWNER,
    'model_provider_connection.view': Action.ORG_OWNER,
    'model_provider_connection.change': Action.ORG_OWNER,
    'model_provider_connection.delete': Action.ORG_OWNER,
    'organizations.view': Action.SELF,
    'users.token.any': Action.SELF,
    'avatar.any': Action.SELF,
    'annotations.change': Action.ANNOTATION_WRITE,
    'annotations.delete': Action.ANNOTATION_WRITE,
}


class _DeclaredView(ViewSet):
    permission_required = ViewClassPermission(
        GET='projects.view',
        POST='projects.create',
    )

    @action(detail=True, methods=['post', 'delete'], permission_required='avatar.any')
    def avatar(self, request, pk=None):
        return None


class ActionPermissionTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def test_permission_table_matches_the_brief(self):
        self.assertEqual(PERMISSION_ACTIONS, EXPECTED_PERMISSION_ACTIONS)
        self.assertEqual(
            set(Action),
            {
                Action.ACCESS,
                Action.MANAGE,
                Action.CREATE_PROJECT,
                Action.ORG_OWNER,
                Action.SELF,
                Action.ANNOTATION_WRITE,
            },
        )

    def test_public_views_are_the_three_data_free_endpoints(self):
        self.assertEqual(
            PUBLIC_VIEWS,
            frozenset(
                {
                    'projects.api.LabelConfigValidateAPI',
                    'webhooks.api.WebhookInfoAPI',
                    'core.views.TriggerAPIError',
                }
            ),
        )
        request = self.factory.get('/')
        request.user = AnonymousUser()
        permission = ProjectActionPermission()
        self.assertTrue(permission.has_permission(request, LabelConfigValidateAPI()))
        self.assertTrue(permission.has_permission(request, WebhookInfoAPI()))

    def test_unmapped_permission_is_denied(self):
        self.assertIsNone(PERMISSION_ACTIONS.get('not.a.real.permission'))
        request = self.factory.get('/')
        request.user = make_access_world().owner
        view = type('Unmapped', (), {'permission_required': 'not.a.real.permission', 'request': request})()
        self.assertFalse(ProjectActionPermission().has_permission(request, view))

    def test_visible_member_without_manage_gets_403_not_404(self):
        world = make_access_world()
        with self.assertRaises(PermissionDenied):
            ensure_project_manage(world.member_a, world.project_1)

    def test_inaccessible_project_gets_404(self):
        world = make_access_world()
        with self.assertRaises(NotFound):
            ensure_project_manage(world.member_a, world.project_2)

    def test_visible_project_passes_and_hidden_project_is_404(self):
        world = make_access_world()
        ensure_project_visible(world.member_a, world.project_1)
        with self.assertRaises(NotFound):
            ensure_project_visible(world.member_a, world.project_2)

    def test_only_organization_owner_can_create_project(self):
        world = make_access_world()
        ensure_can_create_project(world.owner)
        with self.assertRaises(PermissionDenied):
            ensure_can_create_project(world.creator)
        with self.assertRaises(PermissionDenied):
            ensure_can_create_project(world.member_a)

    def test_resolve_permission_name_reads_declared_sources(self):
        get_request = self.factory.get('/')
        class_view = type(
            'ClassPerm',
            (),
            {'permission_required': ViewClassPermission(GET='tasks.view', POST='tasks.create')},
        )()
        self.assertEqual(resolve_permission_name(class_view, get_request), 'tasks.view')
        self.assertEqual(resolve_permission_name(class_view, self.factory.post('/')), 'tasks.create')
        self.assertIsNone(resolve_permission_name(class_view, self.factory.delete('/')))

        string_view = type('StringPerm', (), {'permission_required': 'projects.change'})()
        self.assertEqual(resolve_permission_name(string_view, get_request), 'projects.change')

        action_view = _DeclaredView()
        action_view.action = 'avatar'
        self.assertEqual(resolve_permission_name(action_view, self.factory.post('/')), 'avatar.any')
        action_view.action = 'list'
        self.assertEqual(resolve_permission_name(action_view, get_request), 'projects.view')

        bare_view = type('Bare', (), {})()
        self.assertIsNone(resolve_permission_name(bare_view, get_request))

    def test_ensure_org_owner_hides_other_org_and_rejects_member(self):
        world = make_access_world()
        with self.assertRaises(NotFound):
            ensure_org_owner(world.outsider, world.organization)
        with self.assertRaises(NotFound):
            ensure_org_owner(world.owner, world.outsider_organization)
        with self.assertRaises(PermissionDenied):
            ensure_org_owner(world.member_a, world.organization)
        with self.assertRaises(PermissionDenied):
            ensure_org_owner(world.creator, world.organization)
        ensure_org_owner(world.owner, world.organization)

    def test_soft_deleted_member_does_not_reveal_organization(self):
        world = make_access_world()
        membership = OrganizationMember.objects.get(user=world.member_a, organization=world.organization)
        membership.deleted_at = timezone.now()
        membership.save(update_fields=['deleted_at'])
        world.member_a.refresh_from_db()
        self.assertEqual(world.member_a.active_organization_id, world.organization.id)
        with self.assertRaises(NotFound):
            ensure_org_owner(world.member_a, world.organization)

    def test_object_without_resolvable_project_is_denied(self):
        world = make_access_world()
        permission = ProjectActionPermission()
        view = type('Tasks', (), {'permission_required': 'tasks.view'})()
        request = self.factory.get('/')
        request.user = world.member_a
        self.assertTrue(permission.has_permission(request, view))
        with self.assertRaises(NotFound):
            permission.has_object_permission(request, view, object())

        task = TaskFactory(project=world.project_1)
        draft = AnnotationDraftFactory(task=task, user=world.member_a)
        lock = TaskLockFactory(task=task, user=world.member_a)
        self.assertTrue(permission.has_object_permission(request, view, draft))
        self.assertTrue(permission.has_object_permission(request, view, lock))

        hidden = TaskFactory(project=world.project_2)
        hidden_draft = AnnotationDraftFactory(task=hidden, user=world.member_b)
        hidden_lock = TaskLockFactory(task=hidden, user=world.member_b)
        with self.assertRaises(NotFound):
            permission.has_object_permission(request, view, hidden_draft)
        with self.assertRaises(NotFound):
            permission.has_object_permission(request, view, hidden_lock)

    def test_self_permission_ignores_non_user_objects_and_hides_other_users(self):
        world = make_access_world()
        permission = ProjectActionPermission()
        view = type('Token', (), {'permission_required': 'users.token.any'})()
        request = self.factory.get('/')
        request.user = world.member_a
        self.assertTrue(permission.has_permission(request, view))
        self.assertTrue(permission.has_object_permission(request, view, object()))
        self.assertTrue(permission.has_object_permission(request, view, world.member_a))
        with self.assertRaises(NotFound):
            permission.has_object_permission(request, view, world.owner)
        with self.assertRaises(NotFound):
            permission.has_object_permission(request, view, type('Owned', (), {'user_id': world.owner.id})())
        self.assertTrue(
            permission.has_object_permission(request, view, type('Owned', (), {'user_id': world.member_a.id})())
        )

        anonymous = self.factory.get('/')
        anonymous.user = AnonymousUser()
        self.assertFalse(permission.has_permission(anonymous, view))

    def test_anonymous_org_owner_permission_returns_false(self):
        request = self.factory.get('/')
        request.user = AnonymousUser()
        view = type('Org', (), {'permission_required': 'organizations.change'})()
        try:
            allowed = ProjectActionPermission().has_permission(request, view)
        except (NotFound, PermissionDenied) as exc:
            self.fail(f'anonymous org permission raised {type(exc).__name__}')
        self.assertFalse(allowed)

    def test_project_actions_api_next_task_is_access_and_other_actions_are_manage(self):
        self.assertIs(project_actions_api_action(None), None)
        self.assertIs(project_actions_api_action(''), None)
        self.assertIs(project_actions_api_action('next_task'), Action.ACCESS)
        self.assertIs(project_actions_api_action('delete_tasks'), Action.MANAGE)
        self.assertIs(project_actions_api_action('not-a-registered-action'), Action.MANAGE)

        world = make_access_world()
        view = ProjectActionsAPI()
        permission = ProjectActionPermission()

        missing = self.factory.post(f'/?project={world.project_1.id}')
        missing.user = world.owner
        self.assertFalse(permission.has_permission(missing, view))

        unknown = self.factory.post('/?id=not-a-registered-action')
        unknown.user = world.owner
        self.assertTrue(permission.has_permission(unknown, view))

        nxt = self.factory.post(f'/?id=next_task&project={world.project_1.id}')
        nxt.user = world.member_a
        self.assertTrue(permission.has_permission(nxt, view))
        self.assertTrue(permission.has_object_permission(nxt, view, world.project_1))
        with self.assertRaises(NotFound):
            permission.has_object_permission(nxt, view, world.project_2)

        delete = self.factory.post(f'/?id=delete_tasks&project={world.project_1.id}')
        delete.user = world.member_a
        self.assertTrue(permission.has_permission(delete, view))
        with self.assertRaises(PermissionDenied):
            permission.has_object_permission(delete, view, world.project_1)
        with self.assertRaises(NotFound):
            permission.has_object_permission(delete, view, world.project_2)
        delete.user = world.creator
        self.assertTrue(permission.has_object_permission(delete, view, world.project_1))

        listing = self.factory.get(f'/?project={world.project_1.id}')
        listing.user = world.member_a
        self.assertTrue(permission.has_permission(listing, view))
        self.assertTrue(permission.has_object_permission(listing, view, world.project_1))

    def test_empty_webhook_project_uses_org_owner(self):
        self.assertIs(webhook_permission_action(None), Action.ORG_OWNER)
        self.assertIs(webhook_permission_action(''), Action.ORG_OWNER)
        self.assertIs(webhook_permission_action(11), Action.MANAGE)

        world = make_access_world()
        org_hook = Webhook.objects.create(
            organization=world.organization,
            project=None,
            url='https://example.com/org',
        )
        project_hook = Webhook.objects.create(
            organization=world.organization,
            project=world.project_1,
            url='https://example.com/project',
        )
        hidden_hook = Webhook.objects.create(
            organization=world.organization,
            project=world.project_2,
            url='https://example.com/hidden',
        )
        view = type('WebhookView', (), {'permission_required': 'webhooks.change'})()
        permission = ProjectActionPermission()
        request = self.factory.post('/')

        request.user = world.creator
        with self.assertRaises(PermissionDenied):
            permission.has_object_permission(request, view, org_hook)
        request.user = world.outsider
        with self.assertRaises(NotFound):
            permission.has_object_permission(request, view, org_hook)
        request.user = world.owner
        self.assertTrue(permission.has_object_permission(request, view, org_hook))

        request.user = world.member_a
        with self.assertRaises(PermissionDenied):
            permission.has_object_permission(request, view, project_hook)
        with self.assertRaises(NotFound):
            permission.has_object_permission(request, view, hidden_hook)
        request.user = world.creator
        self.assertTrue(permission.has_object_permission(request, view, project_hook))

    def test_annotation_write_allows_author_or_manager(self):
        world = make_access_world()
        task = TaskFactory(project=world.project_1)
        own = AnnotationFactory(task=task, completed_by=world.member_a)
        theirs = AnnotationFactory(task=task, completed_by=world.creator)
        foreign_task = TaskFactory(project=world.project_2)
        foreign = AnnotationFactory(task=foreign_task, completed_by=world.member_b)
        view = type('Ann', (), {'permission_required': 'annotations.change'})()
        permission = ProjectActionPermission()
        request = self.factory.patch('/')
        request.user = world.member_a
        self.assertTrue(permission.has_object_permission(request, view, own))
        with self.assertRaises(PermissionDenied):
            permission.has_object_permission(request, view, theirs)
        with self.assertRaises(NotFound):
            permission.has_object_permission(request, view, foreign)
        request.user = world.creator
        self.assertTrue(permission.has_object_permission(request, view, theirs))

    def test_create_and_org_actions_do_not_use_has_perm(self):
        world = make_access_world()
        permission = ProjectActionPermission()
        create_view = type('Create', (), {'permission_required': 'projects.create'})()
        org_view = type('Org', (), {'permission_required': 'organizations.change'})()
        self_view = type('Self', (), {'permission_required': 'organizations.view'})()

        with patch('users.models.User.has_perm', side_effect=AssertionError('has_perm')):
            owner_request = self.factory.post('/')
            owner_request.user = world.owner
            self.assertTrue(permission.has_permission(owner_request, create_view))
            self.assertTrue(permission.has_permission(owner_request, org_view))

            member_request = self.factory.post('/')
            member_request.user = world.member_a
            self.assertFalse(permission.has_permission(member_request, create_view))
            with self.assertRaises(PermissionDenied):
                permission.has_permission(member_request, org_view)
            self.assertTrue(permission.has_permission(member_request, self_view))

    def test_action_permission_is_installed_by_default(self):
        from django.conf import settings

        self.assertIn(
            'projects.action_permissions.ProjectActionPermission',
            settings.REST_FRAMEWORK['DEFAULT_PERMISSION_CLASSES'],
        )

from unittest import mock

from django.test import TestCase
from organizations.models import OrganizationMember
from organizations.tests.factories import OrganizationFactory
from projects.tests.factories import ProjectFactory
from tasks.models import TaskLock
from tasks.tests.factories import TaskFactory, TaskLockFactory
from users.tests.factories import UserFactory


class TestOrganizationMember(TestCase):
    def test_soft_delete_preserves_avatar_and_other_org_task_locks(self):
        organization = OrganizationFactory()
        remaining_organization = OrganizationFactory()
        user = UserFactory(active_organization=organization)
        OrganizationMember.objects.create(user=user, organization=remaining_organization)
        user.avatar.name = 'avatars/test.png'
        user.save(update_fields=['avatar'])

        removed_project = ProjectFactory(organization=organization)
        remaining_project = ProjectFactory(organization=remaining_organization)
        removed_lock = TaskLockFactory(user=user, task=TaskFactory(project=removed_project))
        remaining_lock = TaskLockFactory(user=user, task=TaskFactory(project=remaining_project))

        membership = OrganizationMember.objects.get(user=user, organization=organization)
        with mock.patch.object(user.avatar.storage, 'delete') as storage_delete:
            membership.soft_delete()

        user.refresh_from_db()
        membership.refresh_from_db()
        assert membership.deleted_at is not None
        assert user.active_organization == remaining_organization
        assert user.avatar.name == 'avatars/test.png'
        storage_delete.assert_not_called()
        assert not TaskLock.objects.filter(pk=removed_lock.pk).exists()
        assert TaskLock.objects.filter(pk=remaining_lock.pk).exists()

    def test_soft_delete_clears_avatar_and_org_task_locks_for_last_membership(self):
        organization = OrganizationFactory()
        user = UserFactory(active_organization=organization)
        user.avatar.name = 'avatars/test.png'
        user.save(update_fields=['avatar'])

        project = ProjectFactory(organization=organization)
        task_lock = TaskLockFactory(user=user, task=TaskFactory(project=project))

        membership = OrganizationMember.objects.get(user=user, organization=organization)
        with mock.patch.object(user.avatar.storage, 'delete') as storage_delete:
            membership.soft_delete()

        user.refresh_from_db()
        membership.refresh_from_db()
        assert membership.deleted_at is not None
        assert user.active_organization is None
        assert not user.avatar
        storage_delete.assert_called_once_with('avatars/test.png')
        assert not TaskLock.objects.filter(pk=task_lock.pk).exists()

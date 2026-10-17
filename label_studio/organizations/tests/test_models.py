from datetime import timedelta
from unittest import mock

from django.test import TestCase, override_settings
from django.utils import timezone
from organizations.models import Organization, OrganizationMember
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


class TestOrganizationInviteTokenExpiration(TestCase):
    """FIT-2685: an invite link's expiry is fixed when the link is issued."""

    def _expire_at(self, organization, delta):
        organization.token_expires_at = timezone.now() + delta
        organization.save(update_fields=['token_expires_at'])

    @override_settings(ORG_INVITE_EXPIRATION_DAYS=30)
    def test_new_token_expires_after_configured_days(self):
        before = timezone.now()
        organization = OrganizationFactory()

        assert organization.is_invite_token_expired is False
        assert before + timedelta(days=30) <= organization.token_expires_at <= timezone.now() + timedelta(days=30)

    def test_token_is_expired_once_expiry_passes(self):
        organization = OrganizationFactory()
        self._expire_at(organization, timedelta(minutes=1))
        assert organization.is_invite_token_expired is False

        self._expire_at(organization, -timedelta(minutes=1))
        assert organization.is_invite_token_expired is True

    @override_settings(ORG_INVITE_EXPIRATION_DAYS=30)
    def test_reset_token_issues_fresh_expiry_and_revokes_previous_token(self):
        organization = OrganizationFactory()
        self._expire_at(organization, -timedelta(days=1))
        old_token = organization.token

        organization.reset_token()
        organization.refresh_from_db()

        assert organization.token != old_token
        assert organization.is_invite_token_expired is False
        assert organization.token_expires_at > timezone.now() + timedelta(days=29)
        assert not Organization.objects.filter(token=old_token).exists()

    def test_changing_setting_does_not_reinterpret_issued_links(self):
        with override_settings(ORG_INVITE_EXPIRATION_DAYS=30):
            organization = OrganizationFactory()
        self._expire_at(organization, -timedelta(days=1))
        issued_expiry = organization.token_expires_at

        for days in (365, 0):
            with override_settings(ORG_INVITE_EXPIRATION_DAYS=days):
                organization.refresh_from_db()
                assert organization.token_expires_at == issued_expiry
                assert organization.is_invite_token_expired is True

    def test_link_without_recorded_expiry_fails_closed_while_expiry_enabled(self):
        # e.g. an org created by a build without expiry during a blue-green cutover
        organization = OrganizationFactory()
        organization.token_expires_at = None
        organization.save(update_fields=['token_expires_at'])

        with override_settings(ORG_INVITE_EXPIRATION_DAYS=30):
            assert organization.is_invite_token_expired is True
        with override_settings(ORG_INVITE_EXPIRATION_DAYS=0):
            assert organization.is_invite_token_expired is False

    def test_link_issued_while_expiry_disabled_stops_working_once_re_enabled(self):
        with override_settings(ORG_INVITE_EXPIRATION_DAYS=0):
            organization = OrganizationFactory()
            organization.reset_token()
            assert organization.is_invite_token_expired is False

        with override_settings(ORG_INVITE_EXPIRATION_DAYS=30):
            assert organization.is_invite_token_expired is True
            organization.reset_token()
            assert organization.is_invite_token_expired is False

    @override_settings(ORG_INVITE_EXPIRATION_DAYS=0)
    def test_non_positive_setting_issues_links_that_never_expire(self):
        organization = OrganizationFactory()
        organization.reset_token()

        assert organization.token_expires_at is None
        assert organization.is_invite_token_expired is False

"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from unittest.mock import patch

from django.test import override_settings
from django.urls import reverse
from projects.tests.access_setup import make_access_world
from rest_framework.test import APITestCase
from webhooks.models import Webhook

PROJECT_WEBHOOK_URL = 'https://example.com/project-webhook-secret'
ORG_WEBHOOK_URL = 'https://example.com/org-webhook-secret'


def _webhook(organization, project, url):
    return Webhook.objects.create(organization=organization, project=project, url=url, send_for_all_actions=True)


class WebhookAccessTests(APITestCase):
    def test_member_cannot_read_project_webhook(self):
        world = make_access_world()
        webhook = _webhook(world.organization, world.project_1, PROJECT_WEBHOOK_URL)
        hidden = _webhook(world.organization, world.project_2, 'https://example.com/other-project-webhook')
        self.client.force_authenticate(world.member_a)
        listed = self.client.get(reverse('webhooks:api:webhook-list') + f'?project={world.project_1.id}')
        detail = self.client.get(reverse('webhooks:api:webhook-detail', kwargs={'pk': webhook.id}))
        other = self.client.get(reverse('webhooks:api:webhook-detail', kwargs={'pk': hidden.id}))
        self.assertEqual(listed.status_code, 403, listed.content)
        self.assertEqual(detail.status_code, 403, detail.content)
        self.assertEqual(other.status_code, 404, other.content)
        for response in (listed, detail, other):
            body = response.content.decode()
            self.assertNotIn(PROJECT_WEBHOOK_URL, body)
            self.assertNotIn('https://example.com/other-project-webhook', body)

    def test_member_save_does_not_validate_before_permission(self):
        world = make_access_world()
        self.client.force_authenticate(world.member_a)
        with patch('webhooks.serializers.WebhookSerializer.validate_url', return_value=PROJECT_WEBHOOK_URL) as validate_url:
            response = self.client.post(
                reverse('webhooks:api:webhook-list'),
                {
                    'project': world.project_1.id,
                    'url': PROJECT_WEBHOOK_URL,
                    'send_for_all_actions': True,
                    'is_active': True,
                    'actions': [],
                },
                format='json',
            )
        self.assertEqual(response.status_code, 403, response.content)
        self.assertNotIn(PROJECT_WEBHOOK_URL, response.content.decode())
        validate_url.assert_not_called()
        self.assertFalse(Webhook.objects.filter(url=PROJECT_WEBHOOK_URL).exists())

    def test_update_cannot_move_webhook_to_another_project(self):
        world = make_access_world()
        webhook = _webhook(world.organization, world.project_1, PROJECT_WEBHOOK_URL)
        self.client.force_authenticate(world.creator)
        response = self.client.patch(
            reverse('webhooks:api:webhook-detail', kwargs={'pk': webhook.id}),
            {'project': world.project_2.id},
            format='json',
        )
        self.assertEqual(response.status_code, 400, response.content)
        webhook.refresh_from_db()
        self.assertEqual(webhook.project_id, world.project_1.id)
        self.assertEqual(webhook.url, PROJECT_WEBHOOK_URL)
        self.assertNotIn(PROJECT_WEBHOOK_URL, response.content.decode())

    @override_settings(SSRF_PROTECTION_ENABLED=False)
    def test_only_owner_can_read_and_write_organization_webhook(self):
        world = make_access_world()
        webhook = _webhook(world.organization, None, ORG_WEBHOOK_URL)
        self.client.force_authenticate(world.creator)
        listed = self.client.get(reverse('webhooks:api:webhook-list') + '?project=isnull')
        detail = self.client.get(reverse('webhooks:api:webhook-detail', kwargs={'pk': webhook.id}))
        created = self.client.post(
            reverse('webhooks:api:webhook-list'),
            {
                'project': None,
                'url': 'https://example.com/creator-org-webhook',
                'send_for_all_actions': True,
                'is_active': True,
                'actions': [],
            },
            format='json',
        )
        updated = self.client.patch(
            reverse('webhooks:api:webhook-detail', kwargs={'pk': webhook.id}),
            {'url': 'https://example.com/creator-replaced-webhook'},
            format='json',
        )
        self.assertEqual(listed.status_code, 403, listed.content)
        self.assertEqual(detail.status_code, 403, detail.content)
        self.assertEqual(created.status_code, 403, created.content)
        self.assertEqual(updated.status_code, 403, updated.content)
        for response in (listed, detail, created, updated):
            self.assertNotIn(ORG_WEBHOOK_URL, response.content.decode())
        webhook.refresh_from_db()
        self.assertEqual(webhook.url, ORG_WEBHOOK_URL)
        self.assertFalse(Webhook.objects.filter(url='https://example.com/creator-org-webhook').exists())

        self.client.force_authenticate(world.owner)
        owner_detail = self.client.get(reverse('webhooks:api:webhook-detail', kwargs={'pk': webhook.id}))
        owner_update = self.client.patch(
            reverse('webhooks:api:webhook-detail', kwargs={'pk': webhook.id}),
            {'url': 'https://example.com/owner-replaced-webhook', 'send_for_all_actions': True},
            format='json',
        )
        owner_create = self.client.post(
            reverse('webhooks:api:webhook-list'),
            {
                'project': None,
                'url': 'https://example.com/owner-org-webhook',
                'send_for_all_actions': True,
                'is_active': True,
                'actions': [],
            },
            format='json',
        )
        self.assertEqual(owner_detail.status_code, 200, owner_detail.content)
        self.assertEqual(owner_update.status_code, 200, owner_update.content)
        self.assertEqual(owner_create.status_code, 201, owner_create.content)
        webhook.refresh_from_db()
        self.assertEqual(webhook.url, 'https://example.com/owner-replaced-webhook')
        self.assertTrue(
            Webhook.objects.filter(organization=world.organization, project=None, url='https://example.com/owner-org-webhook').exists()
        )

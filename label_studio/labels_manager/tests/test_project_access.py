"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from django.urls import reverse
from labels_manager.models import Label, LabelLink
from projects.models import ProjectMember
from projects.tests.access_setup import make_access_world
from rest_framework.test import APITestCase
from tasks.models import Annotation
from tasks.tests.factories import AnnotationFactory, TaskFactory


def _choice_result(label):
    return [
        {
            'id': 'r1',
            'from_name': 'label',
            'to_name': 'text',
            'type': 'choices',
            'value': {'choices': [label]},
        }
    ]


def _annotation(project, user, label='Cat'):
    task = TaskFactory(project=project)
    return AnnotationFactory(task=task, project=project, completed_by=user, result=_choice_result(label))


def _label_payload(project, title='Cat'):
    return [{'title': title, 'value': {'choices': [title]}, 'project': project.id, 'from_name': 'label'}]


class LabelBulkUpdateAccessTests(APITestCase):
    url = None

    def setUp(self):
        self.url = reverse('labels_manager:api-labels-bulk')
        self.world = make_access_world()
        self.visible = _annotation(self.world.project_1, self.world.creator)
        self.hidden = _annotation(self.world.project_2, self.world.owner)
        self.body = {'old_label': ['Cat'], 'new_label': ['Dog']}

    def _results(self):
        return {
            'visible': Annotation.objects.get(pk=self.visible.pk).result,
            'hidden': Annotation.objects.get(pk=self.hidden.pk).result,
        }

    def test_member_and_unassigned_cannot_rewrite_a_hidden_project(self):
        before = self._results()
        for user in (self.world.member_a, self.world.unassigned):
            self.client.force_authenticate(user)
            response = self.client.post(self.url, {**self.body, 'project': self.world.project_2.id}, format='json')
            self.assertEqual(response.status_code, 404, (user, response.content))
            self.assertEqual(self._results(), before)

    def test_member_cannot_rewrite_a_visible_project_they_do_not_manage(self):
        before = self._results()
        self.client.force_authenticate(self.world.member_a)
        response = self.client.post(self.url, {**self.body, 'project': self.world.project_1.id}, format='json')
        self.assertEqual(response.status_code, 403, response.content)
        self.assertEqual(self._results(), before)

        self.client.force_authenticate(self.world.unassigned)
        response = self.client.post(self.url, {**self.body, 'project': self.world.project_1.id}, format='json')
        self.assertEqual(response.status_code, 404, response.content)
        self.assertEqual(self._results(), before)

    def test_without_project_member_and_unassigned_update_nothing(self):
        before = self._results()
        for user in (self.world.member_a, self.world.unassigned, self.world.outsider):
            self.client.force_authenticate(user)
            response = self.client.post(self.url, self.body, format='json')
            self.assertEqual(response.status_code, 200, (user, response.content))
            self.assertEqual(response.json()['annotations_updated'], 0)
            self.assertEqual(self._results(), before)

    def test_without_project_manager_updates_only_projects_they_manage(self):
        self.client.force_authenticate(self.world.creator)
        response = self.client.post(self.url, self.body, format='json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['annotations_updated'], 1)
        results = self._results()
        self.assertEqual(results['visible'][0]['value']['choices'], ['Dog'])
        self.assertEqual(results['hidden'][0]['value']['choices'], ['Cat'])

    def test_organization_owner_updates_every_project_and_can_name_one(self):
        self.client.force_authenticate(self.world.owner)
        response = self.client.post(self.url, {**self.body, 'project': self.world.project_2.id}, format='json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['annotations_updated'], 1)
        results = self._results()
        self.assertEqual(results['visible'][0]['value']['choices'], ['Cat'])
        self.assertEqual(results['hidden'][0]['value']['choices'], ['Dog'])


class LabelWriteAccessTests(APITestCase):
    def test_member_cannot_create_labels_in_a_hidden_or_unmanaged_project(self):
        world = make_access_world()
        self.client.force_authenticate(world.member_a)
        url = reverse('labels_manager:api-labels:label-list')

        hidden = self.client.post(url, _label_payload(world.project_2), format='json')
        unmanaged = self.client.post(url, _label_payload(world.project_1), format='json')

        self.assertEqual(hidden.status_code, 404, hidden.content)
        self.assertEqual(unmanaged.status_code, 403, unmanaged.content)
        self.assertEqual(Label.objects.count(), 0)
        self.assertEqual(LabelLink.objects.count(), 0)

    def test_unassigned_cannot_create_labels(self):
        world = make_access_world()
        self.client.force_authenticate(world.unassigned)
        response = self.client.post(
            reverse('labels_manager:api-labels:label-list'), _label_payload(world.project_1), format='json'
        )
        self.assertEqual(response.status_code, 404, response.content)
        self.assertEqual(Label.objects.count(), 0)

    def test_creator_can_create_labels_in_their_project(self):
        world = make_access_world()
        self.client.force_authenticate(world.creator)
        response = self.client.post(
            reverse('labels_manager:api-labels:label-list'), _label_payload(world.project_1), format='json'
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(LabelLink.objects.filter(project=world.project_1).count(), 1)

    def test_member_cannot_create_label_links_in_a_hidden_project(self):
        world = make_access_world()
        label = Label.objects.create(
            title='Cat', value={'choices': ['Cat']}, created_by=world.owner, organization=world.organization
        )
        self.client.force_authenticate(world.member_a)
        url = reverse('labels_manager:api-labels:label_link-list')

        hidden = self.client.post(
            url, {'project': world.project_2.id, 'label': label.id, 'from_name': 'label'}, format='json'
        )
        unmanaged = self.client.post(
            url, {'project': world.project_1.id, 'label': label.id, 'from_name': 'label'}, format='json'
        )

        self.assertEqual(hidden.status_code, 404, hidden.content)
        self.assertEqual(unmanaged.status_code, 403, unmanaged.content)
        self.assertEqual(LabelLink.objects.count(), 0)


class LabelListAccessTests(APITestCase):
    def setUp(self):
        self.world = make_access_world()
        world = self.world
        self.visible_label = Label.objects.create(
            title='Visible', value={'choices': ['Visible']}, created_by=world.creator, organization=world.organization
        )
        self.hidden_label = Label.objects.create(
            title='Hidden', value={'choices': ['Hidden']}, created_by=world.owner, organization=world.organization
        )
        self.visible_link = LabelLink.objects.create(
            project=world.project_1, label=self.visible_label, from_name='label'
        )
        self.hidden_link = LabelLink.objects.create(
            project=world.project_2, label=self.hidden_label, from_name='label'
        )

    @staticmethod
    def _ids(response):
        data = response.json()
        rows = data['results'] if isinstance(data, dict) else data
        return {row['id'] for row in rows}

    def test_member_lists_only_links_of_projects_they_can_open(self):
        self.client.force_authenticate(self.world.member_a)
        url = reverse('labels_manager:api-labels:label_link-list')

        listed = self.client.get(url)
        hidden_filter = self.client.get(url, {'project': self.world.project_2.id})

        self.assertEqual(listed.status_code, 200, listed.content)
        self.assertEqual(self._ids(listed), {self.visible_link.id})
        self.assertEqual(hidden_filter.status_code, 200, hidden_filter.content)
        self.assertEqual(self._ids(hidden_filter), set())

    def test_member_lists_only_labels_linked_to_visible_projects(self):
        self.client.force_authenticate(self.world.member_a)
        listed = self.client.get(reverse('labels_manager:api-labels:label-list'))
        self.assertEqual(listed.status_code, 200, listed.content)
        self.assertEqual(self._ids(listed), {self.visible_label.id})

    def test_unassigned_lists_nothing(self):
        self.client.force_authenticate(self.world.unassigned)
        self.assertEqual(self._ids(self.client.get(reverse('labels_manager:api-labels:label_link-list'))), set())
        self.assertEqual(self._ids(self.client.get(reverse('labels_manager:api-labels:label-list'))), set())

    def test_owner_lists_everything(self):
        self.client.force_authenticate(self.world.owner)
        self.assertEqual(
            self._ids(self.client.get(reverse('labels_manager:api-labels:label_link-list'))),
            {self.visible_link.id, self.hidden_link.id},
        )


class SharedLabelWriteAccessTests(APITestCase):
    def setUp(self):
        self.world = make_access_world()
        self.label = Label.objects.create(
            title='Shared',
            value={'choices': ['Shared']},
            created_by=self.world.creator,
            organization=self.world.organization,
        )
        self.own_link = LabelLink.objects.create(project=self.world.project_1, label=self.label, from_name='label')
        self.other_link = LabelLink.objects.create(project=self.world.project_2, label=self.label, from_name='label')
        self.url = reverse('labels_manager:api-labels:label-detail', kwargs={'pk': self.label.pk})
        self.client.force_authenticate(self.world.creator)

    def _assert_unchanged(self):
        self.label.refresh_from_db()
        self.assertEqual(self.label.title, 'Shared')
        self.assertEqual(self.label.value, {'choices': ['Shared']})
        self.assertSetEqual(
            set(LabelLink.objects.filter(label=self.label).values_list('pk', flat=True)),
            {self.own_link.pk, self.other_link.pk},
        )

    def test_hidden_link_blocks_global_delete_without_removing_either_link(self):
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, 404, response.content)
        self._assert_unchanged()

    def test_hidden_link_blocks_patch_and_put_without_changing_shared_label(self):
        payload = {
            'title': 'Changed',
            'value': {'choices': ['Changed']},
            'created_by': self.world.creator.pk,
            'organization': self.world.organization.pk,
        }
        for method in ('patch', 'put'):
            with self.subTest(method=method):
                response = getattr(self.client, method)(self.url, payload, format='json')
                self.assertEqual(response.status_code, 404, response.content)
                self._assert_unchanged()

    def test_visible_unmanaged_link_blocks_writes_with_403(self):
        ProjectMember.objects.create(project=self.world.project_2, user=self.world.creator, enabled=True)
        for method in ('patch', 'delete'):
            with self.subTest(method=method):
                response = getattr(self.client, method)(self.url, {'title': 'Changed'}, format='json')
                self.assertEqual(response.status_code, 403, response.content)
                self._assert_unchanged()

    def test_owner_can_update_and_delete_shared_label(self):
        self.client.force_authenticate(self.world.owner)
        response = self.client.patch(self.url, {'title': 'Changed'}, format='json')
        self.assertEqual(response.status_code, 200, response.content)
        self.label.refresh_from_db()
        self.assertEqual(self.label.title, 'Changed')
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, 204, response.content)
        self.assertFalse(Label.objects.filter(pk=self.label.pk).exists())
        self.assertFalse(LabelLink.objects.filter(pk__in=[self.own_link.pk, self.other_link.pk]).exists())

    def test_creator_of_every_linked_project_can_update_and_delete_shared_label(self):
        self.world.project_2.created_by = self.world.creator
        self.world.project_2.save(update_fields=['created_by'])
        response = self.client.patch(self.url, {'title': 'Changed'}, format='json')
        self.assertEqual(response.status_code, 200, response.content)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, 204, response.content)
        self.assertFalse(Label.objects.filter(pk=self.label.pk).exists())

    def test_single_project_creator_can_still_update_and_delete_label(self):
        self.other_link.delete()
        response = self.client.patch(self.url, {'title': 'Changed'}, format='json')
        self.assertEqual(response.status_code, 200, response.content)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, 204, response.content)
        self.assertFalse(Label.objects.filter(pk=self.label.pk).exists())

    def test_deleting_own_link_keeps_shared_label_and_hidden_link(self):
        url = reverse('labels_manager:api-labels:label_link-detail', kwargs={'pk': self.own_link.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 204, response.content)
        self.assertTrue(Label.objects.filter(pk=self.label.pk).exists())
        self.assertTrue(LabelLink.objects.filter(pk=self.other_link.pk).exists())
        self.assertFalse(LabelLink.objects.filter(pk=self.own_link.pk).exists())

    def test_creator_cannot_link_a_label_from_another_organization(self):
        foreign_label = Label.objects.create(
            title='Foreign',
            value={'choices': ['Foreign']},
            created_by=self.world.outsider,
            organization=self.world.outsider_organization,
        )
        response = self.client.post(
            reverse('labels_manager:api-labels:label_link-list'),
            {'project': self.world.project_1.pk, 'label': foreign_label.pk, 'from_name': 'label'},
            format='json',
        )
        self.assertEqual(response.status_code, 400, response.content)
        self.assertFalse(LabelLink.objects.filter(label=foreign_label).exists())

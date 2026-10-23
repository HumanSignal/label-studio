"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from django.urls import reverse
from labels_manager.models import Label, LabelLink
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

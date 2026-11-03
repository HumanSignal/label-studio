"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from django.urls import reverse
from projects.models import Project
from projects.tests.access_setup import make_access_world
from rest_framework.test import APITestCase
from tasks.models import Task
from tasks.tests.factories import TaskFactory


class ProjectTaskListAccessTests(APITestCase):
    def setUp(self):
        self.world = make_access_world()
        self.own_tasks = [TaskFactory(project=self.world.project_1) for _ in range(2)]
        self.hidden_tasks = [TaskFactory(project=self.world.project_2) for _ in range(2)]

    def _url(self, project):
        return reverse('projects:api:project-tasks-list', kwargs={'pk': project.id})

    def _counts(self):
        return (
            Task.objects.filter(project=self.world.project_1).count(),
            Task.objects.filter(project=self.world.project_2).count(),
        )

    def test_member_cannot_delete_all_tasks(self):
        self.client.force_authenticate(self.world.member_a)
        own = self.client.delete(self._url(self.world.project_1))
        hidden = self.client.delete(self._url(self.world.project_2))
        self.assertEqual(own.status_code, 403, own.content)
        self.assertEqual(hidden.status_code, 404, hidden.content)
        self.assertEqual(self._counts(), (2, 2))

    def test_unassigned_and_outsider_cannot_delete_tasks(self):
        for user in (self.world.unassigned, self.world.outsider):
            self.client.force_authenticate(user)
            for project in (self.world.project_1, self.world.project_2):
                response = self.client.delete(self._url(project))
                self.assertEqual(response.status_code, 404, (user, response.content))
        self.assertEqual(self._counts(), (2, 2))

    def test_member_cannot_create_a_task(self):
        self.client.force_authenticate(self.world.member_a)
        own = self.client.post(self._url(self.world.project_1), {'data': {'text': 'forged'}}, format='json')
        hidden = self.client.post(self._url(self.world.project_2), {'data': {'text': 'forged'}}, format='json')
        self.assertEqual(own.status_code, 403, own.content)
        self.assertEqual(hidden.status_code, 404, hidden.content)
        self.assertEqual(self._counts(), (2, 2))
        self.assertFalse(Task.objects.filter(data__text='forged').exists())

    def test_member_can_still_list_tasks_of_their_project(self):
        self.client.force_authenticate(self.world.member_a)
        response = self.client.get(self._url(self.world.project_1))
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual({row['id'] for row in response.json()}, {t.id for t in self.own_tasks})
        hidden = self.client.get(self._url(self.world.project_2))
        self.assertEqual(hidden.status_code, 404, hidden.content)

    def test_manager_can_delete_all_tasks_and_create_one(self):
        self.client.force_authenticate(self.world.creator)
        created = self.client.post(self._url(self.world.project_1), {'data': {'text': 'kept'}}, format='json')
        self.assertEqual(created.status_code, 201, created.content)
        self.assertEqual(self._counts(), (3, 2))
        deleted = self.client.delete(self._url(self.world.project_1))
        self.assertEqual(deleted.status_code, 204, deleted.content)
        self.assertEqual(self._counts(), (0, 2))


class ProjectOwnershipUpdateTests(APITestCase):
    def _detail(self, project):
        return reverse('projects:api:project-detail', kwargs={'pk': project.id})

    def test_put_without_creator_preserves_ownership_and_access(self):
        world = make_access_world()
        self.client.force_authenticate(world.creator)
        url = self._detail(world.project_1)

        response = self.client.put(url, {'title': 'Updated title'}, format='json')

        self.assertEqual(response.status_code, 200, response.content)
        world.project_1.refresh_from_db()
        self.assertEqual(world.project_1.created_by_id, world.creator.id)
        self.assertEqual(world.project_1.organization_id, world.organization.id)
        self.assertEqual(world.project_1.title, 'Updated title')
        detail = self.client.get(url)
        self.assertEqual(detail.status_code, 200, detail.content)
        self.assertTrue(detail.json()['access']['can_manage'])

    def test_explicit_creator_is_ignored_on_put_and_patch(self):
        world = make_access_world()
        self.client.force_authenticate(world.creator)
        for method in ('put', 'patch'):
            for creator in (None, world.member_a.id, {'id': world.member_a.id}):
                with self.subTest(method=method, creator=creator):
                    response = getattr(self.client, method)(
                        self._detail(world.project_1),
                        {'created_by': creator, 'description': 'edited'},
                        format='json',
                    )
                    self.assertEqual(response.status_code, 200, response.content)
                    world.project_1.refresh_from_db()
                    self.assertEqual(world.project_1.created_by_id, world.creator.id)
                    self.assertEqual(world.project_1.description, 'edited')

    def test_patch_cannot_move_a_project_to_another_organization(self):
        world = make_access_world()
        self.client.force_authenticate(world.creator)
        response = self.client.patch(
            self._detail(world.project_1), {'organization': world.outsider_organization.id}, format='json'
        )
        self.assertIn(response.status_code, (200, 400), response.content)
        self.assertEqual(Project.objects.get(pk=world.project_1.pk).organization_id, world.organization.id)

    def test_patch_cannot_change_the_creator(self):
        world = make_access_world()
        self.client.force_authenticate(world.creator)
        response = self.client.patch(
            self._detail(world.project_1), {'created_by': world.member_a.id, 'description': 'edited'}, format='json'
        )
        self.assertIn(response.status_code, (200, 400), response.content)
        project = Project.objects.get(pk=world.project_1.pk)
        self.assertEqual(project.created_by_id, world.creator.id)

    def test_put_cannot_move_a_project_to_another_organization(self):
        world = make_access_world()
        self.client.force_authenticate(world.creator)
        self.client.put(
            self._detail(world.project_1),
            {'organization': world.outsider_organization.id, 'title': world.project_1.title},
            format='json',
        )
        self.assertEqual(Project.objects.get(pk=world.project_1.pk).organization_id, world.organization.id)

    def test_ordinary_update_still_applies(self):
        world = make_access_world()
        self.client.force_authenticate(world.creator)
        response = self.client.patch(self._detail(world.project_1), {'description': 'edited'}, format='json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(Project.objects.get(pk=world.project_1.pk).description, 'edited')

"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from django.urls import reverse
from projects.models import Project
from projects.tests.access_setup import make_access_world
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient, APITestCase
from tasks.models import Annotation, Task
from tasks.tests.factories import AnnotationFactory, TaskFactory

HIDDEN_PROJECT_URLS = (
    'projects:api:project-detail',
    'projects:api:project-summary',
    'projects:api:project-next',
    'projects:api:label-stream-history',
    'projects:api:project-sample-task',
    'projects:api:project-model-versions',
    'projects:api:project-annotators',
)


class ProjectVisibilityTests(APITestCase):
    def test_list_search_pagination_and_counts_hide_other_project(self):
        world = make_access_world()
        world.organization.jwt.legacy_api_tokens_enabled = True
        world.organization.jwt.save(update_fields=['legacy_api_tokens_enabled'])
        queued = TaskFactory(project=world.project_2, data={'text': 'queued for project 2'})
        AnnotationFactory(task=queued, project=world.project_2, completed_by=world.member_b)
        world.project_2.summary
        annotated = TaskFactory(project=world.project_1, data={'text': 'annotated on project 1'})
        AnnotationFactory(task=annotated, project=world.project_1, completed_by=world.unassigned)

        self.client.force_authenticate(world.member_a)
        listed = self.client.get(reverse('projects:api:project-list'), {'search': world.project_2.title, 'page_size': 1})
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.json()['count'], 0)
        self.assertEqual(listed.json()['results'], [])
        counts = self.client.get(reverse('projects:api:project-counts-list'))
        count_rows = counts.json()
        if isinstance(count_rows, dict):
            count_rows = count_rows['results']
        self.assertEqual([row['id'] for row in count_rows], [world.project_1.id])

        for url_name in HIDDEN_PROJECT_URLS:
            hidden = self.client.get(reverse(url_name, kwargs={'pk': world.project_2.id}))
            self.assertEqual(hidden.status_code, 404, url_name)

        visible = self.client.get(reverse('projects:api:project-list'))
        visible_row = next(row for row in visible.json()['results'] if row['id'] == world.project_1.id)
        self.assertEqual(visible_row['access'], {'can_annotate': True, 'can_manage': False})

        self.client.force_authenticate(world.creator)
        creator_list = self.client.get(reverse('projects:api:project-list'))
        creator_row = next(row for row in creator_list.json()['results'] if row['id'] == world.project_1.id)
        self.assertEqual(creator_row['access'], {'can_annotate': True, 'can_manage': True})

        self.client.force_authenticate(world.member_a)
        mixed_ids = self.client.get(
            reverse('projects:api:project-list'),
            {'ids': f'{world.project_1.id},{world.project_2.id}', 'page_size': 1},
        )
        self.assertEqual(mixed_ids.status_code, 404)

        annotators = self.client.get(reverse('projects:api:project-annotators', kwargs={'pk': world.project_1.id}))
        self.assertEqual(annotators.status_code, 200)
        self.assertIn(world.unassigned.id, [row['id'] for row in annotators.json()])

        token_client = APIClient()
        token_client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.get(user=world.member_a).key}')
        token_hidden = token_client.get(reverse('projects:api:project-detail', kwargs={'pk': world.project_2.id}))
        self.assertEqual(token_hidden.status_code, 404)
        session_hidden = self.client.get(reverse('projects:api:project-detail', kwargs={'pk': world.project_2.id}))
        self.assertEqual(session_hidden.status_code, 404)

        self.client.force_authenticate(world.creator)
        before = Project.objects.count()
        denied = self.client.post(
            reverse('projects:api:project-list'),
            {'title': 'Creator cannot create', 'created_by': world.owner.id, 'organization': world.organization.id},
            format='json',
        )
        self.assertEqual(denied.status_code, 403)
        self.assertEqual(Project.objects.count(), before)
        self.assertFalse(Project.objects.filter(title='Creator cannot create').exists())

        self.client.force_authenticate(world.owner)
        created = self.client.post(
            reverse('projects:api:project-list'),
            {
                'title': 'Owner creates',
                'created_by': world.creator.id,
                'organization': world.outsider_organization.id,
                'access': {'can_annotate': False, 'can_manage': False},
            },
            format='json',
        )
        self.assertEqual(created.status_code, 201, created.content)
        body = created.json()
        self.assertEqual(body['created_by']['id'], world.owner.id)
        self.assertEqual(body['organization'], world.organization.id)
        saved = Project.objects.get(id=body['id'])
        self.assertEqual(saved.created_by_id, world.owner.id)
        self.assertEqual(saved.organization_id, world.organization.id)

        self.assertCountEqual(list(Project.objects.for_user(world.member_a)), [world.project_1])
        self.assertEqual(world.project_2.has_permission(world.member_a), False)
        self.assertIs(world.member_a.project, world.project_2)
        self.assertEqual(
            set(Task.objects.for_user(world.member_a).values_list('project_id', flat=True)),
            {world.project_1.id},
        )
        self.assertEqual(
            set(Annotation.objects.for_user(world.member_a).values_list('project_id', flat=True)),
            {world.project_1.id},
        )
        self.assertCountEqual(list(world.project_1.all_members), [world.owner, world.creator, world.member_a])

    def test_enabled_member_of_project_1_gets_404_for_project_2_detail(self):
        """An explicit request for an inaccessible project is 404, not 403.

        Production change that fails the test: HasObjectPermission runs first
        and returns False, so DRF responds 403 before ProjectActionPermission
        can raise NotFound.
        """
        world = make_access_world()
        self.client.force_authenticate(world.member_a)
        hidden = self.client.get(reverse('projects:api:project-detail', kwargs={'pk': world.project_2.id}))
        self.assertEqual(hidden.status_code, 404)

    def test_detail_ignores_ids_that_would_404_the_list(self):
        world = make_access_world()
        self.client.force_authenticate(world.member_a)
        detail = self.client.get(
            reverse('projects:api:project-detail', kwargs={'pk': world.project_1.id}),
            {'ids': world.project_2.id},
        )
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()['id'], world.project_1.id)
        listed = self.client.get(
            reverse('projects:api:project-list'),
            {'ids': f'{world.project_1.id},{world.project_2.id}'},
        )
        self.assertEqual(listed.status_code, 404)

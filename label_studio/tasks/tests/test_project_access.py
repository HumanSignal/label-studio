"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import json

from django.urls import reverse
from projects.models import ProjectMember
from projects.tests.access_setup import make_access_world
from rest_framework.test import APITestCase
from tasks.models import Annotation, AnnotationDraft
from tasks.tests.factories import AnnotationDraftFactory, AnnotationFactory, TaskFactory

SECRET_DRAFT_TEXT = 'secret-draft-text'
SECRET_DRAFT_RESULT = [
    {
        'value': {'choices': [SECRET_DRAFT_TEXT]},
        'from_name': 'label',
        'to_name': 'text',
        'type': 'choices',
    }
]


class AnnotationAccessTests(APITestCase):
    def test_member_cannot_submit_as_someone_else(self):
        world = make_access_world()
        task = TaskFactory(project=world.project_1)
        self.client.force_authenticate(world.member_a)
        response = self.client.post(
            reverse('tasks:api:task-annotations', kwargs={'pk': task.id}),
            {'result': [], 'completed_by': world.member_b.id},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Annotation.objects.filter(task=task).exists())

    def test_create_skip_and_own_update_keep_the_author(self):
        world = make_access_world()
        task = TaskFactory(project=world.project_1)
        skip_task = TaskFactory(project=world.project_1)
        explicit_task = TaskFactory(project=world.project_1)
        self.client.force_authenticate(world.member_a)

        created = self.client.post(
            reverse('tasks:api:task-annotations', kwargs={'pk': task.id}),
            {'result': []},
            format='json',
        )
        self.assertEqual(created.status_code, 201, created.content)
        annotation = Annotation.objects.get(task=task)
        self.assertEqual(annotation.completed_by_id, world.member_a.id)

        skipped = self.client.post(
            reverse('tasks:api:task-annotations', kwargs={'pk': skip_task.id}),
            {'result': [], 'was_cancelled': True},
            format='json',
        )
        self.assertEqual(skipped.status_code, 201, skipped.content)
        skip_annotation = Annotation.objects.get(task=skip_task)
        self.assertEqual(skip_annotation.completed_by_id, world.member_a.id)
        self.assertTrue(skip_annotation.was_cancelled)

        explicit = self.client.post(
            reverse('tasks:api:task-annotations', kwargs={'pk': explicit_task.id}),
            {'result': [], 'completed_by': world.member_a.id},
            format='json',
        )
        self.assertEqual(explicit.status_code, 201, explicit.content)
        self.assertEqual(Annotation.objects.get(task=explicit_task).completed_by_id, world.member_a.id)

        updated = self.client.patch(
            reverse('tasks:api-annotations:annotation-detail', kwargs={'pk': annotation.id}),
            {'lead_time': 3.5, 'completed_by': world.member_b.id},
            format='json',
        )
        self.assertEqual(updated.status_code, 200, updated.content)
        annotation.refresh_from_db()
        self.assertEqual(annotation.completed_by_id, world.member_a.id)
        self.assertEqual(annotation.lead_time, 3.5)

    def test_member_cannot_change_or_delete_another_annotation(self):
        world = make_access_world()
        task = TaskFactory(project=world.project_1)
        original = [{'id': 'kept'}]
        annotation = AnnotationFactory(
            task=task,
            project=world.project_1,
            completed_by=world.member_b,
            result=original,
            lead_time=1.5,
        )
        url = reverse('tasks:api-annotations:annotation-detail', kwargs={'pk': annotation.id})
        self.client.force_authenticate(world.member_a)

        updated = self.client.patch(url, {'result': [], 'lead_time': 99}, format='json')
        self.assertEqual(updated.status_code, 403)
        annotation.refresh_from_db()
        self.assertEqual(annotation.completed_by_id, world.member_b.id)
        self.assertEqual(annotation.result, original)
        self.assertEqual(annotation.lead_time, 1.5)

        deleted = self.client.delete(url)
        self.assertEqual(deleted.status_code, 403)
        annotation.refresh_from_db()
        self.assertEqual(annotation.completed_by_id, world.member_b.id)
        self.assertEqual(annotation.result, original)

    def test_manager_update_keeps_original_author(self):
        world = make_access_world()
        task = TaskFactory(project=world.project_1)
        annotation = AnnotationFactory(
            task=task,
            project=world.project_1,
            completed_by=world.member_b,
            result=[{'id': 'original'}],
        )
        self.client.force_authenticate(world.creator)
        updated = self.client.patch(
            reverse('tasks:api-annotations:annotation-detail', kwargs={'pk': annotation.id}),
            {'result': [{'id': 'managed'}], 'completed_by': world.member_a.id},
            format='json',
        )
        self.assertEqual(updated.status_code, 200, updated.content)
        annotation.refresh_from_db()
        self.assertEqual(annotation.completed_by_id, world.member_b.id)
        self.assertEqual(annotation.result, [{'id': 'managed'}])

    def test_other_users_draft_is_hidden(self):
        world = make_access_world()
        task = TaskFactory(project=world.project_1)
        draft = AnnotationDraftFactory(task=task, user=world.member_b, result=SECRET_DRAFT_RESULT)
        world.project_1.summary.refresh_from_db()
        self.assertIn(SECRET_DRAFT_TEXT, json.dumps(world.project_1.summary.created_labels_drafts))

        detail_url = reverse('tasks:api:task-detail', kwargs={'pk': task.id})
        drafts_url = reverse('tasks:api:task-drafts', kwargs={'pk': task.id})
        task_summary_url = reverse('tasks:api:task-summary', kwargs={'pk': task.id})
        project_summary_url = reverse('projects:api:project-summary', kwargs={'pk': world.project_1.id})
        draft_url = reverse('tasks:api-drafts:draft-detail', kwargs={'pk': draft.id})

        for user in (world.member_a, world.creator):
            self.client.force_authenticate(user)
            detail = self.client.get(detail_url)
            drafts = self.client.get(drafts_url)
            task_summary = self.client.get(task_summary_url)
            project_summary = self.client.get(project_summary_url)
            self.assertEqual(detail.status_code, 200, detail.content)
            self.assertEqual(drafts.status_code, 200, drafts.content)
            self.assertEqual(task_summary.status_code, 200, task_summary.content)
            self.assertEqual(project_summary.status_code, 200, project_summary.content)
            for response in (detail, drafts, task_summary, project_summary):
                self.assertNotIn(SECRET_DRAFT_TEXT, response.content.decode())
            self.assertFalse(detail.json()['draft_exists'])

            fetched = self.client.get(draft_url)
            saved = self.client.patch(draft_url, {'result': []}, format='json')
            self.assertEqual(fetched.status_code, 404)
            self.assertEqual(saved.status_code, 404)
            draft.refresh_from_db()
            self.assertEqual(draft.result, SECRET_DRAFT_RESULT)

        self.client.force_authenticate(world.member_a)
        deleted = self.client.delete(draft_url)
        self.assertEqual(deleted.status_code, 404)
        self.assertTrue(AnnotationDraft.objects.filter(id=draft.id).exists())

    def test_foreign_draft_conversion_is_404(self):
        world = make_access_world()
        task = TaskFactory(project=world.project_1)
        draft = AnnotationDraftFactory(task=task, user=world.member_b, result=SECRET_DRAFT_RESULT)
        self.client.force_authenticate(world.member_a)
        response = self.client.post(
            reverse('tasks:api:task-annotations', kwargs={'pk': task.id}),
            {'result': [], 'draft_id': draft.id},
            format='json',
        )
        self.assertEqual(response.status_code, 404)
        self.assertFalse(Annotation.objects.filter(task=task).exists())
        self.assertTrue(AnnotationDraft.objects.filter(id=draft.id).exists())

    def test_own_draft_on_another_annotation_is_forbidden(self):
        world = make_access_world()
        task = TaskFactory(project=world.project_1)
        annotation = AnnotationFactory(
            task=task,
            project=world.project_1,
            completed_by=world.member_b,
            result=[{'id': 'kept'}],
        )
        draft = AnnotationDraftFactory(task=task, user=world.member_a, annotation=annotation, result=[])
        self.client.force_authenticate(world.member_a)
        response = self.client.post(
            reverse('tasks:api:task-annotations', kwargs={'pk': task.id}),
            {'result': [], 'draft_id': draft.id},
            format='json',
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(Annotation.objects.filter(task=task).count(), 1)
        annotation.refresh_from_db()
        self.assertEqual(annotation.completed_by_id, world.member_b.id)
        self.assertEqual(annotation.result, [{'id': 'kept'}])
        self.assertTrue(AnnotationDraft.objects.filter(id=draft.id).exists())

    def test_parent_mismatch_is_rejected(self):
        world = make_access_world()
        task = TaskFactory(project=world.project_1)
        other = TaskFactory(project=world.project_1)
        self.client.force_authenticate(world.member_a)
        before = Annotation.objects.count()

        mismatched_task = self.client.post(
            reverse('tasks:api:task-annotations', kwargs={'pk': task.id}),
            {'result': [], 'task': other.id},
            format='json',
        )
        self.assertEqual(mismatched_task.status_code, 400)
        self.assertEqual(Annotation.objects.count(), before)

        mismatched_project = self.client.post(
            reverse('tasks:api:task-annotations', kwargs={'pk': task.id}),
            {'result': [], 'project': world.project_2.id},
            format='json',
        )
        self.assertEqual(mismatched_project.status_code, 400)
        self.assertEqual(Annotation.objects.count(), before)
        self.assertFalse(Annotation.objects.filter(task=other).exists())

    def test_other_project_task_is_404(self):
        world = make_access_world()
        hidden = TaskFactory(project=world.project_2)
        self.client.force_authenticate(world.member_a)
        response = self.client.get(reverse('tasks:api:task-detail', kwargs={'pk': hidden.id}))
        self.assertEqual(response.status_code, 404)

    def test_import_keeps_historical_author_without_membership(self):
        world = make_access_world()
        self.client.force_authenticate(world.creator)
        before = ProjectMember.objects.filter(project=world.project_1, user=world.unassigned).count()
        response = self.client.post(
            reverse('data_import:api-projects:project-import', kwargs={'pk': world.project_1.id}),
            [
                {
                    'data': {'text': 'historical'},
                    'annotations': [{'completed_by': world.unassigned.id, 'result': []}],
                }
            ],
            format='json',
        )
        self.assertEqual(response.status_code, 201, response.content)
        annotation = Annotation.objects.get(project=world.project_1, completed_by=world.unassigned)
        self.assertEqual(annotation.completed_by_id, world.unassigned.id)
        membership = ProjectMember.objects.get(project=world.project_1, user=world.unassigned)
        self.assertFalse(membership.enabled)
        self.assertEqual(
            ProjectMember.objects.filter(project=world.project_1, user=world.unassigned).count(),
            before,
        )

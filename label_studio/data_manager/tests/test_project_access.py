"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import json
from types import SimpleNamespace
from unittest.mock import patch

from data_manager.models import View
from data_manager.prepare_params import PrepareParams
from django.urls import reverse
from projects.tests.access_setup import make_access_world
from rest_framework.test import APITestCase
from tasks.models import Task
from tasks.tests.factories import AnnotationDraftFactory, TaskFactory

FOREIGN_DRAFT_TEXT = 'foreign-draft-text'
OWN_DRAFT_TEXT = 'own-draft-text'


def _draft_result(text):
    return [
        {
            'value': {'choices': [text]},
            'from_name': 'label',
            'to_name': 'text',
            'type': 'choices',
        }
    ]


class DataManagerAccessTests(APITestCase):
    def test_mixed_task_ids_are_rejected_before_side_effects(self):
        world = make_access_world()
        own = TaskFactory(project=world.project_1)
        foreign = TaskFactory(project=world.project_2)
        self.client.force_authenticate(world.creator)
        url = reverse('data_manager:dm-actions')
        with (
            patch('data_manager.actions.basic.emit_webhooks_for_instance') as emit,
            patch('data_manager.actions.basic.start_job_async_or_sync') as enqueue,
        ):
            response = self.client.post(
                f'{url}?id=delete_tasks&project={world.project_1.id}',
                {'selectedItems': {'all': False, 'included': [own.id, foreign.id]}},
                format='json',
            )
        self.assertEqual(response.status_code, 404)
        self.assertTrue(Task.objects.filter(id=own.id).exists())
        self.assertTrue(Task.objects.filter(id=foreign.id).exists())
        emit.assert_not_called()
        enqueue.assert_not_called()

    def test_member_reads_data_manager_and_cannot_persist_views(self):
        world = make_access_world()
        own = TaskFactory(project=world.project_1, data={'text': 'project-one-row'})
        foreign = TaskFactory(project=world.project_2, data={'text': 'project-one-row'})
        shared = View.objects.create(
            project=world.project_1,
            user=world.creator,
            data={'title': 'shared-tab'},
            order=0,
        )
        second = View.objects.create(
            project=world.project_1,
            user=world.creator,
            data={'title': 'second-tab'},
            order=1,
        )
        self.client.force_authenticate(world.member_a)

        columns = self.client.get(reverse('data_manager:dm-columns'), {'project': world.project_1.id})
        state = self.client.get(reverse('data_manager:dm-project'), {'project': world.project_1.id})
        views = self.client.get(reverse('data_manager:api:view-list'), {'project': world.project_1.id})
        self.assertEqual(columns.status_code, 200, columns.content)
        self.assertIn('columns', columns.json())
        self.assertEqual(state.status_code, 200, state.content)
        self.assertEqual(views.status_code, 200, views.content)
        self.assertIn(shared.id, _view_ids(views.json()))

        hidden = self.client.get(reverse('data_manager:dm-columns'), {'project': world.project_2.id})
        self.assertEqual(hidden.status_code, 404)

        listed = self.client.get(
            reverse('tasks:api:task-list'),
            {
                'project': world.project_1.id,
                'query': json.dumps(
                    {
                        'filters': {
                            'conjunction': 'and',
                            'items': [
                                {
                                    'filter': 'filter:tasks:data.text',
                                    'operator': 'contains',
                                    'type': 'String',
                                    'value': 'project-one-row',
                                }
                            ],
                        }
                    }
                ),
            },
        )
        self.assertEqual(listed.status_code, 200, listed.content)
        self.assertIn(own.id, _task_ids(listed.json()))
        self.assertNotIn(foreign.id, _task_ids(listed.json()))

        request = SimpleNamespace(user=world.member_a, GET={}, data={}, query_params={})
        prepared = Task.prepared.only_filtered(
            prepare_params=PrepareParams(
                project=world.project_2.id,
                filters={
                    'conjunction': 'and',
                    'items': [
                        {
                            'filter': 'filter:tasks:data.text',
                            'operator': 'contains',
                            'type': 'String',
                            'value': 'project-one-row',
                        }
                    ],
                },
                request=request,
            )
        )
        self.assertNotIn(foreign.id, list(prepared.values_list('id', flat=True)))

        before = list(View.objects.filter(project=world.project_1).order_by('id').values('id', 'data', 'order', 'is_locked'))
        created = self.client.post(
            reverse('data_manager:api:view-list') + f'?project={world.project_1.id}',
            {'project': world.project_1.id, 'data': {'title': 'member-tab'}},
            format='json',
        )
        updated = self.client.patch(
            reverse('data_manager:api:view-detail', kwargs={'pk': shared.id}),
            {'data': {'title': 'rewritten'}},
            format='json',
        )
        locked = self.client.patch(
            reverse('data_manager:api:view-detail', kwargs={'pk': shared.id}),
            {'is_locked': True},
            format='json',
        )
        ordered = self.client.post(
            reverse('data_manager:api:view-update-order'),
            {'project': world.project_1.id, 'ids': [second.id, shared.id]},
            format='json',
        )
        reset = self.client.delete(
            reverse('data_manager:api:view-reset') + f'?project={world.project_1.id}'
        )
        self.assertEqual(created.status_code, 403)
        self.assertEqual(updated.status_code, 403)
        self.assertEqual(locked.status_code, 403)
        self.assertEqual(ordered.status_code, 403)
        self.assertEqual(reset.status_code, 403)
        after = list(View.objects.filter(project=world.project_1).order_by('id').values('id', 'data', 'order', 'is_locked'))
        self.assertEqual(after, before)
        self.assertFalse(View.objects.filter(data__title='member-tab').exists())

    def test_member_next_task_is_allowed_and_delete_is_forbidden(self):
        world = make_access_world()
        task = TaskFactory(project=world.project_1)
        self.client.force_authenticate(world.member_a)
        url = reverse('data_manager:dm-actions')

        nxt = self.client.post(
            f'{url}?id=next_task&project={world.project_1.id}',
            {'selectedItems': {'all': True, 'excluded': []}},
            format='json',
        )
        self.assertEqual(nxt.status_code, 200, nxt.content)

        deleted = self.client.post(
            f'{url}?id=delete_tasks&project={world.project_1.id}',
            {'selectedItems': {'all': False, 'included': [task.id]}},
            format='json',
        )
        self.assertEqual(deleted.status_code, 403)
        self.assertTrue(Task.objects.filter(id=task.id).exists())

    def test_project_state_flags_follow_management(self):
        world = make_access_world()
        url = reverse('data_manager:dm-project')

        self.client.force_authenticate(world.member_a)
        member = self.client.get(url, {'project': world.project_1.id})
        self.assertEqual(member.status_code, 200, member.content)
        for field in ('can_delete_tasks', 'can_manage_annotations', 'can_manage_tasks'):
            self.assertIs(member.json()[field], False)

        self.client.force_authenticate(world.creator)
        manager = self.client.get(url, {'project': world.project_1.id})
        self.assertEqual(manager.status_code, 200, manager.content)
        for field in ('can_delete_tasks', 'can_manage_annotations', 'can_manage_tasks'):
            self.assertIs(manager.json()[field], True)

    def test_view_project_must_match_url_project(self):
        world = make_access_world()
        view = View.objects.create(project=world.project_1, user=world.owner, data={'title': 'kept'}, order=0)
        self.client.force_authenticate(world.owner)
        before = View.objects.count()

        created = self.client.post(
            reverse('data_manager:api:view-list') + f'?project={world.project_1.id}',
            {'project': world.project_2.id, 'data': {'title': 'rejected'}},
            format='json',
        )
        self.assertEqual(created.status_code, 400)
        self.assertEqual(View.objects.count(), before)

        updated = self.client.patch(
            reverse('data_manager:api:view-detail', kwargs={'pk': view.id}) + f'?project={world.project_2.id}',
            {'data': {'title': 'changed'}},
            format='json',
        )
        self.assertEqual(updated.status_code, 400)
        view.refresh_from_db()
        self.assertEqual(view.project_id, world.project_1.id)
        self.assertEqual(view.data, {'title': 'kept'})

    def test_draft_exists_counts_only_the_current_users_drafts(self):
        world = make_access_world()
        task = TaskFactory(project=world.project_1, data={'text': 'draft-row'})
        AnnotationDraftFactory(task=task, user=world.creator, result=_draft_result(FOREIGN_DRAFT_TEXT))
        own_task = TaskFactory(project=world.project_1, data={'text': 'draft-row'})
        AnnotationDraftFactory(task=own_task, user=world.member_a, result=_draft_result(OWN_DRAFT_TEXT))
        query = json.dumps({'hiddenColumns': {'explore': [], 'labeling': []}})

        self.client.force_authenticate(world.member_a)
        member = self.client.get(
            reverse('tasks:api:task-list'),
            {'project': world.project_1.id, 'query': query},
        )
        self.assertEqual(member.status_code, 200, member.content)
        member_body = member.content.decode()
        self.assertNotIn(FOREIGN_DRAFT_TEXT, member_body)
        self.assertNotIn(OWN_DRAFT_TEXT, member_body)
        member_flags = {row['id']: row['draft_exists'] for row in member.json()['tasks']}
        self.assertIs(member_flags[task.id], False)
        self.assertIs(member_flags[own_task.id], True)

        self.client.force_authenticate(world.creator)
        manager = self.client.get(
            reverse('tasks:api:task-list'),
            {'project': world.project_1.id, 'query': query},
        )
        self.assertEqual(manager.status_code, 200, manager.content)
        manager_body = manager.content.decode()
        self.assertNotIn(FOREIGN_DRAFT_TEXT, manager_body)
        self.assertNotIn(OWN_DRAFT_TEXT, manager_body)
        manager_flags = {row['id']: row['draft_exists'] for row in manager.json()['tasks']}
        self.assertIs(manager_flags[task.id], True)
        self.assertIs(manager_flags[own_task.id], False)

    def test_manage_action_form_is_refused_to_members(self):
        world = make_access_world()
        self.client.force_authenticate(world.member_a)

        delete_form = self.client.get(
            reverse('data_manager:dm-actions-form', kwargs={'action_id': 'delete_tasks'}),
            {'project': world.project_1.id},
        )
        self.assertEqual(delete_form.status_code, 403)

        next_form = self.client.get(
            reverse('data_manager:dm-actions-form', kwargs={'action_id': 'next_task'}),
            {'project': world.project_1.id},
        )
        self.assertEqual(next_form.status_code, 200, next_form.content)

        hidden = self.client.get(
            reverse('data_manager:dm-actions-form', kwargs={'action_id': 'delete_tasks'}),
            {'project': world.project_2.id},
        )
        self.assertEqual(hidden.status_code, 404)


def _view_ids(payload):
    rows = payload['results'] if isinstance(payload, dict) and 'results' in payload else payload
    return [row['id'] for row in rows]


def _task_ids(payload):
    return [row['id'] for row in payload['tasks']]

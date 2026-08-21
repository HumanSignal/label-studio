"""Test data_manager.api module functionality.

This file tests TaskPagination: .only('id') during pagination and the
single-Sum totals path (FIT-2416) used by the live DM list endpoint.
"""

from unittest.mock import MagicMock, patch

from data_manager.api import TaskPagination
from data_manager.managers import apply_filters
from data_manager.prepare_params import Filter, Filters
from django.test import TestCase
from organizations.tests.factories import OrganizationFactory
from projects.models import ProjectMember
from projects.tests.factories import ProjectFactory
from rest_framework.pagination import PageNumberPagination
from rest_framework.test import APITestCase
from tasks.models import Annotation, Task
from tasks.tests.factories import AnnotationFactory, PredictionFactory, TaskFactory
from users.tests.factories import UserFactory


class TestTaskPaginationMemoryOptimization(TestCase):
    """Test TaskPagination uses .only('id') to avoid loading heavy fields.

    The optimization prevents loading full task objects (with potentially
    multi-megabyte data fields) during pagination. Only task IDs are loaded;
    full task objects are loaded later with proper annotations.

    Critical validation: The queryset passed to the parent paginate_queryset
    must have .only('id') applied to defer loading of heavy fields.
    """

    def setUp(self):
        """Set up test fixtures."""
        self.pagination = TaskPagination()
        self.mock_request = MagicMock()
        self.mock_request.query_params = {'page': '1', 'page_size': '30'}

    def test_live_path_uses_sum_aggregate_and_only_id(self):
        """FIT-2416: live pagination uses Sum over task counters and .only('id') for the page.

        Totals must come from a single Sum aggregate over denormalized
        task.total_annotations / total_predictions (not Prediction/Annotation COUNT).
        The page slice must defer heavy task.data via .only('id').
        """
        mock_queryset = MagicMock()
        mock_id_only_queryset = MagicMock()
        mock_queryset.only.return_value = mock_id_only_queryset
        mock_queryset.values.return_value.aggregate.return_value = {
            'total_annotations': 7,
            'total_predictions': 3,
        }

        with patch.object(PageNumberPagination, 'paginate_queryset', return_value=[]) as mock_parent_paginate:
            self.pagination.paginate_queryset(mock_queryset, self.mock_request)

        mock_queryset.values.assert_called_once_with('id')
        mock_queryset.values.return_value.aggregate.assert_called_once()
        mock_queryset.only.assert_called_once_with('id')
        mock_parent_paginate.assert_called_once_with(mock_id_only_queryset, self.mock_request, None)
        assert self.pagination.total_annotations == 7
        assert self.pagination.total_predictions == 3

    def test_legacy_triple_count_paginate_helpers_removed(self):
        """Dead sync/async COUNT helpers must not remain on TaskPagination."""
        assert not hasattr(TaskPagination, 'sync_paginate_queryset')
        assert not hasattr(TaskPagination, 'async_paginate_queryset')


class TestTaskPaginationTotalsIntegration(APITestCase):
    """Integration: paginated DM response totals match Sum over filtered tasks."""

    @classmethod
    def setUpTestData(cls):
        cls.project = ProjectFactory()
        cls.owner = cls.project.created_by
        cls.tasks = [
            TaskFactory(project=cls.project, data={'text': f't{i}'}, total_annotations=0, total_predictions=0)
            for i in range(4)
        ]

        # Task 0: 2 annotations + 1 prediction
        AnnotationFactory(task=cls.tasks[0], project=cls.project, completed_by=cls.owner)
        AnnotationFactory(task=cls.tasks[0], project=cls.project, completed_by=cls.owner)
        PredictionFactory(task=cls.tasks[0], project=cls.project)
        # Task 1: 1 cancelled (excluded) + 1 live annotation + 2 predictions
        AnnotationFactory(task=cls.tasks[1], project=cls.project, completed_by=cls.owner, was_cancelled=True)
        AnnotationFactory(task=cls.tasks[1], project=cls.project, completed_by=cls.owner)
        PredictionFactory(task=cls.tasks[1], project=cls.project)
        PredictionFactory(task=cls.tasks[1], project=cls.project)
        # Task 2: predictions only
        PredictionFactory(task=cls.tasks[2], project=cls.project)

        for task in cls.tasks:
            task.refresh_from_db()

    def test_dm_list_totals_match_annotated_sum(self):
        """GET /api/tasks totals equal Sum of task counters for the filtered set."""
        self.client.force_authenticate(self.owner)
        expected_annotations = sum(t.total_annotations for t in self.tasks)
        expected_predictions = sum(t.total_predictions for t in self.tasks)
        assert expected_annotations == 3
        assert expected_predictions == 4

        response = self.client.get(
            '/api/tasks/',
            {'project': self.project.id, 'page_size': 2, 'page': 1},
        )

        assert response.status_code == 200
        body = response.json()
        assert body['total'] == 4
        assert body['total_annotations'] == expected_annotations
        assert body['total_predictions'] == expected_predictions
        assert len(body['tasks']) == 2


class TestTaskListVisibleDataPayload(APITestCase):
    """FIT-2416: DM list omits task.data keys hidden in both explore and labeling."""

    def test_hidden_data_columns_omitted_from_list_response(self):
        """GET /api/tasks with View.hiddenColumns drops keys before URI resolve."""
        from data_manager.models import View

        project = ProjectFactory(
            label_config="""
            <View>
              <Text name="text" value="$keep"/>
              <Choices name="label" toName="text">
                <Choice value="a"/>
              </Choices>
            </View>
            """
        )
        task = TaskFactory(project=project, data={'keep': 'yes', 'drop': 'no'})
        summary = project.summary
        summary.all_data_columns = {'keep': 1, 'drop': 1}
        summary.save(update_fields=['all_data_columns'])
        view = View.objects.create(
            project=project,
            data={
                'hiddenColumns': {
                    'explore': ['tasks:data.drop'],
                    'labeling': ['tasks:data.drop'],
                }
            },
        )

        self.client.force_authenticate(project.created_by)
        response = self.client.get(
            '/api/tasks/',
            {'project': project.id, 'view': view.id, 'resolve_uri': '0', 'page_size': 10},
        )

        assert response.status_code == 200
        task_payload = next(t for t in response.json()['tasks'] if t['id'] == task.id)
        assert task_payload['data'] == {'keep': 'yes'}
        assert 'drop' not in task_payload['data']


class TestTaskListUnqueryableDataColumnFilter(APITestCase):
    """UTC-1221: a saved filter on an unqueryable task.data key must not crash the task list."""

    @classmethod
    def setUpTestData(cls):
        cls.project = ProjectFactory()
        cls.task = TaskFactory(project=cls.project, data={'my column': 'keep me', 'safe_column': 'keep me'})

    def _list_with_filter(self, column):
        self.client.force_authenticate(self.project.created_by)
        view = self.client.post(
            f'/api/dm/views/?project={self.project.id}',
            {
                'project': self.project.id,
                'data': {
                    'filters': {
                        'conjunction': 'and',
                        'items': [
                            {
                                'filter': f'filter:tasks:data.{column}',
                                'operator': 'contains',
                                'type': 'String',
                                'value': 'keep',
                            }
                        ],
                    }
                },
            },
            format='json',
        )
        assert view.status_code == 201
        return self.client.get('/api/tasks/', {'project': self.project.id, 'view': view.json()['id'], 'page_size': 10})

    def test_filter_on_unqueryable_column_returns_bad_request(self):
        response = self._list_with_filter('my column')

        assert response.status_code == 400
        assert 'my column' in str(response.json())

    def test_filter_on_queryable_column_still_returns_tasks(self):
        response = self._list_with_filter('safe_column')

        assert response.status_code == 200
        assert [task['id'] for task in response.json()['tasks']] == [self.task.id]


class TestProjectUsersOptionsAPI(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.organization = OrganizationFactory()
        cls.project = ProjectFactory(organization=cls.organization, created_by=cls.organization.created_by)
        cls.first_member = UserFactory(
            active_organization=cls.organization,
            first_name='Alice',
            last_name='Member',
            email='alice@example.test',
        )
        cls.second_member = UserFactory(
            active_organization=cls.organization,
            first_name='Bob',
            last_name='Member',
            email='bob@example.test',
        )
        cls.org_only_user = UserFactory(active_organization=cls.organization)
        ProjectMember.objects.create(project=cls.project, user=cls.first_member)
        ProjectMember.objects.create(project=cls.project, user=cls.second_member)

    def _list(self, user, query=''):
        self.client.force_authenticate(user)
        suffix = f'?{query}' if query else ''
        return self.client.get(f'/api/dm/projects/{self.project.id}/user-options/{suffix}')

    def test_project_member_can_search_project_options(self):
        response = self._list(self.first_member, 'search=alice&page_size=1')

        assert response.status_code == 200
        assert response.json()['count'] == 1
        assert [user['id'] for user in response.json()['results']] == [self.first_member.id]

    def test_selected_value_is_first_with_pagination(self):
        response = self._list(self.first_member, f'page_size=1&selected_value={self.second_member.id}')

        assert response.status_code == 200
        assert response.json()['count'] == 2
        assert [user['id'] for user in response.json()['results']] == [self.second_member.id]

    def test_orders_before_page_slicing(self):
        response = self._list(self.first_member, 'ordering=-email&page_size=1')

        assert response.status_code == 200
        assert [user['id'] for user in response.json()['results']] == [self.second_member.id]

    def test_org_only_user_is_not_an_option(self):
        response = self._list(self.first_member, 'page_size=100')

        assert response.status_code == 200
        assert self.org_only_user.id not in {user['id'] for user in response.json()['results']}

    def test_default_page_size_and_last_page(self):
        extra_members = UserFactory.create_batch(31, active_organization=self.organization)
        ProjectMember.objects.bulk_create(
            [ProjectMember(project=self.project, user=member) for member in extra_members]
        )

        first_page = self._list(self.first_member)
        last_page = self._list(self.first_member, 'page=2')

        assert first_page.status_code == 200
        assert first_page.json()['count'] == 33
        assert len(first_page.json()['results']) == 30
        assert first_page.json()['next'] is not None
        assert last_page.status_code == 200
        assert len(last_page.json()['results']) == 3
        assert last_page.json()['next'] is None

    def test_rejects_out_of_range_page_sizes(self):
        assert self._list(self.first_member, 'page_size=-1').status_code == 400
        assert self._list(self.first_member, 'page_size=101').status_code == 400

    def test_project_from_another_organization_is_not_visible(self):
        other_organization = OrganizationFactory()
        other_project = ProjectFactory(organization=other_organization, created_by=other_organization.created_by)

        self.client.force_authenticate(self.first_member)
        response = self.client.get(f'/api/dm/projects/{other_project.id}/user-options/')

        assert response.status_code == 404


class TestProjectUsersColumnOptionsAPI(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.project = ProjectFactory()
        cls.owner = cls.project.created_by
        cls.annotator = UserFactory(active_organization=cls.project.organization)
        cls.updated_by = UserFactory(active_organization=cls.project.organization)
        cls.annotation_updated_by = UserFactory(active_organization=cls.project.organization)
        cls.non_participant = UserFactory(active_organization=cls.project.organization)
        cls.departed_annotator = UserFactory(active_organization=cls.project.organization)

        for user in (cls.annotator, cls.updated_by, cls.annotation_updated_by, cls.non_participant):
            ProjectMember.objects.create(project=cls.project, user=user)

        task = TaskFactory(project=cls.project, updated_by=cls.updated_by)
        AnnotationFactory(task=task, completed_by=cls.annotator, updated_by=cls.annotation_updated_by)
        AnnotationFactory(task=task, completed_by=cls.departed_annotator)

    def _list(self, column, **params):
        self.client.force_authenticate(self.owner)
        return self.client.get(
            f'/api/dm/projects/{self.project.id}/user-options/',
            {'column': column, **params},
        )

    @staticmethod
    def _user_ids(response):
        return [user['id'] for user in response.json()['results']]

    def test_annotators_unions_project_membership_with_annotation_authors(self):
        """Options are current members ∪ annotation authors (including departed authors)."""
        response = self._list('annotators')

        assert response.status_code == 200
        assert set(self._user_ids(response)) == self._membership_user_ids() | {
            self.annotator.id,
            self.departed_annotator.id,
        }

    def test_updated_by_unions_membership_with_task_and_annotation_updaters(self):
        """Membership half keeps non-updaters; updater sources stay included."""
        response = self._list('updated_by')

        assert response.status_code == 200
        assert set(self._user_ids(response)) == self._membership_user_ids()

    def test_search_still_narrows_union_options(self):
        response = self._list(
            'annotators',
            search=self.annotator.email,
            page_size=1,
            selected_value=f'{self.departed_annotator.id},{self.annotator.id}',
        )

        assert response.status_code == 200
        assert response.json()['count'] == 1
        assert self._user_ids(response) == [self.annotator.id]

    def test_selected_value_rehydrates_departed_column_candidate(self):
        response = self._list(
            'annotators',
            page_size=1,
            selected_value=str(self.departed_annotator.id),
        )

        assert response.status_code == 200
        assert self.departed_annotator.id in self._user_ids(response)

    def test_soft_deleted_member_only_appears_via_column_predicate(self):
        """Soft-deleted ProjectMembers must not leak into unrelated column pickers."""
        soft_deleted = UserFactory(active_organization=self.project.organization)
        ProjectMember.objects.create(project=self.project, user=soft_deleted)
        AnnotationFactory(task=TaskFactory(project=self.project), completed_by=soft_deleted)
        soft_deleted.om_through.get(organization=self.project.organization).soft_delete()

        annotators = self._list('annotators')
        updated_by = self._list('updated_by')

        assert annotators.status_code == 200
        assert updated_by.status_code == 200
        assert soft_deleted.id in set(self._user_ids(annotators))
        assert soft_deleted.id not in set(self._user_ids(updated_by))

    def test_unknown_column_is_rejected(self):
        response = self._list('created_by')

        assert response.status_code == 400

    def test_lse_only_columns_are_rejected_on_lso(self):
        """LSE-only aliases must 400 on LSO — not silently return an empty 200."""
        for column in ('reviewers', 'comment_authors', 'skipped_by_annotator'):
            with self.subTest(column=column):
                assert self._list(column).status_code == 400

    def test_project_member_can_list_column_options(self):
        expected = self._membership_user_ids() | {self.departed_annotator.id}
        self.client.force_authenticate(self.annotator)
        response = self.client.get(
            f'/api/dm/projects/{self.project.id}/user-options/',
            {'column': 'annotators'},
        )

        assert response.status_code == 200
        assert set(self._user_ids(response)) == expected

    def test_non_member_follows_lso_organization_wide_project_visibility(self):
        ProjectMember.objects.filter(project=self.project, user=self.annotator).delete()
        expected = {
            self.updated_by.id,
            self.annotation_updated_by.id,
            self.non_participant.id,
            self.annotator.id,
            self.departed_annotator.id,
        }
        self.client.force_authenticate(self.annotator)
        response = self.client.get(
            f'/api/dm/projects/{self.project.id}/user-options/',
            {'column': 'annotators'},
        )

        assert response.status_code == 200
        assert set(self._user_ids(response)) == expected

    def _membership_user_ids(self):
        self.client.force_authenticate(self.owner)
        response = self.client.get(f'/api/dm/projects/{self.project.id}/user-options/')
        assert response.status_code == 200
        return set(self._user_ids(response))

    def _root_filter_matches(self, column, user_id):
        filters = Filters(
            conjunction='and',
            items=[
                Filter(
                    filter=f'filter:tasks:{column}',
                    operator='contains',
                    type='List',
                    value=[user_id],
                )
            ],
        )
        return apply_filters(Task.objects.filter(project=self.project), filters, self.project, request=None).exists()

    def _child_matcher_ids(self, column):
        annotations = Annotation.objects.filter(project=self.project)
        if column == 'annotators':
            return set(annotations.exclude(completed_by_id=None).values_list('completed_by_id', flat=True))
        if column == 'updated_by':
            return set(annotations.exclude(updated_by_id=None).values_list('updated_by_id', flat=True))
        raise AssertionError(f'Unsupported column {column}')

    def test_column_options_cover_membership_and_predicate_matchers(self):
        """Options include all current members and every root/child predicate matcher."""
        access_ids = self._membership_user_ids()

        for column in ('annotators', 'updated_by'):
            with self.subTest(column=column):
                option_ids = set(self._user_ids(self._list(column)))
                root_matchers = {user_id for user_id in access_ids if self._root_filter_matches(column, user_id)}
                child_matchers = self._child_matcher_ids(column)

                assert access_ids <= option_ids
                assert root_matchers <= option_ids
                assert child_matchers <= option_ids

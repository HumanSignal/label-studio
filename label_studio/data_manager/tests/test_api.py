"""Test data_manager.api module functionality.

This file tests the TaskPagination class optimizations that prevent
loading heavy task.data fields during pagination.
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
from tasks.tests.factories import AnnotationFactory, TaskFactory
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

    def test_sync_paginate_queryset_uses_only_id(self):
        """Test sync_paginate_queryset applies .only('id') optimization.

        This test validates:
        - The queryset passed to parent's paginate_queryset has .only('id') applied
        - Count queries still work with the original queryset
        - The optimization is always applied (no feature flag)
        """
        mock_queryset = MagicMock()
        mock_id_only_queryset = MagicMock()
        mock_queryset.only.return_value = mock_id_only_queryset

        with patch('data_manager.api.Prediction') as mock_prediction:
            with patch('data_manager.api.Annotation') as mock_annotation:
                # Setup count mocks
                mock_prediction.objects.filter.return_value.count.return_value = 10
                mock_annotation.objects.filter.return_value.count.return_value = 5

                # Mock the parent's paginate_queryset
                with patch.object(PageNumberPagination, 'paginate_queryset', return_value=[]) as mock_parent_paginate:
                    self.pagination.sync_paginate_queryset(mock_queryset, self.mock_request)

                    # Verify .only('id') was called on the queryset
                    mock_queryset.only.assert_called_once_with('id')

                    # Verify parent's paginate_queryset was called with the id-only queryset
                    mock_parent_paginate.assert_called_once()
                    call_args = mock_parent_paginate.call_args
                    assert call_args[0][0] is mock_id_only_queryset

    def test_paginate_totals_queryset_uses_only_id(self):
        """Test paginate_totals_queryset applies .only('id') optimization.

        This test validates:
        - Pagination totals use .only('id') for the page slice
        - Aggregate queries work correctly
        """
        mock_queryset = MagicMock()
        mock_id_only_queryset = MagicMock()
        mock_queryset.only.return_value = mock_id_only_queryset
        mock_queryset.values.return_value.aggregate.return_value = {
            'total_annotations': 10,
            'total_predictions': 5,
        }

        with patch.object(PageNumberPagination, 'paginate_queryset', return_value=[]) as mock_parent_paginate:
            self.pagination.paginate_totals_queryset(mock_queryset, self.mock_request)

            # Verify .only('id') was called on the queryset
            mock_queryset.only.assert_called_once_with('id')

            # Verify parent's paginate_queryset was called with the id-only queryset
            mock_parent_paginate.assert_called_once()
            call_args = mock_parent_paginate.call_args
            assert call_args[0][0] is mock_id_only_queryset

    def test_count_queries_use_original_queryset(self):
        """Test that count queries use the original queryset (for correct subqueries).

        This test validates:
        - Prediction count query uses the original queryset, not the .only('id') version
        - Annotation count query uses the original queryset
        - This ensures subquery counts work correctly
        """
        mock_queryset = MagicMock()
        mock_id_only_queryset = MagicMock()
        mock_queryset.only.return_value = mock_id_only_queryset

        with patch('data_manager.api.Prediction') as mock_prediction:
            with patch('data_manager.api.Annotation') as mock_annotation:
                mock_prediction.objects.filter.return_value.count.return_value = 10
                mock_annotation.objects.filter.return_value.count.return_value = 5

                with patch.object(PageNumberPagination, 'paginate_queryset', return_value=[]):
                    self.pagination.sync_paginate_queryset(mock_queryset, self.mock_request)

                    # Verify count queries used the ORIGINAL queryset (not id-only)
                    mock_prediction.objects.filter.assert_called_once()
                    prediction_filter_kwargs = mock_prediction.objects.filter.call_args[1]
                    assert prediction_filter_kwargs['task_id__in'] is mock_queryset

                    mock_annotation.objects.filter.assert_called_once()
                    annotation_filter_kwargs = mock_annotation.objects.filter.call_args[1]
                    assert annotation_filter_kwargs['task_id__in'] is mock_queryset


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

    def test_annotators_intersects_project_membership_with_annotation_authors(self):
        response = self._list('annotators')

        assert response.status_code == 200
        assert self._user_ids(response) == [self.annotator.id]

    def test_updated_by_unions_task_and_annotation_updaters(self):
        response = self._list('updated_by')

        assert response.status_code == 200
        assert set(self._user_ids(response)) == {self.updated_by.id, self.annotation_updated_by.id}

    def test_search_pagination_and_selected_value_keep_predicate_scope(self):
        response = self._list(
            'annotators',
            search=self.annotator.email,
            page_size=1,
            selected_value=f'{self.departed_annotator.id},{self.annotator.id}',
        )

        assert response.status_code == 200
        assert response.json()['count'] == 1
        assert self._user_ids(response) == [self.annotator.id]

    def test_unknown_column_is_rejected(self):
        response = self._list('created_by')

        assert response.status_code == 400

    def test_lse_only_columns_are_rejected_on_lso(self):
        """LSE-only aliases must 400 on LSO — not silently return an empty 200."""
        for column in ('reviewers', 'comment_authors', 'skipped_by_annotator'):
            with self.subTest(column=column):
                assert self._list(column).status_code == 400

    def test_project_member_can_list_column_options(self):
        self.client.force_authenticate(self.annotator)
        response = self.client.get(
            f'/api/dm/projects/{self.project.id}/user-options/',
            {'column': 'annotators'},
        )

        assert response.status_code == 200
        assert self._user_ids(response) == [self.annotator.id]

    def test_non_member_follows_lso_organization_wide_project_visibility(self):
        ProjectMember.objects.filter(project=self.project, user=self.annotator).delete()
        self.client.force_authenticate(self.annotator)
        response = self.client.get(
            f'/api/dm/projects/{self.project.id}/user-options/',
            {'column': 'annotators'},
        )

        assert response.status_code == 200
        assert self._user_ids(response) == []

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

    def test_column_options_cover_root_and_child_predicate_matchers(self):
        """Every project-access user who can match a root/child predicate is in options."""
        access_ids = self._membership_user_ids()

        for column in ('annotators', 'updated_by'):
            with self.subTest(column=column):
                option_ids = set(self._user_ids(self._list(column)))
                root_matchers = {user_id for user_id in access_ids if self._root_filter_matches(column, user_id)}
                child_matchers = self._child_matcher_ids(column) & access_ids

                assert root_matchers <= option_ids
                assert child_matchers <= option_ids

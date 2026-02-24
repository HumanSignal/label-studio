"""Tests for lazy loading annotations feature (FIT-720).

This module tests the AnnotationStubSerializer and the annotations_stub
query parameter for the TaskAPI endpoint.

Feature flag fixtures are defined in tasks/tests/conftest.py:
- fflag_fix_all_fit_720_lazy_load_annotations_on: Enable the feature flag
- fflag_fix_all_fit_720_lazy_load_annotations_off: Disable the feature flag
"""
import pytest
from organizations.tests.factories import OrganizationFactory
from projects.tests.factories import ProjectFactory
from rest_framework.test import APITestCase
from tasks.serializers import AnnotationSerializer, AnnotationStubSerializer
from tasks.tests.factories import AnnotationFactory, TaskFactory


class TestAnnotationStubSerializer(APITestCase):
    """Test the AnnotationStubSerializer excludes result field and includes is_stub flag."""

    @classmethod
    def setUpTestData(cls):
        cls.organization = OrganizationFactory(created_by_active_organization=True)
        cls.project = ProjectFactory(organization=cls.organization)
        cls.user = cls.organization.created_by
        cls.task = TaskFactory(project=cls.project, data={'text': 'test'})
        cls.annotation = AnnotationFactory(
            task=cls.task,
            completed_by=cls.user,
            result=[
                {
                    'from_name': 'label',
                    'to_name': 'text',
                    'type': 'labels',
                    'value': {'labels': ['class_A'], 'start': 0, 'end': 10},
                }
            ],
        )

    def test_stub_serializer_excludes_result(self):
        """Test that AnnotationStubSerializer does not include the result field."""
        serializer = AnnotationStubSerializer(self.annotation)
        data = serializer.data

        # Result should NOT be in the stub serializer
        assert 'result' not in data

    def test_stub_serializer_includes_is_stub_flag(self):
        """Test that AnnotationStubSerializer includes is_stub=True."""
        serializer = AnnotationStubSerializer(self.annotation)
        data = serializer.data

        assert 'is_stub' in data
        assert data['is_stub'] is True

    def test_stub_serializer_includes_metadata(self):
        """Test that AnnotationStubSerializer includes only minimal required metadata fields."""
        serializer = AnnotationStubSerializer(self.annotation)
        data = serializer.data

        # Minimal metadata fields for displaying annotation list
        # (reduced to minimize payload size while keeping UI indicators)
        required_fields = [
            'id',
            'created_ago',
            'created_at',  # needed for TimeAgo component to display correct timestamp
            'created_username',
            'completed_by',
            'ground_truth',  # needed for star indicator in UI
            'was_cancelled',  # needed for skip queue / cancel-skip button display
            'is_stub',
        ]

        for field in required_fields:
            assert field in data, f"Field '{field}' should be in stub serializer"

        # Verify we're NOT including heavyweight fields that were removed
        removed_fields = ['updated_at', 'lead_time', 'result']
        for field in removed_fields:
            assert field not in data, f"Field '{field}' should NOT be in minimal stub serializer"

    def test_full_serializer_includes_result(self):
        """Test that the full AnnotationSerializer includes the result field."""
        serializer = AnnotationSerializer(self.annotation)
        data = serializer.data

        # Result should be in the full serializer
        assert 'result' in data
        assert len(data['result']) == 1
        assert data['result'][0]['type'] == 'labels'

    def test_full_serializer_does_not_have_is_stub(self):
        """Test that the full AnnotationSerializer does not include is_stub flag."""
        serializer = AnnotationSerializer(self.annotation)
        data = serializer.data

        # is_stub should NOT be in the full serializer
        assert 'is_stub' not in data


class TestAnnotationsStubQueryParameter(APITestCase):
    """Test the annotations_stub query parameter for TaskAPI."""

    @classmethod
    def setUpTestData(cls):
        cls.organization = OrganizationFactory(created_by_active_organization=True)
        cls.project = ProjectFactory(organization=cls.organization)
        cls.user = cls.organization.created_by
        cls.task = TaskFactory(project=cls.project, data={'text': 'test'})
        cls.annotation = AnnotationFactory(
            task=cls.task,
            completed_by=cls.user,
            result=[
                {
                    'from_name': 'label',
                    'to_name': 'text',
                    'type': 'labels',
                    'value': {'labels': ['class_A'], 'start': 0, 'end': 10},
                }
            ],
        )

    @pytest.mark.usefixtures('fflag_fix_all_fit_720_lazy_load_annotations_on')
    def test_task_api_with_annotations_stub_enabled(self):
        """Test that TaskAPI returns stub annotations when feature flag is enabled and annotations_stub=true."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{self.task.id}/?annotations_stub=true')

        assert response.status_code == 200
        data = response.json()

        assert 'annotations' in data
        assert len(data['annotations']) == 1

        annotation_data = data['annotations'][0]
        # When stub mode is enabled, result should be excluded and is_stub should be True
        assert 'result' not in annotation_data
        assert annotation_data.get('is_stub') is True

    @pytest.mark.usefixtures('fflag_fix_all_fit_720_lazy_load_annotations_on')
    def test_task_api_without_annotations_stub(self):
        """Test that TaskAPI returns full annotations when annotations_stub is not set."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{self.task.id}/')

        assert response.status_code == 200
        data = response.json()

        assert 'annotations' in data
        assert len(data['annotations']) == 1

        annotation_data = data['annotations'][0]
        # Without stub mode, result should be included
        assert 'result' in annotation_data
        assert 'is_stub' not in annotation_data

    @pytest.mark.usefixtures('fflag_fix_all_fit_720_lazy_load_annotations_off')
    def test_task_api_with_feature_flag_disabled(self):
        """Test that TaskAPI ignores annotations_stub when feature flag is disabled."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{self.task.id}/?annotations_stub=true')

        assert response.status_code == 200
        data = response.json()

        assert 'annotations' in data
        assert len(data['annotations']) == 1

        annotation_data = data['annotations'][0]
        # With feature flag disabled, annotations_stub should be ignored
        # and full annotations should be returned
        assert 'result' in annotation_data
        assert 'is_stub' not in annotation_data


class TestSingleAnnotationEndpoint(APITestCase):
    """Test the single annotation endpoint for lazy loading."""

    @classmethod
    def setUpTestData(cls):
        cls.organization = OrganizationFactory(created_by_active_organization=True)
        cls.project = ProjectFactory(organization=cls.organization)
        cls.user = cls.organization.created_by
        cls.task = TaskFactory(project=cls.project, data={'text': 'test'})
        cls.annotation = AnnotationFactory(
            task=cls.task,
            completed_by=cls.user,
            result=[
                {
                    'from_name': 'label',
                    'to_name': 'text',
                    'type': 'labels',
                    'value': {'labels': ['class_A'], 'start': 0, 'end': 10},
                }
            ],
        )

    def test_get_single_annotation(self):
        """Test that single annotation endpoint returns full annotation data."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/annotations/{self.annotation.id}/')

        assert response.status_code == 200
        data = response.json()

        # Single annotation endpoint should always return full data
        assert 'result' in data
        assert len(data['result']) == 1
        assert data['result'][0]['type'] == 'labels'
        assert data['id'] == self.annotation.id


class TestTaskAgreementAPI(APITestCase):
    """Test the task agreement endpoint for efficient label aggregation (FIT-720)."""

    @classmethod
    def setUpTestData(cls):
        cls.organization = OrganizationFactory(created_by_active_organization=True)
        cls.project = ProjectFactory(organization=cls.organization)
        cls.user = cls.organization.created_by
        cls.task = TaskFactory(project=cls.project, data={'text': 'test'})

    @pytest.mark.usefixtures('fflag_fix_all_fit_720_lazy_load_annotations_off')
    def test_agreement_endpoint_requires_feature_flag(self):
        """Test that agreement endpoint returns 403 when feature flag is disabled."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{self.task.id}/agreement/')

        assert response.status_code == 403
        assert response.json()['detail'] == 'Feature not enabled'

    @pytest.mark.usefixtures('fflag_fix_all_fit_720_lazy_load_annotations_on')
    def test_agreement_endpoint_empty_task(self):
        """Test agreement endpoint returns empty distributions for task with no annotations."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{self.task.id}/agreement/')

        assert response.status_code == 200
        data = response.json()

        assert data['total_annotations'] == 0
        assert data['distributions'] == {}

    @pytest.mark.usefixtures('fflag_fix_all_fit_720_lazy_load_annotations_on')
    def test_agreement_endpoint_with_labels(self):
        """Test agreement endpoint correctly aggregates label annotations."""
        # Create multiple annotations with different labels
        AnnotationFactory(
            task=self.task,
            completed_by=self.user,
            result=[
                {
                    'from_name': 'label',
                    'to_name': 'text',
                    'type': 'labels',
                    'value': {'labels': ['Car'], 'start': 0, 'end': 10},
                }
            ],
        )
        AnnotationFactory(
            task=self.task,
            completed_by=self.user,
            result=[
                {
                    'from_name': 'label',
                    'to_name': 'text',
                    'type': 'labels',
                    'value': {'labels': ['Car'], 'start': 0, 'end': 10},
                },
                {
                    'from_name': 'label',
                    'to_name': 'text',
                    'type': 'labels',
                    'value': {'labels': ['Person'], 'start': 11, 'end': 20},
                },
            ],
        )
        AnnotationFactory(
            task=self.task,
            completed_by=self.user,
            result=[
                {
                    'from_name': 'label',
                    'to_name': 'text',
                    'type': 'labels',
                    'value': {'labels': ['Dog'], 'start': 0, 'end': 10},
                }
            ],
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{self.task.id}/agreement/')

        assert response.status_code == 200
        data = response.json()

        assert data['total_annotations'] == 3
        assert 'label' in data['distributions']
        assert data['distributions']['label']['type'] == 'labels'
        # Car appears twice, Person once, Dog once
        assert data['distributions']['label']['labels'] == {'Car': 2, 'Person': 1, 'Dog': 1}

    @pytest.mark.usefixtures('fflag_fix_all_fit_720_lazy_load_annotations_on')
    def test_agreement_endpoint_with_choices(self):
        """Test agreement endpoint correctly aggregates choices."""
        AnnotationFactory(
            task=self.task,
            completed_by=self.user,
            result=[
                {
                    'from_name': 'sentiment',
                    'to_name': 'text',
                    'type': 'choices',
                    'value': {'choices': ['Positive']},
                }
            ],
        )
        AnnotationFactory(
            task=self.task,
            completed_by=self.user,
            result=[
                {
                    'from_name': 'sentiment',
                    'to_name': 'text',
                    'type': 'choices',
                    'value': {'choices': ['Positive']},
                }
            ],
        )
        AnnotationFactory(
            task=self.task,
            completed_by=self.user,
            result=[
                {
                    'from_name': 'sentiment',
                    'to_name': 'text',
                    'type': 'choices',
                    'value': {'choices': ['Negative']},
                }
            ],
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{self.task.id}/agreement/')

        assert response.status_code == 200
        data = response.json()

        assert data['total_annotations'] == 3
        assert data['distributions']['sentiment']['type'] == 'choices'
        assert data['distributions']['sentiment']['labels'] == {'Positive': 2, 'Negative': 1}

    @pytest.mark.usefixtures('fflag_fix_all_fit_720_lazy_load_annotations_on')
    def test_agreement_endpoint_with_ratings(self):
        """Test agreement endpoint correctly calculates rating average."""
        AnnotationFactory(
            task=self.task,
            completed_by=self.user,
            result=[
                {
                    'from_name': 'rating',
                    'to_name': 'text',
                    'type': 'rating',
                    'value': {'rating': 5},
                }
            ],
        )
        AnnotationFactory(
            task=self.task,
            completed_by=self.user,
            result=[
                {
                    'from_name': 'rating',
                    'to_name': 'text',
                    'type': 'rating',
                    'value': {'rating': 3},
                }
            ],
        )
        AnnotationFactory(
            task=self.task,
            completed_by=self.user,
            result=[
                {
                    'from_name': 'rating',
                    'to_name': 'text',
                    'type': 'rating',
                    'value': {'rating': 4},
                }
            ],
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{self.task.id}/agreement/')

        assert response.status_code == 200
        data = response.json()

        assert data['total_annotations'] == 3
        assert data['distributions']['rating']['type'] == 'rating'
        assert data['distributions']['rating']['average'] == 4.0  # (5 + 3 + 4) / 3
        assert data['distributions']['rating']['count'] == 3

    @pytest.mark.usefixtures('fflag_fix_all_fit_720_lazy_load_annotations_on')
    def test_agreement_endpoint_excludes_cancelled_annotations(self):
        """Test that cancelled annotations are not included in agreement distributions."""
        # Create a normal annotation
        AnnotationFactory(
            task=self.task,
            completed_by=self.user,
            result=[
                {
                    'from_name': 'label',
                    'to_name': 'text',
                    'type': 'labels',
                    'value': {'labels': ['Valid']},
                }
            ],
        )
        # Create a cancelled annotation
        AnnotationFactory(
            task=self.task,
            completed_by=self.user,
            was_cancelled=True,
            result=[
                {
                    'from_name': 'label',
                    'to_name': 'text',
                    'type': 'labels',
                    'value': {'labels': ['Skipped']},
                }
            ],
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{self.task.id}/agreement/')

        assert response.status_code == 200
        data = response.json()

        # Only 1 annotation should be counted (the non-cancelled one)
        assert data['total_annotations'] == 1
        assert data['distributions']['label']['labels'] == {'Valid': 1}
        # Skipped should not appear as it was from cancelled annotation
        assert 'Skipped' not in data['distributions']['label']['labels']

    @pytest.mark.usefixtures('fflag_fix_all_fit_720_lazy_load_annotations_on')
    def test_agreement_endpoint_with_multiple_controls(self):
        """Test agreement endpoint handles multiple control types in one annotation."""
        AnnotationFactory(
            task=self.task,
            completed_by=self.user,
            result=[
                {
                    'from_name': 'label',
                    'to_name': 'image',
                    'type': 'rectanglelabels',
                    'value': {'rectanglelabels': ['Car'], 'x': 10, 'y': 10, 'width': 50, 'height': 50},
                },
                {
                    'from_name': 'sentiment',
                    'to_name': 'text',
                    'type': 'choices',
                    'value': {'choices': ['Positive']},
                },
                {
                    'from_name': 'quality',
                    'to_name': 'text',
                    'type': 'rating',
                    'value': {'rating': 5},
                },
            ],
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{self.task.id}/agreement/')

        assert response.status_code == 200
        data = response.json()

        assert data['total_annotations'] == 1
        # All three controls should be present
        assert 'label' in data['distributions']
        assert 'sentiment' in data['distributions']
        assert 'quality' in data['distributions']
        assert data['distributions']['label']['labels'] == {'Car': 1}
        assert data['distributions']['sentiment']['labels'] == {'Positive': 1}
        assert data['distributions']['quality']['average'] == 5.0

    @pytest.mark.usefixtures('fflag_fix_all_fit_720_lazy_load_annotations_on')
    def test_agreement_endpoint_task_not_found(self):
        """Test that agreement endpoint returns 404 for non-existent task."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/tasks/99999999/agreement/')

        assert response.status_code == 404
        assert response.json()['error'] == 'Task not found'

    @pytest.mark.usefixtures('fflag_fix_all_fit_720_lazy_load_annotations_on')
    def test_agreement_endpoint_with_taxonomy(self):
        """Test agreement endpoint correctly handles taxonomy labels."""
        AnnotationFactory(
            task=self.task,
            completed_by=self.user,
            result=[
                {
                    'from_name': 'taxonomy',
                    'to_name': 'text',
                    'type': 'taxonomy',
                    'value': {'taxonomy': [['Animals', 'Mammals', 'Dog'], ['Animals', 'Mammals', 'Cat']]},
                }
            ],
        )
        AnnotationFactory(
            task=self.task,
            completed_by=self.user,
            result=[
                {
                    'from_name': 'taxonomy',
                    'to_name': 'text',
                    'type': 'taxonomy',
                    'value': {'taxonomy': [['Animals', 'Mammals', 'Dog']]},
                }
            ],
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/tasks/{self.task.id}/agreement/')

        assert response.status_code == 200
        data = response.json()

        # Taxonomy aggregates leaf nodes
        assert data['distributions']['taxonomy']['labels'] == {'Dog': 2, 'Cat': 1}

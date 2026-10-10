"""Tests for project serializers."""

import pytest
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from projects.serializers import ControlTagWeightSerializer, ProjectSerializer
from projects.tests.factories import ProjectFactory
from rest_framework.exceptions import ValidationError
from tasks.tests.factories import AnnotationFactory, TaskFactory
from users.tests.factories import UserFactory


class TestControlTagWeightSerializer(TestCase):
    """Validates individual control tag weight entries via ControlTagWeightSerializer."""

    def test_accepts_valid_weights(self):
        """Valid entry with overall, type, and labels within [0.0, 1.0] passes."""
        data = {'overall': 0.5, 'type': 'Choices', 'labels': {'dog': 1.0, 'cow': 0.0}}
        serializer = ControlTagWeightSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_accepts_zero_overall(self):
        """An overall weight of exactly 0.0 is valid for a single tag entry."""
        data = {'overall': 0.0, 'type': 'Choices', 'labels': {}}
        serializer = ControlTagWeightSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_rejects_negative_overall_weight(self):
        """Negative overall weight is rejected by min_value=0.0 constraint."""
        data = {'overall': -0.5, 'type': 'Choices', 'labels': {}}
        serializer = ControlTagWeightSerializer(data=data)
        assert not serializer.is_valid()
        assert 'overall' in serializer.errors

    def test_rejects_overall_above_max(self):
        """Overall weight above 1.0 is rejected by max_value=1.0 constraint."""
        data = {'overall': 1.5, 'type': 'Choices', 'labels': {}}
        serializer = ControlTagWeightSerializer(data=data)
        assert not serializer.is_valid()
        assert 'overall' in serializer.errors

    def test_rejects_negative_label_weight(self):
        """Negative per-label weight is rejected by the child FloatField's min_value=0.0."""
        data = {'overall': 1.0, 'type': 'Labels', 'labels': {'cat': -0.1}}
        serializer = ControlTagWeightSerializer(data=data)
        assert not serializer.is_valid()
        assert 'labels' in serializer.errors

    def test_rejects_label_weight_above_max(self):
        """Per-label weight above 1.0 is rejected by max_value=1.0."""
        data = {'overall': 1.0, 'type': 'Labels', 'labels': {'cat': 2.0}}
        serializer = ControlTagWeightSerializer(data=data)
        assert not serializer.is_valid()
        assert 'labels' in serializer.errors

    def test_labels_defaults_to_empty_dict(self):
        """When labels is omitted, it defaults to an empty dict."""
        data = {'overall': 1.0, 'type': 'TextArea'}
        serializer = ControlTagWeightSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data['labels'] == {}

    def test_accepts_overall_with_three_decimal_places(self):
        """Overall weight with exactly 3 decimal places is accepted."""
        data = {'overall': 0.009, 'type': 'Choices', 'labels': {}}
        serializer = ControlTagWeightSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_rejects_overall_with_more_than_three_decimal_places(self):
        """Overall weight with more than 3 decimal places is rejected."""
        data = {'overall': 0.0009, 'type': 'Choices', 'labels': {}}
        serializer = ControlTagWeightSerializer(data=data)
        assert not serializer.is_valid()
        assert 'overall' in serializer.errors

    def test_accepts_label_with_three_decimal_places(self):
        """Per-label weight with exactly 3 decimal places is accepted."""
        data = {'overall': 1.0, 'type': 'Labels', 'labels': {'cat': 0.125}}
        serializer = ControlTagWeightSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_rejects_label_with_more_than_three_decimal_places(self):
        """Per-label weight with more than 3 decimal places is rejected."""
        data = {'overall': 1.0, 'type': 'Labels', 'labels': {'cat': 0.1234}}
        serializer = ControlTagWeightSerializer(data=data)
        assert not serializer.is_valid()
        assert 'labels' in serializer.errors


class TestProjectSerializer(TestCase):
    """Validates project serializer behavior, including weights and queue counts."""

    def _validate(self, value):
        """Run validate_control_weights from a ProjectSerializer instance."""
        serializer = ProjectSerializer()
        return serializer.validate_control_weights(value)

    def test_rejects_all_zero_overall_weights(self):
        """All tags with overall=0.0 must raise a ValidationError."""
        data = {
            'classification': {'overall': 0.0, 'type': 'Choices', 'labels': {'dog': 1.0}},
            'caption': {'overall': 0.0, 'type': 'TextArea', 'labels': {}},
        }
        with pytest.raises(ValidationError, match='non-zero overall weight'):
            self._validate(data)

    def test_accepts_partial_zero_overall(self):
        """At least one non-zero overall weight should pass validation."""
        data = {
            'classification': {'overall': 0.0, 'type': 'Choices', 'labels': {}},
            'caption': {'overall': 0.5, 'type': 'TextArea', 'labels': {}},
        }
        result = self._validate(data)
        assert result == data

    def test_accepts_valid_weights(self):
        """All positive overall weights pass without issue."""
        data = {
            'classification': {'overall': 0.8, 'type': 'Choices', 'labels': {'dog': 1.0}},
        }
        result = self._validate(data)
        assert result == data

    def test_accepts_none(self):
        """None value (null/unset) passes through unchanged."""
        assert self._validate(None) is None

    def test_accepts_empty_dict(self):
        """Empty dict passes through unchanged."""
        assert self._validate({}) == {}

    def test_queue_total_uses_correlated_user_annotation_lookup(self):
        project = ProjectFactory()
        current_user = project.created_by
        other_user = UserFactory()
        TaskFactory(project=project, is_labeled=False)
        current_user_task = TaskFactory(project=project, is_labeled=True)
        other_user_task = TaskFactory(project=project, is_labeled=True)
        unlabeled_other_user_task = TaskFactory(project=project, is_labeled=False)
        mixed_user_task = TaskFactory(project=project, is_labeled=True)
        AnnotationFactory(task=current_user_task, completed_by=current_user)
        AnnotationFactory(task=other_user_task, completed_by=other_user)
        AnnotationFactory(task=unlabeled_other_user_task, completed_by=other_user)
        AnnotationFactory(task=mixed_user_task, completed_by=other_user)
        AnnotationFactory(task=mixed_user_task, completed_by=current_user)
        project.tasks.filter(pk__in=[current_user_task.pk, other_user_task.pk, mixed_user_task.pk]).update(
            is_labeled=True
        )
        serializer = ProjectSerializer(context={'user_cache': {current_user.id: current_user}})

        with CaptureQueriesContext(connection) as captured_queries:
            queue_total = serializer.get_queue_total(project)

        assert len(captured_queries) == 1
        assert queue_total == 4, captured_queries[0]['sql']
        assert 'EXISTS' in captured_queries[0]['sql']
        assert 'DISTINCT' not in captured_queries[0]['sql']


class TestProjectSerializerExpertInstruction(TestCase):
    """Unsafe tags in expert_instruction are removed unless the organization opted in."""

    PAYLOAD = '<script>alert(1)</script><iframe src="https://docs.google.com/x"></iframe><p>hi</p>'
    # nh3 removes disallowed elements instead of showing them as escaped markup
    # text: script/style are always dropped, and the remaining HTML is filtered
    # through the safe allow list.
    SANITIZED_DEFAULT = '<p>hi</p>'
    SANITIZED_OPT_IN = '<iframe src="https://docs.google.com/x"></iframe><p>hi</p>'

    def _write(self, project, value):
        serializer = ProjectSerializer(instance=project, data={'expert_instruction': value}, partial=True)
        assert serializer.is_valid(), serializer.errors
        return serializer.validated_data['expert_instruction']

    def _read(self, project):
        return ProjectSerializer(project, include=['id', 'expert_instruction']).data['expert_instruction']

    def _allow_unsafe_tags(self, project):
        project.organization.allow_unsafe_instruction_tags = True
        project.organization.save(update_fields=['allow_unsafe_instruction_tags'])

    def test_write_removes_unsafe_tags_by_default(self):
        project = ProjectFactory()
        assert self._write(project, self.PAYLOAD) == self.SANITIZED_DEFAULT

    def test_write_keeps_iframes_but_strips_script_when_organization_allows(self):
        project = ProjectFactory()
        self._allow_unsafe_tags(project)
        assert self._write(project, self.PAYLOAD) == self.SANITIZED_OPT_IN

    def test_write_still_strips_event_handlers_when_organization_allows(self):
        project = ProjectFactory()
        self._allow_unsafe_tags(project)
        assert self._write(project, '<a href="#" onerror=alert(1)>x</a>') == '<a href="#">x</a>'

    def test_read_removes_unsafe_tags_stored_before_the_fix(self):
        project = ProjectFactory()
        type(project).objects.filter(pk=project.pk).update(expert_instruction=self.PAYLOAD)
        project.refresh_from_db()
        assert self._read(project) == self.SANITIZED_DEFAULT

    def test_read_keeps_iframes_but_strips_script_when_organization_allows(self):
        project = ProjectFactory()
        self._allow_unsafe_tags(project)
        type(project).objects.filter(pk=project.pk).update(expert_instruction=self.PAYLOAD)
        project.refresh_from_db()
        assert self._read(project) == self.SANITIZED_OPT_IN

    def test_read_of_plain_text_does_not_query_organization(self):
        project = ProjectFactory(expert_instruction='Label all cats')
        with CaptureQueriesContext(connection) as captured_queries:
            assert self._read(project) == 'Label all cats'
        assert len(captured_queries) == 0

    def test_list_read_queries_organization_once(self):
        organization = ProjectFactory().organization
        projects = [ProjectFactory(organization=organization, expert_instruction='<p>x</p>') for _ in range(3)]
        with CaptureQueriesContext(connection) as captured_queries:
            data = ProjectSerializer(projects, many=True, include=['id', 'expert_instruction']).data
        assert [item['expert_instruction'] for item in data] == ['<p>x</p>'] * 3
        assert len(captured_queries) == 1

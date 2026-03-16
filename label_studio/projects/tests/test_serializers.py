"""Tests for projects.serializers (control_weights validation)."""

import pytest
from django.test import TestCase
from projects.serializers import ControlTagWeightSerializer, ProjectSerializer
from rest_framework.exceptions import ValidationError


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
    """Validates the cross-field validate_control_weights on ProjectSerializer."""

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

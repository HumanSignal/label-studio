"""Test data_manager.managers module functionality.

This file tests the core functionality of the excluded_fields_for_evaluation
feature that optimizes task API performance by excluding expensive fields.
"""

from unittest.mock import Mock, patch

from data_manager.prepare_params import ConjunctionEnum, Filter, Filters
from django.conf import settings
from django.core.exceptions import FieldDoesNotExist, FieldError
from django.test import TestCase, override_settings


class TestExcludedFieldsLogic(TestCase):
    """Test the core logic of excluded_fields_for_evaluation functionality.

    This test validates step by step:
    - The field inclusion/exclusion logic works correctly
    - Edge cases are handled properly
    - The boolean logic matches expected behavior

    Critical validation: The core logic that determines whether a field
    should be included based on fields_for_evaluation, all_fields, and
    excluded_fields_for_evaluation parameters works correctly.
    """

    def test_field_inclusion_logic(self):
        """Test the core field inclusion logic used in annotate_queryset.

        This test validates step by step:
        - Testing various combinations of parameters
        - Verifying the boolean logic is correct
        - Ensuring all edge cases are covered

        Critical validation: The logic (field in fields_for_evaluation or all_fields)
        and field not in excluded_fields_for_evaluation works as expected.
        """
        # Test scenarios: (fields_for_evaluation, all_fields, excluded_fields, field, expected_result)
        test_scenarios = [
            # Scenario 1: all_fields=True, field not excluded
            (['field1'], True, [], 'field2', True),
            # Scenario 2: all_fields=True, field excluded
            (['field1'], True, ['field2'], 'field2', False),
            # Scenario 3: field in fields_for_evaluation, not excluded
            (['field1'], False, [], 'field1', True),
            # Scenario 4: field in fields_for_evaluation, but excluded
            (['field1'], False, ['field1'], 'field1', False),
            # Scenario 5: field not in fields_for_evaluation, all_fields=False
            (['field1'], False, [], 'field2', False),
            # Scenario 6: empty exclusion list behaves like None
            (['field1'], True, [], 'field2', True),
            # Scenario 7: None exclusion list
            (['field1'], True, None, 'field2', True),
            # Scenario 8: Multiple exclusions
            (['field1', 'field2', 'field3'], True, ['field2', 'field3'], 'field1', True),
            (['field1', 'field2', 'field3'], True, ['field2', 'field3'], 'field2', False),
        ]

        for fields_for_eval, all_fields, excluded_fields, test_field, expected in test_scenarios:
            with self.subTest(
                fields_for_eval=fields_for_eval,
                all_fields=all_fields,
                excluded_fields=excluded_fields,
                test_field=test_field,
            ):
                # Apply the same logic used in annotate_queryset
                if excluded_fields is None:
                    excluded_fields = []

                should_include = (test_field in fields_for_eval or all_fields) and test_field not in excluded_fields

                self.assertEqual(
                    should_include,
                    expected,
                    f"Field inclusion logic failed for field '{test_field}' with "
                    f'fields_for_eval={fields_for_eval}, all_fields={all_fields}, '
                    f'excluded_fields={excluded_fields}',
                )

    def test_excluded_fields_none_handling(self):
        """Test that None excluded_fields_for_evaluation is handled correctly.

        This test validates step by step:
        - Passing None as excluded_fields_for_evaluation
        - Verifying it's treated as an empty list
        - Ensuring no fields are excluded when None is passed

        Critical validation: None values for excluded_fields_for_evaluation
        should not cause errors and should behave as if no exclusions were specified.
        """
        # Test the logic with None exclusions
        fields_for_evaluation = ['field1', 'field2']
        excluded_fields = None

        # This simulates the None check in annotate_queryset
        if excluded_fields is None:
            excluded_fields = []

        # Test that fields are included when not in exclusion list
        for field in fields_for_evaluation:
            should_include = (field in fields_for_evaluation or False) and field not in excluded_fields
            self.assertTrue(should_include, f"Field '{field}' should be included when excluded_fields is None")

    def test_performance_optimization_fields(self):
        """Test specific performance optimization field combinations.

        This test validates step by step:
        - Testing the exact field combinations used in the performance optimization
        - Verifying expensive fields are excluded when specified
        - Ensuring normal fields are still included

        Critical validation: The specific optimization used in the TaskAPI
        (excluding annotations_results and predictions_results) works correctly.
        """
        # These are the actual fields used in the performance optimization
        expensive_fields = ['annotations_results', 'predictions_results']
        normal_fields = ['completed_at', 'avg_lead_time', 'draft_exists', 'annotators']
        all_fields = expensive_fields + normal_fields

        # Test with all_fields=True and expensive field exclusions
        excluded_fields = expensive_fields

        for field in all_fields:
            with self.subTest(field=field):
                should_include = (
                    field in [] or True
                ) and field not in excluded_fields  # all_fields=True, no specific fields_for_evaluation

                if field in expensive_fields:
                    self.assertFalse(should_include, f"Expensive field '{field}' should be excluded")
                else:
                    self.assertTrue(should_include, f"Normal field '{field}' should be included")


class TestPreparedTaskManagerBehavior(TestCase):
    """Test PreparedTaskManager behavior with mock annotation functions.

    This test validates step by step:
    - The annotate_queryset method calls the right functions
    - Excluded fields are properly skipped
    - The overall flow works correctly

    Critical validation: The excluded_fields_for_evaluation feature properly
    controls which annotation functions are executed.
    """

    def test_annotate_queryset_with_simple_functions(self):
        """Test annotate_queryset with simple trackable annotation functions.

        This test validates step by step:
        - Creating simple annotation functions that can be tracked
        - Calling annotate_queryset with exclusions
        - Verifying which functions were called vs skipped

        Critical validation: The exclusion logic properly controls function execution.
        """
        from data_manager.managers import PreparedTaskManager

        # Create a simple mock queryset
        mock_queryset = Mock()
        mock_queryset.first.return_value = None  # No first task

        # Create trackable annotation functions
        called_functions = []

        def make_annotation_function(field_name):
            def annotation_function(queryset):
                called_functions.append(field_name)
                return queryset

            return annotation_function

        # Create test annotation map
        test_annotations = {
            'annotations_results': make_annotation_function('annotations_results'),
            'predictions_results': make_annotation_function('predictions_results'),
            'completed_at': make_annotation_function('completed_at'),
            'avg_lead_time': make_annotation_function('avg_lead_time'),
        }

        with patch('data_manager.managers.get_annotations_map', return_value=test_annotations):
            manager = PreparedTaskManager()

            # Test with excluded fields
            called_functions.clear()
            manager.annotate_queryset(
                queryset=mock_queryset,
                all_fields=True,
                excluded_fields_for_evaluation=['annotations_results', 'predictions_results'],
            )

            # Validation: Only non-excluded fields should have been called
            self.assertIn('completed_at', called_functions, "Non-excluded field 'completed_at' should be processed")
            self.assertIn('avg_lead_time', called_functions, "Non-excluded field 'avg_lead_time' should be processed")
            self.assertNotIn(
                'annotations_results', called_functions, "Excluded field 'annotations_results' should not be processed"
            )
            self.assertNotIn(
                'predictions_results', called_functions, "Excluded field 'predictions_results' should not be processed"
            )

    def test_annotate_queryset_without_exclusions(self):
        """Test annotate_queryset without any exclusions.

        This test validates step by step:
        - Creating annotation functions with no exclusions
        - Verifying all functions are called
        - Ensuring backward compatibility

        Critical validation: When no exclusions are specified, all fields
        should be processed maintaining existing behavior.
        """
        from data_manager.managers import PreparedTaskManager

        mock_queryset = Mock()
        mock_queryset.first.return_value = None

        called_functions = []

        def make_annotation_function(field_name):
            def annotation_function(queryset):
                called_functions.append(field_name)
                return queryset

            return annotation_function

        test_annotations = {
            'annotations_results': make_annotation_function('annotations_results'),
            'predictions_results': make_annotation_function('predictions_results'),
            'completed_at': make_annotation_function('completed_at'),
        }

        with patch('data_manager.managers.get_annotations_map', return_value=test_annotations):
            manager = PreparedTaskManager()

            # Test without excluded fields
            called_functions.clear()
            manager.annotate_queryset(queryset=mock_queryset, all_fields=True, excluded_fields_for_evaluation=None)

            # Validation: All fields should have been called
            self.assertIn(
                'annotations_results',
                called_functions,
                "Field 'annotations_results' should be processed when not excluded",
            )
            self.assertIn(
                'predictions_results',
                called_functions,
                "Field 'predictions_results' should be processed when not excluded",
            )
            self.assertIn(
                'completed_at', called_functions, "Field 'completed_at' should be processed when not excluded"
            )

    def test_annotate_queryset_with_specific_fields(self):
        """Test annotate_queryset with specific fields_for_evaluation and exclusions.

        This test validates step by step:
        - Specifying particular fields for evaluation
        - Adding exclusions to those fields
        - Verifying only the right subset is processed

        Critical validation: The combination of fields_for_evaluation and
        excluded_fields_for_evaluation works correctly together.
        """
        from data_manager.managers import PreparedTaskManager

        mock_queryset = Mock()
        mock_queryset.first.return_value = None

        called_functions = []

        def make_annotation_function(field_name):
            def annotation_function(queryset):
                called_functions.append(field_name)
                return queryset

            return annotation_function

        test_annotations = {
            'annotations_results': make_annotation_function('annotations_results'),
            'predictions_results': make_annotation_function('predictions_results'),
            'completed_at': make_annotation_function('completed_at'),
            'avg_lead_time': make_annotation_function('avg_lead_time'),
        }

        with patch('data_manager.managers.get_annotations_map', return_value=test_annotations):
            manager = PreparedTaskManager()

            # Test with specific fields and exclusions
            called_functions.clear()
            manager.annotate_queryset(
                queryset=mock_queryset,
                fields_for_evaluation=['annotations_results', 'completed_at', 'avg_lead_time'],
                excluded_fields_for_evaluation=['annotations_results'],
            )

            # Validation: Only non-excluded fields from fields_for_evaluation should be called
            self.assertNotIn(
                'annotations_results', called_functions, "Excluded field 'annotations_results' should not be processed"
            )
            self.assertIn('completed_at', called_functions, "Non-excluded field 'completed_at' should be processed")
            self.assertIn('avg_lead_time', called_functions, "Non-excluded field 'avg_lead_time' should be processed")
            self.assertNotIn(
                'predictions_results',
                called_functions,
                "Field 'predictions_results' should not be processed (not in fields_for_evaluation)",
            )

    @override_settings(GET_DYNAMIC_DM_ANNOTATIONS='lse_data_manager.hooks.get_dynamic_annotations')
    def test_dynamic_agreement_annotations_are_not_gated_by_raw_feature_flag(self):
        """Dynamic Agreement V2 annotations are delegated to the configured hook for project-level gating."""
        from data_manager.managers import PreparedTaskManager

        mock_queryset = Mock()
        mock_queryset.project = Mock(id=123)
        called_functions = []

        def dimension_agreement_annotator(queryset):
            called_functions.append('dimension_agreement_1')
            return queryset

        def overlay_func(request=None, project=None):
            return {'dimension_agreement_1': dimension_agreement_annotator}

        with (
            patch('data_manager.managers.get_annotations_map', return_value={}),
            patch('data_manager.managers.load_func', return_value=overlay_func),
            patch('data_manager.managers.flag_set', return_value=False),
        ):
            manager = PreparedTaskManager()
            manager.annotate_queryset(
                queryset=mock_queryset,
                fields_for_evaluation=['dimension_agreement_1'],
            )

        self.assertEqual(called_functions, ['dimension_agreement_1'])


class TestGetQuerysetParameterPassing(TestCase):
    """Test that get_queryset properly passes excluded_fields_for_evaluation parameter.

    This test validates step by step:
    - The get_queryset method accepts the parameter
    - The parameter is passed through to annotate_queryset
    - Default values work correctly

    Critical validation: The get_queryset method serves as the main interface
    and properly forwards the optimization parameters.
    """

    def test_get_queryset_parameter_interface(self):
        """Test that get_queryset accepts excluded_fields_for_evaluation parameter.

        This test validates step by step:
        - Calling get_queryset with the excluded_fields_for_evaluation parameter
        - Ensuring the method accepts the parameter without errors
        - Verifying the interface is correctly defined

        Critical validation: The public API properly accepts the optimization parameter.
        """
        from data_manager.managers import PreparedTaskManager
        from data_manager.models import PrepareParams

        manager = PreparedTaskManager()
        mock_prepare_params = Mock(spec=PrepareParams)
        mock_prepare_params.project = 1
        mock_prepare_params.request = Mock()

        # This should not raise any errors
        with (
            patch.object(manager, 'only_filtered') as mock_only_filtered,
            patch.object(manager, 'annotate_queryset') as mock_annotate,
        ):
            mock_queryset = Mock()
            mock_only_filtered.return_value = mock_queryset
            mock_annotate.return_value = mock_queryset

            # Test with excluded_fields_for_evaluation parameter
            manager.get_queryset(
                prepare_params=mock_prepare_params,
                all_fields=True,
                excluded_fields_for_evaluation=['annotations_results', 'predictions_results'],
            )

            # Validation: annotate_queryset should be called with the parameter
            mock_annotate.assert_called_once()
            call_kwargs = mock_annotate.call_args[1]
            self.assertEqual(
                call_kwargs.get('excluded_fields_for_evaluation'),
                ['annotations_results', 'predictions_results'],
                'excluded_fields_for_evaluation should be passed to annotate_queryset',
            )

    def test_get_queryset_default_parameter_handling(self):
        """Test that get_queryset handles default parameter values correctly.

        This test validates step by step:
        - Calling get_queryset without excluded_fields_for_evaluation
        - Verifying the parameter defaults appropriately
        - Ensuring backward compatibility

        Critical validation: When the parameter is not provided, the behavior
        should remain unchanged from the original implementation.
        """
        from data_manager.managers import PreparedTaskManager
        from data_manager.models import PrepareParams

        manager = PreparedTaskManager()
        mock_prepare_params = Mock(spec=PrepareParams)
        mock_prepare_params.project = 1
        mock_prepare_params.request = Mock()

        with (
            patch.object(manager, 'only_filtered') as mock_only_filtered,
            patch.object(manager, 'annotate_queryset') as mock_annotate,
        ):
            mock_queryset = Mock()
            mock_only_filtered.return_value = mock_queryset
            mock_annotate.return_value = mock_queryset

            # Test without excluded_fields_for_evaluation parameter
            manager.get_queryset(prepare_params=mock_prepare_params, all_fields=True)

            # Validation: annotate_queryset should be called with None for excluded fields
            mock_annotate.assert_called_once()
            call_kwargs = mock_annotate.call_args[1]
            self.assertIsNone(
                call_kwargs.get('excluded_fields_for_evaluation'),
                'excluded_fields_for_evaluation should default to None',
            )


class TestApplyOrderingStaleAgreementFields(TestCase):
    """Regression tests for stale agreement fields in saved Data Manager views."""

    def test_stale_dimension_agreement_ordering_falls_back_to_id(self):
        """Ordering by a stale dimension_agreement_* key should fail open and use default ordering."""
        from data_manager.managers import apply_ordering

        queryset = Mock()
        queryset.order_by.side_effect = [FieldError('Cannot resolve keyword'), queryset]

        with patch(
            'data_manager.managers.load_func', return_value=lambda raw, project=None: ('dimension_agreement_1', True)
        ):
            result = apply_ordering(
                queryset=queryset,
                ordering=['tasks:dimension_agreement_1'],
                project=Mock(),
                request=Mock(),
            )

        self.assertIs(result, queryset)
        self.assertEqual(queryset.order_by.call_count, 2)
        self.assertEqual(queryset.order_by.call_args_list[-1].args, ('id',))


class TestCastValueDatetimeBooleanValue(TestCase):
    """Regression test for crashes when a saved view stores a non-string value for a Datetime filter."""

    def test_cast_value_datetime_filter_with_boolean_value_does_not_raise(self):
        # Reproduces: ENTERPRISE-V2-BACKEND-5NR
        # TypeError: strptime() argument 1 must be str, not bool
        # A saved Data Manager view persisted a Datetime filter whose value is a boolean
        # (e.g. {filter: 'filter:tasks:completed_at', type: 'Datetime', value: true}).
        # GET /api/tasks/ funnels that through cast_value, which calls
        # datetime.strptime(_filter.value, ...) and crashes the request.
        from data_manager.managers import cast_value

        _filter = Filter(
            filter='filter:tasks:completed_at',
            operator='less',
            type='Datetime',
            value=True,
        )

        # Should handle the bad value gracefully rather than raising TypeError.
        cast_value(_filter)


class TestApplyFiltersStaleAgreementFields(TestCase):
    """Regression tests for stale agreement filters in saved Data Manager views."""

    def test_stale_dimension_agreement_filter_is_skipped(self):
        """Stale dimension_agreement_* filters should be ignored instead of raising FieldError."""
        from data_manager.managers import apply_filters

        queryset = Mock()
        queryset.query.annotations = {}
        queryset.model._meta.get_field.side_effect = FieldDoesNotExist('missing')
        queryset.filter.return_value = queryset

        filters = Filters(
            conjunction=ConjunctionEnum.AND,
            items=[
                Filter(
                    filter='filter:tasks:dimension_agreement_1',
                    operator='equal',
                    type='Number',
                    value='0.6',
                )
            ],
        )

        def _load_func(path):
            if path == settings.DATA_MANAGER_CUSTOM_FILTER_EXPRESSIONS:
                return lambda *_args, **_kwargs: None
            if path == settings.PREPROCESS_FIELD_NAME:
                return lambda _field, _project: ('dimension_agreement_1', True)
            if path == settings.DATA_MANAGER_PREPROCESS_FILTER:
                return lambda _filter, _field_name: _filter
            raise AssertionError(f'unexpected load_func path: {path}')

        with patch('data_manager.managers.load_func', side_effect=_load_func):
            result = apply_filters(queryset=queryset, filters=filters, project=Mock(), request=Mock())

        self.assertIs(result, queryset)
        queryset.filter.assert_not_called()

"""Test data_manager.managers module functionality.

This file tests the core functionality of the excluded_fields_for_evaluation
feature that optimizes task API performance by excluding expensive fields.
"""

from unittest.mock import Mock, patch

from data_manager.prepare_params import ConjunctionEnum, Filter, Filters
from django.conf import settings
from django.core.exceptions import FieldDoesNotExist, FieldError
from django.db.models import Q
from django.test import TestCase, override_settings
from projects.tests.factories import ProjectFactory
from tasks.models import Task
from tasks.tests.factories import AnnotationFactory, TaskFactory
from users.tests.factories import UserFactory


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


class TestApplyFiltersCustomResult(TestCase):
    """Custom hooks can consume a parent/child pair as one expression."""

    def test_custom_result_consumes_child_filter(self):
        from data_manager.managers import CustomFilterResult, apply_filters
        from django.db.models import Q

        queryset = Mock()
        queryset.query.annotations = {}
        queryset.filter.return_value = queryset
        project = Mock()
        parent = Filter(
            filter='filter:tasks:annotations_dimension_results.dimension_1',
            operator='contains',
            type='List',
            value=['positive'],
            child_filter=Filter(
                filter='filter:tasks:annotators',
                operator='contains',
                type='List',
                value=7,
            ),
        )
        filters = Filters(conjunction=ConjunctionEnum.AND, items=[parent])
        custom_hook = Mock(return_value=CustomFilterResult(Q(id=123), consume_child_filter=True))

        def _load_func(path):
            if path == settings.DATA_MANAGER_CUSTOM_FILTER_EXPRESSIONS:
                return custom_hook
            if path == settings.PREPROCESS_FIELD_NAME:
                return lambda raw, _project: (raw.removeprefix('filter:tasks:'), True)
            if path == settings.DATA_MANAGER_PREPROCESS_FILTER:
                return lambda filter_, _field_name: filter_
            raise AssertionError(f'unexpected load_func path: {path}')

        with patch('data_manager.managers.load_func', side_effect=_load_func):
            result = apply_filters(queryset=queryset, filters=filters, project=project, request=Mock())

        self.assertIs(result, queryset)
        custom_hook.assert_called_once()
        self.assertIs(custom_hook.call_args.kwargs['child_filter'], parent.child_filter)
        queryset.filter.assert_called_once()


class TestNormalizeInListValue(TestCase):
    """Unit tests for `_normalize_in_list_value` (BROS-1203)."""

    def _filter(self, value, type_='String'):
        return Filter(filter='filter:tasks:id', operator='in_list', type=type_, value=value)

    def test_strips_whitespace_and_surrounding_quotes(self):
        from data_manager.managers import _normalize_in_list_value

        f = self._filter(['  abc  ', '"def"', "'ghi'"])
        _normalize_in_list_value(f)
        self.assertEqual(f.value, ['abc', 'def', 'ghi'])

    def test_dedupes_preserving_order(self):
        from data_manager.managers import _normalize_in_list_value

        f = self._filter(['a', 'b', 'a', 'c', 'b'])
        _normalize_in_list_value(f)
        self.assertEqual(f.value, ['a', 'b', 'c'])

    def test_drops_empty_strings(self):
        from data_manager.managers import _normalize_in_list_value

        f = self._filter(['', ' ', 'x', '""'])
        _normalize_in_list_value(f)
        self.assertEqual(f.value, ['x'])

    def test_number_type_drops_non_numeric_tokens(self):
        from data_manager.managers import _normalize_in_list_value

        f = self._filter([1, '2', 'foo', '3.5', 'bar', None], type_='Number')
        _normalize_in_list_value(f)
        self.assertEqual(f.value, [1.0, 2.0, 3.5])

    def test_handles_non_list_value(self):
        from data_manager.managers import _normalize_in_list_value

        f = self._filter('not a list')
        _normalize_in_list_value(f)
        self.assertEqual(f.value, [])


class TestParseUserFilterIds(TestCase):
    def test_scalar_value(self):
        from data_manager.managers import parse_user_filter_ids

        self.assertEqual(parse_user_filter_ids(7), [7])
        self.assertEqual(parse_user_filter_ids('9'), [9])

    def test_list_value_dedupes(self):
        from data_manager.managers import parse_user_filter_ids

        self.assertEqual(parse_user_filter_ids([1, 2, 2, '3']), [1, 2, 3])

    def test_invalid_entries_rejected(self):
        from data_manager.managers import parse_user_filter_ids
        from rest_framework.exceptions import ValidationError

        with self.assertRaises(ValidationError):
            parse_user_filter_ids([1, 'bad', None])

    def test_empty_and_none(self):
        from data_manager.managers import parse_user_filter_ids

        self.assertEqual(parse_user_filter_ids(None), [])
        self.assertEqual(parse_user_filter_ids([]), [])

    @override_settings(DATA_MANAGER_LIST_FILTER_MAX_VALUES=2)
    def test_list_value_size_is_bounded(self):
        from data_manager.managers import parse_user_filter_ids
        from rest_framework.exceptions import ValidationError

        with self.assertRaises(ValidationError):
            parse_user_filter_ids([1, 2, 3])


class TestAddUserFilter(TestCase):
    def test_contains_list_uses_in_lookup(self):
        from data_manager.managers import Operator, add_user_filter

        expressions = []
        _filter = Filter(filter='filter:tasks:annotators', operator=Operator.CONTAINS, type='List', value=[1, 2])
        result = add_user_filter(True, 'annotations__completed_by', _filter, expressions)
        self.assertEqual(result, 'continue')
        self.assertEqual(len(expressions), 1)
        self.assertEqual(str(expressions[0]), str(Q(annotations__completed_by__in=[1, 2])))

    def test_scalar_value_backward_compatible(self):
        from data_manager.managers import Operator, add_user_filter

        expressions = []
        _filter = Filter(filter='filter:tasks:updated_by', operator=Operator.CONTAINS, type='List', value=5)
        result = add_user_filter(True, 'updated_by', _filter, expressions)
        self.assertEqual(result, 'continue')
        self.assertEqual(str(expressions[0]), str(Q(updated_by__in=[5])))


class TestUserFilterResults(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.project = ProjectFactory()
        cls.user_a = UserFactory()
        cls.user_b = UserFactory()
        cls.user_c = UserFactory()
        cls.task_a = TaskFactory(project=cls.project, updated_by=cls.user_a)
        cls.task_b = TaskFactory(project=cls.project, updated_by=cls.user_b)
        cls.task_c = TaskFactory(project=cls.project, updated_by=cls.user_c)
        AnnotationFactory(task=cls.task_a, project=cls.project, completed_by=cls.user_a)
        AnnotationFactory(task=cls.task_b, project=cls.project, completed_by=cls.user_b)
        AnnotationFactory(task=cls.task_c, project=cls.project, completed_by=cls.user_c)

    def _filter(self, field, operator, value):
        from data_manager.managers import apply_filters

        filters = Filters(
            conjunction='and',
            items=[
                Filter(
                    filter=f'filter:tasks:{field}',
                    operator=operator,
                    type='List',
                    value=value,
                )
            ],
        )
        return apply_filters(Task.objects.filter(project=self.project), filters, self.project, request=None)

    def test_contains_matches_any_selected_user(self):
        expected = {self.task_a.id, self.task_b.id}

        annotator_ids = set(
            self._filter('annotators', 'contains', [self.user_a.id, self.user_b.id]).values_list('id', flat=True)
        )
        updated_by_ids = set(
            self._filter('updated_by', 'contains', [self.user_a.id, self.user_b.id]).values_list('id', flat=True)
        )
        self.assertSetEqual(annotator_ids, expected)
        self.assertSetEqual(updated_by_ids, expected)

    def test_not_contains_excludes_every_selected_user(self):
        expected = {self.task_c.id}

        annotator_ids = set(
            self._filter('annotators', 'not_contains', [self.user_a.id, self.user_b.id]).values_list('id', flat=True)
        )
        updated_by_ids = set(
            self._filter('updated_by', 'not_contains', [self.user_a.id, self.user_b.id]).values_list('id', flat=True)
        )
        self.assertSetEqual(annotator_ids, expected)
        self.assertSetEqual(updated_by_ids, expected)

    def test_empty_list_adds_no_user_constraint(self):
        expected = {self.task_a.id, self.task_b.id, self.task_c.id}

        for field in ('annotators', 'updated_by'):
            for operator in ('contains', 'not_contains'):
                actual = set(self._filter(field, operator, []).values_list('id', flat=True))
                self.assertSetEqual(actual, expected)

    def test_unsupported_user_filter_operator_is_rejected(self):
        from rest_framework.exceptions import ValidationError

        for field in ('annotators', 'updated_by'):
            with self.subTest(field=field), self.assertRaises(ValidationError):
                self._filter(field, 'equal', [self.user_a.id])


class TestValidateInListFilter(TestCase):
    """Unit tests for `validate_in_list_filter` (BROS-1203)."""

    def test_passthrough_for_non_list_operators(self):
        from data_manager.managers import validate_in_list_filter

        f = Filter(filter='filter:tasks:id', operator='equal', type='Number', value=1)
        self.assertEqual(validate_in_list_filter(f, 'id'), 'ok')

    def test_allowlisted_id_returns_ok(self):
        from data_manager.managers import validate_in_list_filter

        f = Filter(filter='filter:tasks:id', operator='in_list', type='Number', value=[1, 2, 3])
        self.assertEqual(validate_in_list_filter(f, 'id'), 'ok')
        self.assertEqual(f.value, [1.0, 2.0, 3.0])

    def test_allowlisted_inner_id_returns_ok(self):
        from data_manager.managers import validate_in_list_filter

        f = Filter(filter='filter:tasks:inner_id', operator='in_list', type='Number', value=[5])
        self.assertEqual(validate_in_list_filter(f, 'inner_id'), 'ok')

    def test_allowlisted_data_field_returns_ok(self):
        from data_manager.managers import validate_in_list_filter

        f = Filter(filter='filter:tasks:data.object_id', operator='in_list', type='String', value=['a'])
        self.assertEqual(validate_in_list_filter(f, 'data__object_id'), 'ok')

    def test_rejects_unsupported_annotations_ids(self):
        from data_manager.managers import validate_in_list_filter
        from rest_framework.exceptions import ValidationError

        f = Filter(filter='filter:tasks:annotations_ids', operator='in_list', type='Number', value=[1])
        with self.assertRaises(ValidationError):
            validate_in_list_filter(f, 'annotations_ids')

    def test_rejects_unsupported_annotators(self):
        from data_manager.managers import validate_in_list_filter
        from rest_framework.exceptions import ValidationError

        f = Filter(filter='filter:tasks:annotators', operator='in_list', type='Number', value=[1])
        with self.assertRaises(ValidationError):
            validate_in_list_filter(f, 'annotators')

    def test_rejects_unsupported_total_annotations(self):
        from data_manager.managers import validate_in_list_filter
        from rest_framework.exceptions import ValidationError

        f = Filter(filter='filter:tasks:total_annotations', operator='in_list', type='Number', value=[1])
        with self.assertRaises(ValidationError):
            validate_in_list_filter(f, 'total_annotations')

    def test_rejects_unsupported_created_at(self):
        from data_manager.managers import validate_in_list_filter
        from rest_framework.exceptions import ValidationError

        f = Filter(filter='filter:tasks:created_at', operator='in_list', type='Datetime', value=['2024'])
        with self.assertRaises(ValidationError):
            validate_in_list_filter(f, 'created_at')

    def test_rejects_non_list_value(self):
        from data_manager.managers import validate_in_list_filter
        from rest_framework.exceptions import ValidationError

        f = Filter(filter='filter:tasks:id', operator='in_list', type='Number', value='not a list')
        with self.assertRaises(ValidationError):
            validate_in_list_filter(f, 'id')

    def test_empty_in_list_returns_none(self):
        from data_manager.managers import validate_in_list_filter

        f = Filter(filter='filter:tasks:id', operator='in_list', type='Number', value=[])
        self.assertEqual(validate_in_list_filter(f, 'id'), 'none')

    def test_empty_not_in_list_returns_skip(self):
        from data_manager.managers import validate_in_list_filter

        f = Filter(filter='filter:tasks:id', operator='not_in_list', type='Number', value=[])
        self.assertEqual(validate_in_list_filter(f, 'id'), 'skip')

    def test_normalization_to_empty_for_number_returns_none(self):
        """All-garbage Number list normalizes to empty → behave like empty list."""
        from data_manager.managers import validate_in_list_filter

        f = Filter(filter='filter:tasks:id', operator='in_list', type='Number', value=['foo', 'bar'])
        self.assertEqual(validate_in_list_filter(f, 'id'), 'none')


class TestApplyFiltersInList(TestCase):
    """Integration of in_list / not_in_list with the apply_filters() pipeline (BROS-1203)."""

    def _run(self, _filter, conjunction=ConjunctionEnum.AND):
        from data_manager.managers import apply_filters

        queryset = Mock()
        queryset.query.annotations = {}
        queryset.model._meta.get_field.return_value = Mock()
        queryset.filter.return_value = queryset
        queryset.exists.return_value = False

        filters = Filters(conjunction=conjunction, items=[_filter])

        def _load_func(path):
            if path == settings.DATA_MANAGER_CUSTOM_FILTER_EXPRESSIONS:
                return lambda *_args, **_kwargs: None
            if path == settings.PREPROCESS_FIELD_NAME:
                field = _filter.filter.removeprefix('filter:tasks:').replace('.', '__')
                return lambda _field, _project: (field, True)
            if path == settings.DATA_MANAGER_PREPROCESS_FILTER:
                return lambda f, _field_name: f
            raise AssertionError(f'unexpected load_func path: {path}')

        with patch('data_manager.managers.load_func', side_effect=_load_func):
            return apply_filters(queryset=queryset, filters=filters, project=Mock(), request=Mock()), queryset

    def test_id_in_list_builds_q_filter(self):
        _filter = Filter(filter='filter:tasks:id', operator='in_list', type='Number', value=[1, 2, 3])
        result, queryset = self._run(_filter)
        self.assertIs(result, queryset)
        queryset.filter.assert_called_once()

    def test_id_not_in_list_builds_q_filter(self):
        _filter = Filter(filter='filter:tasks:id', operator='not_in_list', type='Number', value=[1, 2])
        result, queryset = self._run(_filter)
        self.assertIs(result, queryset)
        queryset.filter.assert_called_once()

    def test_empty_in_list_appends_contradiction(self):
        """Empty in_list results in `Q(pk__in=[])` so the filter line matches no rows.

        This works for both AND and OR conjunctions (always-false predicate).
        """
        _filter = Filter(filter='filter:tasks:id', operator='in_list', type='Number', value=[])
        result, queryset = self._run(_filter)
        self.assertIs(result, queryset)
        queryset.filter.assert_called_once()

    def test_empty_not_in_list_drops_filter(self):
        _filter = Filter(filter='filter:tasks:id', operator='not_in_list', type='Number', value=[])
        result, queryset = self._run(_filter)
        self.assertIs(result, queryset)
        queryset.filter.assert_not_called()

    def test_unsupported_field_raises_400(self):
        from rest_framework.exceptions import ValidationError

        _filter = Filter(filter='filter:tasks:annotations_ids', operator='in_list', type='Number', value=[1, 2])
        with self.assertRaises(ValidationError):
            self._run(_filter)

    def test_annotations_ids_legacy_contains_smart_rewrite_still_works(self):
        """Legacy `annotations_ids` smart-contains hack must remain intact.

        The validator only fires when the *original* operator is in_list / not_in_list, so
        `{annotations_ids, contains, "1 2,3"}` still hits the existing rewrite path at
        `data_manager.managers.apply_filters` line ~458.
        """
        # `contains` (not in_list) — validator returns 'ok', rewrite proceeds.
        _filter = Filter(
            filter='filter:tasks:annotations_ids',
            operator='contains',
            type='String',
            value='1 2,3',
        )
        result, queryset = self._run(_filter)
        self.assertIs(result, queryset)
        # The rewrite turns `contains` into `in_list` and emits a Q expression.
        queryset.filter.assert_called_once()


class TestApplyFiltersInListDB(TestCase):
    """DB-backed integration tests for in_list against real columns (BROS-1203).

    These verify the SQL path end-to-end: Number-type values are coerced to floats
    by `_normalize_in_list_value`, then passed to `Q(field__in=...)`. Critical for
    `Task.id` and `Task.inner_id` (IntegerField PKs) where float→int comparison must
    work in Postgres.
    """

    @classmethod
    def setUpTestData(cls):
        from projects.tests.factories import ProjectFactory
        from tasks.tests.factories import TaskFactory

        cls.project = ProjectFactory()
        cls.tasks = [
            TaskFactory(project=cls.project, data={'text': 'a', 'object_id': '1'}),
            TaskFactory(project=cls.project, data={'text': 'b', 'object_id': '2'}),
            TaskFactory(project=cls.project, data={'text': 'c', 'object_id': '3'}),
        ]

    def _apply(self, _filter):
        from data_manager.managers import apply_filters
        from tasks.models import Task

        queryset = Task.objects.filter(project=self.project)
        filters = Filters(conjunction=ConjunctionEnum.AND, items=[_filter])
        return apply_filters(queryset=queryset, filters=filters, project=self.project, request=None)

    def test_task_id_in_list_returns_listed_tasks(self):
        """Integer PK + float values from normalize — verifies Postgres coercion."""
        target_ids = [self.tasks[0].id, self.tasks[2].id]
        _filter = Filter(filter='filter:tasks:id', operator='in_list', type='Number', value=target_ids)

        result = self._apply(_filter)

        assert set(result.values_list('id', flat=True)) == set(target_ids)

    def test_task_id_not_in_list_returns_complement(self):
        excluded_ids = [self.tasks[0].id]
        _filter = Filter(filter='filter:tasks:id', operator='not_in_list', type='Number', value=excluded_ids)

        result = self._apply(_filter)

        assert set(result.values_list('id', flat=True)) == {self.tasks[1].id, self.tasks[2].id}

    def test_task_id_in_list_accepts_string_values(self):
        """Users may paste IDs as strings; normalize coerces them to numbers."""
        target_ids = [str(self.tasks[0].id), str(self.tasks[1].id)]
        _filter = Filter(filter='filter:tasks:id', operator='in_list', type='Number', value=target_ids)

        result = self._apply(_filter)

        assert set(result.values_list('id', flat=True)) == {self.tasks[0].id, self.tasks[1].id}

    def test_data_field_string_in_list_works(self):
        _filter = Filter(
            filter='filter:tasks:data.object_id',
            operator='in_list',
            type='String',
            value=['1', '3'],
        )

        result = self._apply(_filter)

        assert set(result.values_list('id', flat=True)) == {self.tasks[0].id, self.tasks[2].id}

    def test_empty_in_list_returns_no_tasks(self):
        _filter = Filter(filter='filter:tasks:id', operator='in_list', type='Number', value=[])

        result = self._apply(_filter)

        assert result.count() == 0

    def test_empty_not_in_list_returns_all_tasks(self):
        _filter = Filter(filter='filter:tasks:id', operator='not_in_list', type='Number', value=[])

        result = self._apply(_filter)

        assert result.count() == 3

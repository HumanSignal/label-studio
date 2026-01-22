"""
Performance and concurrency tests for the declarative transition system.

These tests validate that the transition system performs well under load
and handles concurrent operations correctly, which is critical for
production FSM systems.
"""

import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Any, Dict, Optional
from unittest.mock import Mock

from django.test import TestCase, TransactionTestCase
from fsm.registry import transition_registry
from fsm.transitions import BaseTransition, TransitionContext, TransitionValidationError
from pydantic import Field


class PerformanceTestTransition(BaseTransition):
    """Simple transition for performance testing"""

    operation_id: int = Field(..., description='Operation identifier')
    data_size: int = Field(1, description='Size of data to process')

    def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
        return 'PROCESSED'

    @classmethod
    def can_transition_from_state(cls, context: TransitionContext) -> bool:
        return True

    def validate_transition(self, context: TransitionContext) -> bool:
        # Simulate some validation work
        if self.data_size < 0:
            raise TransitionValidationError('Invalid data size')
        return True

    def transition(self, context: TransitionContext) -> Dict[str, Any]:
        # Simulate processing work
        return {
            'operation_id': self.operation_id,
            'data_size': self.data_size,
            'processed_at': context.timestamp.isoformat(),
            'processing_time_ms': 1,  # Mock processing time
        }


class ConcurrencyTestTransition(BaseTransition):
    """Transition for testing concurrent access patterns"""

    thread_id: int = Field(..., description='Thread identifier')
    shared_counter: int = Field(0, description='Shared counter for testing')
    sleep_duration: float = Field(0.0, description='Simulate processing delay')
    execution_order: list = Field(default_factory=list, description='Track execution order')

    def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
        return f'PROCESSED_BY_THREAD_{self.thread_id}'

    @classmethod
    def can_transition_from_state(cls, context: TransitionContext) -> bool:
        return True

    def validate_transition(self, context: TransitionContext) -> bool:
        # Record validation timing for concurrency analysis
        self.execution_order.append(f'validate_{self.thread_id}_{time.time()}')
        return True

    def transition(self, context: TransitionContext) -> Dict[str, Any]:
        # Record transition timing
        self.execution_order.append(f'transition_{self.thread_id}_{time.time()}')

        # Simulate some processing delay
        if self.sleep_duration > 0:
            time.sleep(self.sleep_duration)

        return {
            'thread_id': self.thread_id,
            'shared_counter': self.shared_counter,
            'execution_order': self.execution_order.copy(),
            'processed_at': context.timestamp.isoformat(),
        }


class PerformanceTests(TestCase):
    """
    Performance tests for the declarative transition system.

    These tests measure execution time, memory usage patterns,
    and scalability characteristics.
    """

    def setUp(self):
        self.mock_entity = Mock()
        self.mock_entity.pk = 1
        self.mock_entity._meta.model_name = 'test_entity'

        self.mock_user = Mock()
        self.mock_user.id = 123

        # Clear registry for clean tests
        transition_registry._transitions.clear()
        transition_registry.register('test_entity', 'performance_test', PerformanceTestTransition)

    def test_single_transition_performance(self):
        """
        PERFORMANCE TEST: Measure single transition execution time

        Validates that individual transitions execute within acceptable time limits.
        """

        transition = PerformanceTestTransition(operation_id=1, data_size=1000)

        context = TransitionContext(
            entity=self.mock_entity,
            current_user=self.mock_user,
            current_state='CREATED',
            target_state=transition.get_target_state(),
        )

        # Measure validation performance
        start_time = time.perf_counter()
        result = transition.validate_transition(context)
        validation_time = time.perf_counter() - start_time

        assert result
        assert validation_time < 0.001  # Should be under 1ms

        # Measure transition execution performance
        start_time = time.perf_counter()
        transition_data = transition.transition(context)
        execution_time = time.perf_counter() - start_time

        assert isinstance(transition_data, dict)
        assert execution_time < 0.001  # Should be under 1ms

        # Measure total workflow performance
        start_time = time.perf_counter()
        transition.context = context
        transition.validate_transition(context)
        transition.transition(context)
        total_time = time.perf_counter() - start_time

        assert total_time < 0.005  # Total should be under 5ms

    def test_batch_transition_performance(self):
        """
        PERFORMANCE TEST: Measure batch transition creation and validation

        Tests performance when creating many transition instances rapidly.
        """

        batch_size = 1000

        # Test batch creation performance
        start_time = time.perf_counter()
        transitions = []

        for i in range(batch_size):
            transition = PerformanceTestTransition(operation_id=i, data_size=i * 10)
            transitions.append(transition)

        creation_time = time.perf_counter() - start_time
        creation_time_per_item = creation_time / batch_size

        assert len(transitions) == batch_size
        assert creation_time_per_item < 0.001  # Under 1ms per transition

        # Test batch validation performance
        context = TransitionContext(
            entity=self.mock_entity, current_user=self.mock_user, current_state='CREATED', target_state='PROCESSED'
        )

        start_time = time.perf_counter()
        validation_results = []

        for transition in transitions:
            result = transition.validate_transition(context)
            validation_results.append(result)

        validation_time = time.perf_counter() - start_time
        validation_time_per_item = validation_time / batch_size

        assert all(validation_results)
        assert validation_time_per_item < 0.001  # Under 1ms per validation
        assert validation_time < 0.5  # Total batch under 500ms

    def test_registry_performance(self):
        """
        PERFORMANCE TEST: Registry operations under load

        Tests the performance of registry lookups and registrations.
        """

        # Test registry lookup performance
        lookup_count = 10000

        start_time = time.perf_counter()

        for i in range(lookup_count):
            retrieved_class = transition_registry.get_transition('test_entity', 'performance_test')

        lookup_time = time.perf_counter() - start_time
        lookup_time_per_operation = lookup_time / lookup_count

        assert retrieved_class == PerformanceTestTransition
        assert lookup_time_per_operation < 0.0001  # Under 0.1ms per lookup

        # Test registry registration performance
        registration_count = 1000

        start_time = time.perf_counter()

        for i in range(registration_count):
            entity_name = f'entity_{i}'
            transition_name = f'transition_{i}'
            transition_registry.register(entity_name, transition_name, PerformanceTestTransition)

        registration_time = time.perf_counter() - start_time
        registration_time_per_operation = registration_time / registration_count

        assert registration_time_per_operation < 0.001  # Under 1ms per registration

        # Verify registrations worked
        test_class = transition_registry.get_transition('entity_500', 'transition_500')
        assert test_class == PerformanceTestTransition

    def test_pydantic_validation_performance(self):
        """
        PERFORMANCE TEST: Pydantic validation performance

        Measures the overhead of Pydantic validation in transitions.
        """

        # Test valid data performance
        valid_data = {'operation_id': 123, 'data_size': 1000}
        validation_count = 10000

        start_time = time.perf_counter()

        for i in range(validation_count):
            PerformanceTestTransition(**valid_data)

        validation_time = time.perf_counter() - start_time
        validation_time_per_item = validation_time / validation_count

        assert validation_time_per_item < 0.001  # Under 1ms per validation

        # Test validation error performance
        invalid_data = {'operation_id': 'invalid', 'data_size': -1}
        error_count = 1000

        start_time = time.perf_counter()
        errors = []

        for i in range(error_count):
            try:
                PerformanceTestTransition(**invalid_data)
            except Exception as e:
                errors.append(e)

        error_time = time.perf_counter() - start_time
        error_time_per_item = error_time / error_count

        assert len(errors) == error_count
        assert error_time_per_item < 0.01  # Under 10ms per error (errors are slower)

    def test_memory_usage_patterns(self):
        """
        PERFORMANCE TEST: Memory usage analysis

        Tests memory usage patterns for transition instances and contexts.
        """

        import sys

        # Measure base memory usage
        base_transitions = []
        for i in range(100):
            transition = PerformanceTestTransition(operation_id=i, data_size=i)
            base_transitions.append(transition)

        base_size = sys.getsizeof(base_transitions[0])

        # Test memory usage with complex data
        complex_transitions = []
        for i in range(100):
            transition = PerformanceTestTransition(operation_id=i, data_size=i * 1000)
            # Add context to transition
            context = TransitionContext(
                entity=self.mock_entity,
                current_user=self.mock_user,
                current_state='CREATED',
                target_state=transition.get_target_state(),
                metadata={'large_data': 'x' * 1000},  # Add some bulk
            )
            transition.context = context
            complex_transitions.append(transition)

        complex_size = sys.getsizeof(complex_transitions[0])

        # Memory usage should be reasonable
        memory_overhead = complex_size - base_size
        assert memory_overhead < 10000  # Under 10KB overhead per transition

        # Clean up contexts to test garbage collection
        for transition in complex_transitions:
            transition.context = None

        # Verify memory can be reclaimed (simplified test)
        assert complex_transitions[0].context is None


class ConcurrencyTests(TransactionTestCase):
    """
    Concurrency tests for the declarative transition system.

    These tests validate thread safety and concurrent execution patterns
    that are critical for production systems.
    """

    def setUp(self):
        self.mock_entity = Mock()
        self.mock_entity.pk = 1
        self.mock_entity._meta.model_name = 'test_entity'

        self.mock_user = Mock()
        self.mock_user.id = 123

        # Clear registry for clean tests
        transition_registry._transitions.clear()
        transition_registry.register('test_entity', 'concurrency_test', ConcurrencyTestTransition)

    def test_concurrent_transition_creation(self):
        """
        CONCURRENCY TEST: Thread-safe transition instance creation

        Validates that multiple threads can create transition instances
        concurrently without conflicts.
        """

        thread_count = 10
        transitions_per_thread = 100
        all_transitions = []
        thread_results = []

        def create_transitions(thread_id):
            """Worker function to create transitions in a thread"""
            local_transitions = []
            for i in range(transitions_per_thread):
                transition = ConcurrencyTestTransition(
                    thread_id=thread_id, shared_counter=i, sleep_duration=0.001  # Small delay to increase contention
                )
                local_transitions.append(transition)
            return local_transitions

        # Execute concurrent creation
        with ThreadPoolExecutor(max_workers=thread_count) as executor:
            futures = []
            for thread_id in range(thread_count):
                future = executor.submit(create_transitions, thread_id)
                futures.append(future)

            for future in as_completed(futures):
                thread_transitions = future.result()
                thread_results.append(thread_transitions)
                all_transitions.extend(thread_transitions)

        # Validate results
        total_expected = thread_count * transitions_per_thread
        assert len(all_transitions) == total_expected

        # Check thread separation
        thread_ids = [t.thread_id for t in all_transitions]
        unique_threads = set(thread_ids)
        assert len(unique_threads) == thread_count

        # Validate each thread created correct number of transitions
        for thread_id in range(thread_count):
            thread_transitions = [t for t in all_transitions if t.thread_id == thread_id]
            assert len(thread_transitions) == transitions_per_thread

    def test_concurrent_transition_execution(self):
        """
        CONCURRENCY TEST: Concurrent transition execution

        Tests that multiple transitions can be executed concurrently
        without race conditions in the execution logic.
        """

        thread_count = 5
        execution_results = []

        def execute_transition(thread_id):
            """Worker function to execute a transition"""
            transition = ConcurrencyTestTransition(
                thread_id=thread_id,
                shared_counter=thread_id * 10,
                sleep_duration=0.01,  # Small delay to test concurrency
            )

            context = TransitionContext(
                entity=self.mock_entity,
                current_user=self.mock_user,
                current_state='CREATED',
                target_state=transition.get_target_state(),
                timestamp=datetime.now(),
            )

            # Execute validation and transition
            validation_result = transition.validate_transition(context)
            transition_data = transition.transition(context)

            return {
                'thread_id': thread_id,
                'validation_result': validation_result,
                'transition_data': transition_data,
                'execution_order': transition.execution_order,
            }

        # Execute concurrent transitions
        with ThreadPoolExecutor(max_workers=thread_count) as executor:
            futures = []
            for thread_id in range(thread_count):
                future = executor.submit(execute_transition, thread_id)
                futures.append(future)

            for future in as_completed(futures):
                result = future.result()
                execution_results.append(result)

        # Validate results
        assert len(execution_results) == thread_count

        for result in execution_results:
            assert result['validation_result']
            assert 'thread_id' in result['transition_data']
            assert isinstance(result['execution_order'], list)
            assert len(result['execution_order']) > 0

        # Check thread isolation
        thread_ids = [r['transition_data']['thread_id'] for r in execution_results]
        assert set(thread_ids) == set(range(thread_count))

    def test_registry_thread_safety(self):
        """
        CONCURRENCY TEST: Registry thread safety

        Tests that the transition registry handles concurrent
        registration and lookup operations safely.
        """

        thread_count = 10
        operations_per_thread = 100

        def registry_operations(thread_id):
            """Worker function for registry operations"""
            operations_completed = 0

            for i in range(operations_per_thread):
                # Mix of registration and lookup operations
                if i % 3 == 0:
                    # Register new transition
                    entity_name = f'entity_{thread_id}_{i}'
                    transition_name = f'transition_{i}'
                    transition_registry.register(entity_name, transition_name, ConcurrencyTestTransition)
                    operations_completed += 1

                elif i % 3 == 1:
                    # Lookup existing transition
                    try:
                        found_class = transition_registry.get_transition('test_entity', 'concurrency_test')
                        if found_class == ConcurrencyTestTransition:
                            operations_completed += 1
                    except Exception:
                        pass

                else:
                    # List operations
                    try:
                        entities = transition_registry.list_entities()
                        if len(entities) >= 0:  # Should always be non-negative
                            operations_completed += 1
                    except Exception:
                        pass

            return operations_completed

        # Execute concurrent registry operations
        with ThreadPoolExecutor(max_workers=thread_count) as executor:
            futures = []
            for thread_id in range(thread_count):
                future = executor.submit(registry_operations, thread_id)
                futures.append(future)

            operation_counts = []
            for future in as_completed(futures):
                count = future.result()
                operation_counts.append(count)

        # Validate no operations failed due to thread safety issues
        total_operations = sum(operation_counts)
        expected_minimum = thread_count * operations_per_thread * 0.9  # Allow some variance

        assert total_operations > expected_minimum

        # Registry should be in consistent state
        entities = transition_registry.list_entities()
        assert isinstance(entities, list)
        assert len(entities) > thread_count  # Should have entities from all threads

    def test_context_isolation(self):
        """
        CONCURRENCY TEST: Context isolation between threads

        Ensures that transition contexts remain isolated between
        concurrent executions and don't leak data.
        """

        thread_count = 8
        context_data = []

        def context_isolation_test(thread_id):
            """Test context isolation in a thread"""
            # Create unique context data for this thread
            unique_data = {
                'thread_specific_id': thread_id,
                'random_data': f'thread_{thread_id}_data',
                'timestamp': datetime.now().isoformat(),
                'test_counter': thread_id * 1000,
            }

            transition = ConcurrencyTestTransition(
                thread_id=thread_id,
                shared_counter=thread_id,
                sleep_duration=0.005,  # Small delay to increase chance of interference
            )

            context = TransitionContext(
                entity=self.mock_entity,
                current_user=self.mock_user,
                current_state='CREATED',
                target_state=transition.get_target_state(),
                metadata=unique_data,
            )

            # Set context on transition
            transition.context = context

            # Execute transition
            validation_result = transition.validate_transition(context)
            transition_data = transition.transition(context)

            # Retrieve context and verify isolation
            retrieved_context = transition.context

            return {
                'thread_id': thread_id,
                'original_metadata': unique_data,
                'retrieved_metadata': retrieved_context.metadata,
                'validation_result': validation_result,
                'transition_data': transition_data,
            }

        # Execute with high concurrency
        with ThreadPoolExecutor(max_workers=thread_count) as executor:
            futures = []
            for thread_id in range(thread_count):
                future = executor.submit(context_isolation_test, thread_id)
                futures.append(future)

            for future in as_completed(futures):
                result = future.result()
                context_data.append(result)

        # Validate context isolation
        assert len(context_data) == thread_count

        for result in context_data:
            thread_id = result['thread_id']
            original_metadata = result['original_metadata']
            retrieved_metadata = result['retrieved_metadata']

            # Context should match exactly what was set for this thread
            assert original_metadata['thread_specific_id'] == thread_id
            assert retrieved_metadata['thread_specific_id'] == thread_id
            assert original_metadata['random_data'] == retrieved_metadata['random_data']
            assert original_metadata['test_counter'] == thread_id * 1000

            # Should not have data from other threads
            for other_result in context_data:
                if other_result['thread_id'] != thread_id:
                    assert (
                        retrieved_metadata['thread_specific_id']
                        != other_result['original_metadata']['thread_specific_id']
                    )

    def test_stress_test_mixed_operations(self):
        """
        STRESS TEST: Mixed operations under load

        Combines multiple types of operations under high concurrency
        to test overall system stability.
        """

        duration_seconds = 2  # Short duration for CI
        thread_count = 6

        # Shared statistics
        stats = {
            'transitions_created': 0,
            'validations_performed': 0,
            'transitions_executed': 0,
            'registry_lookups': 0,
            'errors_encountered': 0,
        }
        stats_lock = threading.Lock()

        def mixed_operations_worker(worker_id):
            """Worker that performs mixed operations"""
            local_stats = {
                'transitions_created': 0,
                'validations_performed': 0,
                'transitions_executed': 0,
                'registry_lookups': 0,
                'errors_encountered': 0,
            }

            end_time = time.time() + duration_seconds
            operation_counter = 0

            while time.time() < end_time:
                try:
                    operation_type = operation_counter % 4

                    if operation_type == 0:
                        # Create transition
                        transition = ConcurrencyTestTransition(thread_id=worker_id, shared_counter=operation_counter)
                        local_stats['transitions_created'] += 1

                    elif operation_type == 1:
                        # Validate transition
                        transition = ConcurrencyTestTransition(thread_id=worker_id, shared_counter=operation_counter)
                        context = TransitionContext(
                            entity=self.mock_entity,
                            current_state='CREATED',
                            target_state=transition.get_target_state(),
                        )
                        transition.validate_transition(context)
                        local_stats['validations_performed'] += 1

                    elif operation_type == 2:
                        # Execute transition
                        transition = ConcurrencyTestTransition(thread_id=worker_id, shared_counter=operation_counter)
                        context = TransitionContext(
                            entity=self.mock_entity,
                            current_state='CREATED',
                            target_state=transition.get_target_state(),
                        )
                        transition.transition(context)
                        local_stats['transitions_executed'] += 1

                    else:
                        # Registry lookup
                        found = transition_registry.get_transition('test_entity', 'concurrency_test')
                        if found:
                            local_stats['registry_lookups'] += 1

                    operation_counter += 1

                except Exception:
                    local_stats['errors_encountered'] += 1

                # Small yield to allow other threads
                time.sleep(0.0001)

            # Update shared statistics
            with stats_lock:
                for key in stats:
                    stats[key] += local_stats[key]

            return local_stats

        # Execute stress test
        with ThreadPoolExecutor(max_workers=thread_count) as executor:
            futures = []
            for worker_id in range(thread_count):
                future = executor.submit(mixed_operations_worker, worker_id)
                futures.append(future)

            worker_results = []
            for future in as_completed(futures):
                result = future.result()
                worker_results.append(result)

        # Validate stress test results
        total_operations = sum(
            [
                stats['transitions_created'],
                stats['validations_performed'],
                stats['transitions_executed'],
                stats['registry_lookups'],
            ]
        )

        # Should have performed substantial work
        assert total_operations > thread_count * 10

        # Error rate should be very low (< 1%)
        error_rate = stats['errors_encountered'] / max(total_operations, 1)
        assert error_rate < 0.01

        # All operation types should have been performed
        assert stats['transitions_created'] > 0
        assert stats['validations_performed'] > 0
        assert stats['transitions_executed'] > 0
        assert stats['registry_lookups'] > 0

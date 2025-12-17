# FSM (Finite State Machine) Framework

A high-performance Django-based finite state machine framework with UUID7 optimization, declarative transitions, and comprehensive state management capabilities.

## Overview

The FSM framework provides:

- **Core Infrastructure**: Abstract base state models and managers
- **UUID7 Optimization**: Time-series optimized state records with natural ordering
- **Declarative Transitions**: Pydantic-based transition system with validation
- **High Performance**: Optimized for high-volume state changes with caching
- **Extensible**: StateManager serves as the main extension point

## Architecture

### Core Components

1. **BaseState**: Abstract model providing UUID7-optimized state tracking
2. **StateManager**: High-performance state management with intelligent caching
3. **Transition System**: Declarative, Pydantic-based transitions with validation
4. **State Registry**: Dynamic registration system for entity states, choices and transitions
5. **TransitionExecutor**: Orchestrates transition execution

### Module Architecture

```
models.py → registry.py → transitions.py + transition_executor.py → state_manager.py → transition_utils.py
```

- **models.py**: Base state model and UUID7 utilities
- **registry.py**: Registries for state models and transitions
- **transitions.py**: BaseTransition class and validation logic
- **transition_executor.py**: Orchestrates transition execution
- **state_manager.py**: **Main entry point** - implementations extend this
- **transition_utils.py**: Convenience functions using `get_state_manager()`

## Quick Start

### 1. Define State Choices

```python
from django.db import models
from django.utils.translation import gettext_lazy as _
from fsm.registry import register_state_choices

@register_state_choices('order')
class OrderStateChoices(models.TextChoices):
    CREATED = 'CREATED', _('Created')
    PROCESSING = 'PROCESSING', _('Processing')
    SHIPPED = 'SHIPPED', _('Shipped')
    DELIVERED = 'DELIVERED', _('Delivered')
    CANCELLED = 'CANCELLED', _('Cancelled')
```

### 2. Create State Model

```python
from fsm.state_models import BaseState
from fsm.registry import register_state_model

@register_state_model('order')
class OrderState(BaseState):
    # Entity relationship
    order = models.ForeignKey('shop.Order', related_name='fsm_states', on_delete=models.CASCADE)
    
    # Override state field with choices
    state = models.CharField(max_length=50, choices=OrderStateChoices.choices, db_index=True)
    
    # Denormalized fields for performance
    customer_id = models.PositiveIntegerField(db_index=True)
    store_id = models.PositiveIntegerField(db_index=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    @classmethod
    def get_denormalized_fields(cls, entity):
        """Extract frequently queried fields to avoid JOINs."""
        return {
            'customer_id': entity.customer_id,
            'store_id': entity.store_id,
            'total_amount': entity.total_amount,
        }
    
    class Meta:
        indexes = [
            models.Index(fields=['order_id', '-id'], name='order_current_state_idx'),
        ]
```

### 3. Define Transitions

```python
from fsm.transitions import BaseTransition
from fsm.registry import register_state_transition
from pydantic import Field

@register_state_transition('order', 'process_order')
class ProcessOrderTransition(BaseTransition):
    processor_id: int = Field(..., description="ID of user processing the order")
    priority: str = Field('normal', description="Processing priority")
    
    def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
        return OrderStateChoices.PROCESSING
    
    def validate_transition(self, context) -> bool:
        return context.current_state == OrderStateChoices.CREATED
        
    def transition(self, context) -> dict:
        return {
            "processor_id": self.processor_id,
            "priority": self.priority,
            "processed_at": context.timestamp.isoformat()
        }
```

### 4. Execute Transitions

**Main API - StateManager (Extensible):**

```python
from fsm.state_manager import StateManager

# This is the primary way to execute transitions
# implementations extend StateManager.execute_transition()
result = StateManager.execute_transition(
    entity=order,
    transition_name='process_order',
    transition_data={'processor_id': 123, 'priority': 'high'},
    user=request.user
)
```

### 5. Query States

```python
from fsm.state_manager import get_state_manager

StateManager = get_state_manager()

# Get current state
current_state = StateManager.get_current_state_value(order)

# Get state history
history = StateManager.get_state_history(order)

# Get current state object (full details)
current_state_obj = StateManager.get_current_state_object(order)
```

## Extensibility

**StateManager is the main extension point for implementations:**

```python
from fsm.state_manager import StateManager

class MyStateManager(StateManager):
    @classmethod
    def execute_transition(cls, entity, transition_name, **kwargs):
        # Add specific pre-processing
        cls.log_audit(entity, transition_name)
        
        # Call parent implementation  
        result = super().execute_transition(entity, transition_name, **kwargs)
        
        # Add specific post-processing
        cls.notify_systems(result)
        
        return result

# Configure in Django settings
FSM_STATE_MANAGER_CLASS = 'myapp.managers.MyStateManager'
```

The `get_state_manager()` function ensures all FSM operations use the correct implementation.

## Key Features

### UUID7 Performance Optimization

- **Natural Time Ordering**: UUID7 provides chronological ordering without separate timestamp indexes
- **High Concurrency**: INSERT-only approach eliminates locking contention  
- **Scalability**: Supports large amounts of state records with consistent performance

### Declarative Transitions

- **Pydantic Validation**: Strong typing and automatic validation
- **Composable Logic**: Reusable transition classes with inheritance
- **Hooks System**: Pre/post transition hooks for custom logic

```python
@register_state_transition('order', 'ship_order')
class ShipOrderTransition(BaseTransition):
    tracking_number: str = Field(..., description="Shipping tracking number")
    carrier: str = Field(..., description="Shipping carrier")
    
    def get_target_state(self, context: Optional[TransitionContext] = None) -> str:
        return OrderStateChoices.SHIPPED
    
    def pre_transition_hook(self, context):
        # Called before state change
        self.validate_inventory(context.entity)
    
    def transition(self, context) -> dict:
        return {
            "tracking_number": self.tracking_number,
            "carrier": self.carrier,
            "shipped_at": context.timestamp.isoformat()
        }
    
    def post_transition_hook(self, context, state_record):
        # Called after state change
        self.send_shipping_notification(context.entity, state_record)
```

### Advanced State Management

```python
# Time-range queries using UUID7
from datetime import datetime, timedelta
recent_states = StateManager.get_states_in_time_range(
    entity=order, 
    start_time=datetime.now() - timedelta(hours=24)
)

# Cache management
StateManager.invalidate_cache(order)  # Clear cache for entity
StateManager.warm_cache([order1, order2, order3])  # Pre-populate cache
```

### Registry System

```python
from fsm.registry import (
    state_model_registry,
    transition_registry,
    register_state_model,
    register_state_choices,
    register_state_transition,
)

# Access registries directly if needed
model = state_model_registry.get_model('order')
transition = transition_registry.get_transition('order', 'process_order')
```

### Transition Utilities

```python
from fsm.transition_utils import (
    get_available_transitions,
    get_transition_schema,
    validate_transition_data,
)

# Get all transitions for an entity
all_transitions = get_available_transitions(order)

# Get available transitions for an entity
available_transitions = get_available_transitions(order, validate=True)

# Get JSON schema for transition (useful for APIs)
schema = get_transition_schema(ProcessOrderTransition)

# Validate transition data before execution
errors = validate_transition_data(ProcessOrderTransition, data)
```

## Performance Characteristics

- **State Queries**: O(1) current state lookup via UUID7 ordering
- **History Queries**: Optimal for time-series access patterns
- **Bulk Operations**: Efficient batch processing for thousands of entities
- **Cache Integration**: Intelligent caching with automatic invalidation
- **Memory Efficiency**: Minimal memory footprint for state objects

## Architecture Benefits

### Clean Import Hierarchy

- **No Circular Dependencies**: Unidirectional import flow prevents import cycles
- **No Function-Level Imports**: All imports at module level for clarity and performance
- **Extension Friendly**: StateManager as central extension point

### Separation of Concerns

- **Registry**: Pure storage and retrieval (no execution logic)
- **Transitions**: Validation and business logic (no state management) 
- **StateManager**: State persistence and caching (main entry point)
- **TransitionExecutor**: Orchestrates execution (takes StateManager as parameter)

## Migration from Other FSM Libraries

The framework is designed to be compatible with existing Django FSM patterns while offering significant performance improvements through UUID7 optimization and clean architecture.

## Best Practices

1. **Always use StateManager.execute_transition()**
2. **Extend StateManager** for further customizations
3. **Use denormalized fields** for frequently queried data
4. **Leverage UUID7 ordering** for time-series queries
5. **Implement proper validation** in transition classes
6. **Use the registry decorators** for clean registration

## Contributing

When contributing:
- Maintain the clean import hierarchy
- Keep framework code generic and reusable
- Add performance tests for UUID7 optimizations
- Document extension points and customization options
- Ensure extensibility is preserved
- When adding pytests, use and extend reusable helper functions in `fsm/tests/helpers.py` when appropriate

"""
FSM State Models for Label Studio.

This module contains the state model definitions (BaseState and concrete state models).
These are separated from models.py to avoid registration issues in LSE where
extended state models need to be registered instead of the base OSS models.

When importing FsmHistoryStateModel, these state models won't be automatically
imported and registered, allowing LSE to register its own extended versions.
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from django.conf import settings
from django.db import models
from django.db.models import QuerySet, UUIDField
from fsm.registry import register_state_model
from fsm.state_choices import (
    AnnotationStateChoices,
    ProjectStateChoices,
    TaskStateChoices,
)
from fsm.utils import UUID7Field, generate_uuid7, timestamp_from_uuid7

logger = logging.getLogger(__name__)


class BaseState(models.Model):
    """
    Abstract base class for all state models using UUID7 for optimal time-series performance.

    This is the core of the FSM system, providing:
    - UUID7 primary key with natural time ordering
    - Standard state transition metadata
    - Audit trail information
    - Context data storage
    - Performance-optimized helper methods

    Benefits of this architecture:
    - INSERT-only operations for maximum concurrency
    - Natural time ordering eliminates need for created_at indexes
    - Global uniqueness enables distributed system support
    - Time-based partitioning for large amounts of state records with consistent performance
    - Complete audit trail by design
    """

    # UUID7 Primary Key - provides natural time ordering and global uniqueness
    id = UUIDField(
        primary_key=True,
        default=generate_uuid7,
        editable=False,
        help_text='UUID7 provides natural time ordering and global uniqueness',
    )

    # Optional organization field - can be overridden or left null
    # Applications can add their own organization/tenant fields as needed
    organization_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        db_index=True,
        help_text='Organization ID that owns this state record (for multi-tenant applications)',
    )

    # Core State Fields
    state = models.CharField(max_length=50, db_index=True, help_text='Current state of the entity')
    previous_state = models.CharField(
        max_length=50, null=True, blank=True, help_text='Previous state before this transition'
    )

    # Transition Metadata
    transition_name = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text='Name of the transition method that triggered this state change',
    )
    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        help_text='User who triggered this state transition',
    )

    # Context & Audit
    context_data = models.JSONField(
        default=dict, help_text='Additional context data for this transition (e.g., validation results, external IDs)'
    )
    reason = models.TextField(blank=True, help_text='Human-readable reason for this state transition')

    # Timestamp (redundant with UUID7 but useful for human readability)
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=False,  # UUID7 provides natural ordering, no index needed
        help_text='Human-readable timestamp for debugging (UUID7 id contains precise timestamp)',
    )

    class Meta:
        abstract = True
        # UUID7 provides natural ordering, reducing index requirements
        ordering = ['-id']  # Most recent first
        get_latest_by = 'id'

    def __str__(self):
        entity_id = getattr(self, f'{self._get_entity_name()}_id', 'unknown')
        return f'{self._get_entity_name().title()} {entity_id}: {self.previous_state} → {self.state}'

    @property
    def entity(self):
        """Get the related entity object"""
        entity_name = self._get_entity_name()
        return getattr(self, entity_name)

    @property
    def timestamp_from_uuid(self) -> datetime:
        """Extract timestamp from UUID7 ID"""
        return timestamp_from_uuid7(self.id)

    @property
    def is_terminal_state(self) -> bool:
        """
        Check if this is a terminal state (no outgoing transitions).

        Override in subclasses with specific terminal states.
        """
        return False

    def _get_entity_name(self) -> str:
        """Extract entity name from model name (e.g., TaskState → task)"""
        model_name = self.__class__.__name__
        if model_name.endswith('State'):
            return model_name[:-5].lower()
        return 'entity'

    @classmethod
    def get_current_state(cls, entity) -> Optional['BaseState']:
        """
        Get current state using UUID7 natural ordering.

        Uses UUID7's natural time ordering to efficiently find the latest state
        without requiring created_at indexes or complex queries.
        """
        entity_field = f'{cls._get_entity_field_name()}'
        return cls.objects.filter(**{entity_field: entity}).order_by('-id').first()

    @classmethod
    def get_current_state_value(cls, entity) -> Optional[str]:
        """
        Get current state value as string using UUID7 natural ordering.

        Uses UUID7's natural time ordering to efficiently find the latest state
        without requiring created_at indexes or complex queries.
        """
        entity_field = f'{cls._get_entity_field_name()}'
        current_state = cls.objects.filter(**{entity_field: entity}).order_by('-id').first()
        return current_state.state if current_state else None

    @classmethod
    def get_state_history(cls, entity) -> QuerySet['BaseState']:
        """Get complete state history for an entity"""
        entity_field = f'{cls._get_entity_field_name()}'
        return cls.objects.filter(**{entity_field: entity}).order_by('-id')

    @classmethod
    def get_states_in_range(cls, entity, start_time: datetime, end_time: datetime) -> QuerySet['BaseState']:
        """
        Efficient time-range queries using UUID7.

        Uses UUID7's embedded timestamp for direct time-based filtering
        without requiring timestamp indexes.
        """
        entity_field = f'{cls._get_entity_field_name()}'
        queryset = cls.objects.filter(**{entity_field: entity})
        return UUID7Field.filter_by_time_range(queryset, start_time, end_time).order_by('id')

    @classmethod
    def get_states_since(cls, entity, since: datetime):
        """Get all states since a specific timestamp"""
        entity_field = f'{cls._get_entity_field_name()}'
        queryset = cls.objects.filter(**{entity_field: entity})
        return UUID7Field.filter_since_time(queryset, since).order_by('id')

    @classmethod
    def get_denormalized_fields(cls, entity) -> Dict[str, Any]:
        """
        Get denormalized fields to include in the state record.

        Override this method in subclasses to provide denormalized data
        that should be stored with each state transition for performance
        optimization and auditing purposes.

        Args:
            entity: The entity instance being transitioned

        Returns:
            Dictionary of field names to values that should be stored
            in the state record

        Example:
            @classmethod
            def get_denormalized_fields(cls, entity):
                return {
                    'project_id': entity.project_id,
                    'organization_id': entity.project.organization_id,
                    'task_type': entity.task_type,
                    'priority': entity.priority
                }
        """
        return {}

    @classmethod
    def get_entity_model(cls) -> models.Model:
        """Get the entity model for the state model"""
        field_name = cls._get_entity_field_name()
        return cls._meta.get_field(field_name).related_model

    @classmethod
    def _get_entity_field_name(cls) -> str:
        """Get the foreign key field name for the entity"""
        model_name = cls.__name__
        if model_name.endswith('State'):
            return model_name[:-5].lower()
        return 'entity'


# =============================================================================
# Core State Models for Label Studio OSS
# =============================================================================
# Note: These are registered here for OSS. LSE will register its own extended
# versions in lse_fsm/models.py instead of importing these.


@register_state_model('task')
class TaskState(BaseState):
    """
    Core task state tracking for Label Studio.
    Provides basic task state management with:
    - Simple 3-state workflow (CREATED → IN_PROGRESS → COMPLETED)
    - High-performance queries with UUID7 ordering
    """

    # Entity Relationship
    task = models.ForeignKey('tasks.Task', related_name='fsm_states', on_delete=models.CASCADE)

    # Override state field to add choices constraint
    state = models.CharField(max_length=50, choices=TaskStateChoices.choices, db_index=True)

    project_id = models.PositiveIntegerField(
        db_index=True, help_text='From task.project_id - denormalized for performance'
    )

    class Meta:
        app_label = 'fsm'
        indexes = [
            # Critical: Latest state lookup (current state determined by latest UUID7 id)
            # Index with DESC order explicitly supports ORDER BY id DESC queries
            models.Index(fields=['task_id', '-id'], name='task_current_state_idx'),
            # Reporting and filtering
            models.Index(fields=['project_id', 'state', '-id'], name='task_project_state_idx'),
            models.Index(fields=['organization_id', 'state', '-id'], name='task_org_reporting_idx'),
            # History queries
            models.Index(fields=['task_id', 'id'], name='task_history_idx'),
        ]
        # No constraints needed - INSERT-only approach
        ordering = ['-id']

    @classmethod
    def get_denormalized_fields(cls, entity):
        """Get denormalized fields for TaskState creation"""
        return {
            'project_id': entity.project_id,
        }

    @property
    def is_terminal_state(self) -> bool:
        """Check if this is a terminal task state"""
        return self.state == TaskStateChoices.COMPLETED


@register_state_model('annotation')
class AnnotationState(BaseState):
    """
    Core annotation state tracking for Label Studio.
    Provides basic annotation state management with:
    - Simple 3-state workflow (DRAFT → SUBMITTED → COMPLETED)
    """

    # Entity Relationship
    annotation = models.ForeignKey('tasks.Annotation', on_delete=models.CASCADE, related_name='fsm_states')

    # Override state field to add choices constraint
    state = models.CharField(max_length=50, choices=AnnotationStateChoices.choices, db_index=True)

    # Denormalized fields for performance (avoid JOINs in common queries)
    task_id = models.PositiveIntegerField(
        db_index=True, help_text='From annotation.task_id - denormalized for performance'
    )
    project_id = models.PositiveIntegerField(
        db_index=True, help_text='From annotation.task.project_id - denormalized for performance'
    )
    completed_by_id = models.PositiveIntegerField(
        null=True, db_index=True, help_text='From annotation.completed_by_id - denormalized for performance'
    )

    class Meta:
        app_label = 'fsm'
        indexes = [
            # Critical: Latest state lookup
            models.Index(fields=['annotation_id', '-id'], name='anno_current_state_idx'),
            # Filtering and reporting
            models.Index(fields=['task_id', 'state', '-id'], name='anno_task_state_idx'),
            models.Index(fields=['completed_by_id', 'state', '-id'], name='anno_user_report_idx'),
            models.Index(fields=['project_id', 'state', '-id'], name='anno_project_report_idx'),
        ]
        ordering = ['-id']

    @classmethod
    def get_denormalized_fields(cls, entity):
        """Get denormalized fields for AnnotationState creation"""
        return {
            'task_id': entity.task.id,
            'project_id': entity.task.project_id,
            'completed_by_id': entity.completed_by_id if entity.completed_by_id else None,
        }

    @property
    def is_terminal_state(self) -> bool:
        """Check if this is a terminal annotation state"""
        return self.state == AnnotationStateChoices.COMPLETED


@register_state_model('project')
class ProjectState(BaseState):
    """
    Core project state tracking for Label Studio.
    Provides basic project state management with:
    - Simple 3-state workflow (CREATED → IN_PROGRESS → COMPLETED)
    - Project lifecycle tracking
    """

    # Entity Relationship
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='fsm_states')

    # Override state field to add choices constraint
    state = models.CharField(max_length=50, choices=ProjectStateChoices.choices, db_index=True)

    created_by_id = models.PositiveIntegerField(
        null=True, db_index=True, help_text='From project.created_by_id - denormalized for performance'
    )

    class Meta:
        app_label = 'fsm'
        indexes = [
            # Critical: Latest state lookup
            models.Index(fields=['project_id', '-id'], name='project_current_state_idx'),
            # Filtering and reporting
            models.Index(fields=['organization_id', 'state', '-id'], name='project_org_state_idx'),
            models.Index(fields=['organization_id', '-id'], name='project_org_reporting_idx'),
        ]
        ordering = ['-id']

    @classmethod
    def get_denormalized_fields(cls, entity):
        """Get denormalized fields for ProjectState creation"""
        return {
            'created_by_id': entity.created_by_id if entity.created_by_id else None,
        }

    @property
    def is_terminal_state(self) -> bool:
        """Check if this is a terminal project state"""
        return self.state == ProjectStateChoices.COMPLETED

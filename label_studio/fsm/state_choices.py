"""
FSM state choices registry system.

This module provides the infrastructure for registering and managing
state choices for different entity types in the FSM framework.
"""

from django.db import models
from django.utils.translation import gettext_lazy as _
from fsm.registry import register_state_choices

"""
Core state choice enums for Label Studio entities.
These enums define the essential states for core Label Studio entities.
"""


@register_state_choices('task')
class TaskStateChoices(models.TextChoices):
    """
    Core task states for basic Label Studio workflow.
    Simplified states covering the essential task lifecycle:
    - Creation and assignment
    - Annotation work
    - Completion
    """

    # Initial State
    CREATED = 'CREATED', _('Created')

    # Work States
    IN_PROGRESS = 'IN_PROGRESS', _('In Progress')

    # Terminal State
    COMPLETED = 'COMPLETED', _('Completed')


@register_state_choices('annotation')
class AnnotationStateChoices(models.TextChoices):
    """Annotations don't carry state in LSO, but this can still be used for tracking history."""

    CREATED = 'CREATED', _('Created')


@register_state_choices('project')
class ProjectStateChoices(models.TextChoices):
    """
    Core project states for basic Label Studio workflow.
    Simplified states covering the essential project lifecycle:
    - Setup and configuration
    - Active work
    - Completion
    """

    # Setup States
    CREATED = 'CREATED', _('Created')

    # Work States
    IN_PROGRESS = 'IN_PROGRESS', _('In Progress')

    # Terminal State
    COMPLETED = 'COMPLETED', _('Completed')

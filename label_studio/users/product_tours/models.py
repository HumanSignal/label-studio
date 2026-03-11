from typing import Any, Dict, Optional

from django.db import models
from django.utils.translation import gettext_lazy as _
from pydantic import BaseModel, Field


class ProductTourState(models.TextChoices):
    READY = 'ready', _('Ready')
    COMPLETED = 'completed', _('Completed')
    SKIPPED = 'skipped', _('Skipped')


class ProductTourInteractionData(BaseModel):
    """Pydantic model for validating tour interaction data"""

    index: Optional[int] = Field(None, description='Step number where tour was completed')
    action: Optional[str] = Field(None, description='Action taken during the tour')
    type: Optional[str] = Field(None, description='Type of interaction')
    status: Optional[str] = Field(None, description='Status of the interaction')
    additional_data: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description='Extensible field for additional interaction data'
    )


class UserProductTour(models.Model):
    """Stores product tour state and interaction data for users"""

    user = models.ForeignKey(
        'User', on_delete=models.CASCADE, related_name='tours', help_text='User who interacted with the tour'
    )

    name = models.CharField(
        _('Name'), max_length=256, help_text='Unique identifier for the product tour. Name must match the config name.'
    )

    state = models.CharField(
        _('State'),
        max_length=32,
        choices=ProductTourState.choices,
        default=ProductTourState.READY,
        help_text=f'Current state of the tour for this user. Available options: {", ".join(f"{k} ({v})" for k, v in ProductTourState.choices)}',
    )

    interaction_data = models.JSONField(
        _('Interaction Data'),
        default=dict,
        blank=True,
        help_text='Additional data about user interaction with the tour',
    )

    created_at = models.DateTimeField(auto_now_add=True, help_text='When this tour record was created')

    updated_at = models.DateTimeField(auto_now=True, help_text='When this tour record was last updated')

    def __str__(self):
        return f'{self.user.email} - {self.name} ({self.state})'

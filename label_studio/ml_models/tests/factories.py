import factory
from core.utils.common import load_func
from django.conf import settings
from django.utils import timezone
from ml_models.models import ModelRun


class ModelRunFactory(factory.django.DjangoModelFactory):
    """
    Factory for `ml_models.models.ModelRun`.

    Defaults are intentionally minimal; override fields in tests as needed.
    """

    project = factory.SubFactory(load_func(settings.PROJECT_FACTORY))
    organization = factory.SelfAttribute('project.organization')
    created_by = factory.SelfAttribute('project.created_by')
    model_version = None

    project_subset = ModelRun.ProjectSubset.HASGT
    status = ModelRun.ModelRunStatus.PENDING

    triggered_at = None
    completed_at = None
    predictions_updated_at = None

    total_predictions = 0
    total_correct_predictions = 0
    total_tasks = 0

    class Meta:
        model = ModelRun

    @factory.post_generation
    def _default_timestamps(self, create, extracted, **kwargs):
        """
        Ensure timestamps are set when status implies they should exist.
        """
        if not create:
            return

        if self.status == ModelRun.ModelRunStatus.COMPLETED:
            now = timezone.now()
            if self.triggered_at is None:
                self.triggered_at = now
            if self.completed_at is None:
                self.completed_at = now
            self.save(update_fields=['triggered_at', 'completed_at'])

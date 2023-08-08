from django.db import models


class TaskMixin:
    def _get_is_labeled_value(self):  # type: ignore[no-untyped-def]
        n = self.completed_annotations.count()  # type: ignore[attr-defined]
        return n >= self.overlap  # type: ignore[attr-defined]

    def update_is_labeled(self, *args, **kwargs):  # type: ignore[no-untyped-def]
        self.is_labeled = self._get_is_labeled_value()  # type: ignore[no-untyped-call]

    @classmethod
    def post_process_bulk_update_stats(cls, tasks):  # type: ignore[no-untyped-def]
        pass


class AnnotationMixin(models.Model):
    class Meta:
        abstract = True
        indexes = []  # type: ignore[var-annotated]

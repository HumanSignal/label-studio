from django.db import models


class TaskMixin:
    def _get_is_labeled_value(self):
        n = self.completed_annotations.count()
        return n >= self.overlap

    def update_is_labeled(self, *args, **kwargs):
        self.is_labeled = self._get_is_labeled_value()

    @classmethod
    def post_process_bulk_update_stats(cls, tasks):
        pass


class AnnotationMixin(models.Model):
    class Meta:
        abstract = True
        indexes = []

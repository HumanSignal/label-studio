class TaskMixin:
    def _get_is_labeled_value(self):
        n = self.completed_annotations.count()
        return n >= self.overlap


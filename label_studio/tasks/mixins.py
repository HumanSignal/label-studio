
class TaskMixin:
    def has_permission(self, user: "User") -> bool:
        """Called by Task#has_permission"""
        return True

    def _get_is_labeled_value(self) -> bool:
        n = self.completed_annotations.count()
        return n >= self.overlap

    def update_is_labeled(self, *args, **kwargs) -> None:
        self.is_labeled = self._get_is_labeled_value()

    @classmethod
    def post_process_bulk_update_stats(cls, tasks) -> None:
        pass


class AnnotationMixin:
    def has_permission(self, user: "User") -> bool:
        """Called by Annotation#has_permission"""
        return True

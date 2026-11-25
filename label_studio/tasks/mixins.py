class TaskMixin:
    def has_permission(self, user: 'User') -> bool:  # noqa: F821
        """Called by Task#has_permission"""
        return True

    def get_current_overlap(self) -> int:
        """Distinct annotators with completed annotations."""
        return self.completed_annotations.values('completed_by').distinct().count()

    def _get_is_labeled_value(self) -> bool:
        return self.get_current_overlap() >= self.overlap

    def update_is_labeled(self, *args, **kwargs) -> None:
        self.is_labeled = self._get_is_labeled_value()

    @classmethod
    def post_process_bulk_update_stats(cls, tasks) -> None:
        pass

    def before_delete_actions(self):
        """
        Actions to execute before task deletion
        """
        pass

    @staticmethod
    def after_bulk_delete_actions(tasks_ids, project):
        """
        Actions to execute after bulk task deletion
        """
        pass

    def get_rejected_query(self):
        pass

    def get_lock_extra_exclude_query(self):
        """Extra annotations that must not hold lock capacity (ORed in; LSE frees ``redistribute``)."""
        return None

    def can_be_skipped(self) -> bool:
        return True


class AnnotationMixin:
    def has_permission(self, user: 'User') -> bool:  # noqa: F821
        """Called by Annotation#has_permission"""
        return True

    @classmethod
    def restricted_to_own_work(cls, user: 'User', project) -> bool:  # noqa: F821
        """Whether ``user`` may only access annotations and drafts they authored in ``project``.

        The one rule behind the annotation object check, the annotation list and the draft endpoints.
        LSE restricts annotators.
        """
        return False

    @classmethod
    def restrict_to_own_work(cls, queryset, user: 'User', project, author_field: str = 'completed_by'):  # noqa: F821
        """Rows of ``queryset`` that ``user`` may read on list endpoints of ``project``.

        The list counterpart of ``has_permission``: DRF never calls the object check on list rows, so list
        endpoints for annotations (``author_field='completed_by'``) and drafts (``author_field='user'``)
        filter with this instead.
        """
        if cls.restricted_to_own_work(user, project):
            return queryset.filter(**{author_field: user})
        return queryset

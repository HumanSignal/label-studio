class TaskMixin:
    def has_permission(self, user: 'User') -> bool:  # noqa: F821
        """
        Check if user has permission to access this task
        Delegates to project-level permission check
        """
        if not user or not user.is_authenticated:
            return False

        # Delegate to project permission
        return self.project.has_permission(user)

    def user_can_annotate(self, user: 'User') -> bool:  # noqa: F821
        """
        Check if user can create annotations on this task
        All project members can annotate
        """
        return self.has_permission(user)

    def user_can_review(self, user: 'User') -> bool:  # noqa: F821
        """
        Check if user can review/modify annotations on this task
        Only reviewers and owners can review
        """
        if not user or not user.is_authenticated:
            return False

        return self.project.user_can_review(user)

    def _get_is_labeled_value(self) -> bool:
        n = self.completed_annotations.values('completed_by').distinct().count()
        return n >= self.overlap

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

    def can_be_skipped(self) -> bool:
        return True


class AnnotationMixin:
    def has_permission(self, user: 'User') -> bool:  # noqa: F821
        """
        Check if user has permission to access this annotation
        Delegates to task/project permission check
        """
        if not user or not user.is_authenticated:
            return False

        # Basic access: user must be project member
        if not self.task.project.has_permission(user):
            return False

        # For viewing/modifying: check role-based permissions
        # Owners and reviewers can access all annotations
        # Annotators can only access their own
        role = self.task.project.get_user_role(user)

        if role in ['owner', 'reviewer']:
            return True

        # Annotators can only access their own annotations
        return self.completed_by == user

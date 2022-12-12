from core.redis import start_job_async_or_sync


class ProjectMixin:
    def rearrange_overlap_cohort(self):
        """
        Async start rearrange overlap depending on annotation count in tasks
        """
        start_job_async_or_sync(self._rearrange_overlap_cohort)

    def update_tasks_counters(self, tasks_queryset, from_scratch=True):
        """
        Async start updating tasks counters
        :param tasks_queryset: Tasks to update queryset
        :param from_scratch: Skip calculated tasks
        """
        start_job_async_or_sync(self._update_tasks_counters, tasks_queryset, from_scratch=from_scratch)

    def update_tasks_counters_and_is_labeled(self, tasks_queryset, from_scratch=True):
        """
        Async start updating tasks counters and than is_labeled
        :param tasks_queryset: Tasks to update queryset
        :param from_scratch: Skip calculated tasks
        """
        # get only id from queryset to decrease data size in job
        if not (isinstance(tasks_queryset, set) or isinstance(tasks_queryset, list)):
            tasks_queryset = set(tasks_queryset.values_list('id', flat=True))
        start_job_async_or_sync(self._update_tasks_counters_and_is_labeled, tasks_queryset, from_scratch=from_scratch)

    def update_tasks_counters_and_task_states(self, tasks_queryset, maximum_annotations_changed,
                                            overlap_cohort_percentage_changed, tasks_number_changed, from_scratch=True):
        """
        Async start updating tasks counters and than rearrange
        :param tasks_queryset: Tasks to update queryset
        :param maximum_annotations_changed: If maximum_annotations param changed
        :param overlap_cohort_percentage_changed: If cohort_percentage param changed
        :param tasks_number_changed: If tasks number changed in project
        :param from_scratch: Skip calculated tasks
        """
        # get only id from queryset to decrease data size in job
        if not (isinstance(tasks_queryset, set) or isinstance(tasks_queryset, list)):
            tasks_queryset = set(tasks_queryset.values_list('id', flat=True))
        start_job_async_or_sync(self._update_tasks_counters_and_task_states, tasks_queryset, maximum_annotations_changed,
                                overlap_cohort_percentage_changed, tasks_number_changed, from_scratch=from_scratch)

    def update_tasks_states(self,
                            maximum_annotations_changed,
                            overlap_cohort_percentage_changed,
                            tasks_number_changed):
        """
        Async start updating tasks states after settings change
        :param maximum_annotations_changed: If maximum_annotations param changed
        :param overlap_cohort_percentage_changed: If cohort_percentage param changed
        :param tasks_number_changed: If tasks number changed in project
        """
        start_job_async_or_sync(self._update_tasks_states,
                                maximum_annotations_changed,
                                overlap_cohort_percentage_changed,
                                tasks_number_changed)

    def has_permission(self, user):
        """
        Dummy stub for has_permission
        """
        return True

    def _can_use_overlap(self):
        """
        Returns if we can use overlap for is_labeled calculation
        :return:
        """
        return True

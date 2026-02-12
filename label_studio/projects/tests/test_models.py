"""Tests for projects.models (Project model and related logic)."""
from django.test import TestCase
from projects.tests.factories import ProjectFactory
from tasks.models import Task
from tasks.tests.factories import AnnotationFactory, TaskFactory
from tests.utils import mock_feature_flag


class TestRearrangeOverlapCohort(TestCase):
    """
    Tests for Project._rearrange_overlap_cohort().

    Covers overlap cohort assignment when overlap_cohort_percentage < 100:
    correct cohort size, deterministic vs random tie-breaking (feature flag),
    and prioritization of tasks with more annotations (progress preservation).
    """

    @mock_feature_flag('fflag_feat_utc_563_randomize_overlap_cohort', True, parent_module='projects.models')
    def test_randomize_when_flag_on(self):
        """
        With fflag_feat_utc_563_randomize_overlap_cohort on, cohort selection
        varies across runs because tie-breaking within same annotation count
        is random. Expected: at least 2 distinct cohort ID sets over 10 runs,
        and cohort size always equals must_tasks.
        """
        num_tasks = 20
        overlap_cohort_pct = 25
        expected_cohort_size = int(num_tasks * overlap_cohort_pct / 100 + 0.5)  # 5
        project = ProjectFactory(
            maximum_annotations=2,
            overlap_cohort_percentage=overlap_cohort_pct,
        )
        TaskFactory.create_batch(num_tasks, project=project)

        cohorts_seen = set()
        for _ in range(10):
            project._rearrange_overlap_cohort()
            cohort_ids = frozenset(Task.objects.filter(project=project, overlap__gt=1).values_list('id', flat=True))
            assert len(cohort_ids) == expected_cohort_size
            cohorts_seen.add(cohort_ids)
        assert len(cohorts_seen) >= 2, 'Random tie-breaking should produce at least 2 different cohorts over 10 runs'

    @mock_feature_flag('fflag_feat_utc_563_randomize_overlap_cohort', False, parent_module='projects.models')
    def test_deterministic_when_flag_off(self):
        """
        With fflag_feat_utc_563_randomize_overlap_cohort off, cohort selection
        is deterministic. Expected: two consecutive runs yield the same cohort
        ID set and correct cohort size.
        """
        num_tasks = 20
        overlap_cohort_pct = 25
        expected_cohort_size = int(num_tasks * overlap_cohort_pct / 100 + 0.5)
        project = ProjectFactory(
            maximum_annotations=2,
            overlap_cohort_percentage=overlap_cohort_pct,
        )
        TaskFactory.create_batch(num_tasks, project=project)

        project._rearrange_overlap_cohort()
        cohort_first = frozenset(Task.objects.filter(project=project, overlap__gt=1).values_list('id', flat=True))
        project._rearrange_overlap_cohort()
        cohort_second = frozenset(Task.objects.filter(project=project, overlap__gt=1).values_list('id', flat=True))
        assert len(cohort_first) == expected_cohort_size
        assert cohort_first == cohort_second

    @mock_feature_flag('fflag_feat_utc_563_randomize_overlap_cohort', True, parent_module='projects.models')
    def test_preserves_progress_when_flag_on(self):
        """
        Tasks with more finished annotations are prioritized into the cohort
        (progress preserved). With flag on, only tie-breaking is random.
        Expected: tasks that already have one annotation are in the cohort.
        """
        num_tasks = 10
        overlap_cohort_pct = 30
        expected_cohort_size = int(num_tasks * overlap_cohort_pct / 100 + 0.5)  # 3
        project = ProjectFactory(
            maximum_annotations=2,
            overlap_cohort_percentage=overlap_cohort_pct,
        )
        tasks = TaskFactory.create_batch(num_tasks, project=project)
        for t in tasks[:2]:
            AnnotationFactory(
                task=t,
                project=project,
                result=[
                    {
                        'value': {'choices': ['A']},
                        'from_name': 'text_class',
                        'to_name': 'text',
                        'type': 'choices',
                    }
                ],
                was_cancelled=False,
                ground_truth=False,
            )

        project._rearrange_overlap_cohort()

        cohort_ids = set(Task.objects.filter(project=project, overlap__gt=1).values_list('id', flat=True))
        assert len(cohort_ids) == expected_cohort_size
        assert tasks[0].id in cohort_ids
        assert tasks[1].id in cohort_ids

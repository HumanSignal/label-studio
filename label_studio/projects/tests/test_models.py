"""Tests for projects.models (Project model and related logic)."""

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from projects.models import Project
from projects.tests.factories import ProjectFactory
from tasks.models import Prediction, Task
from tasks.tests.factories import AnnotationFactory, TaskFactory
from users.tests.factories import UserFactory


class TestUpdateTasksStatesStaleProjectInstance(TestCase):
    """
    Async overlap rewrite jobs pickle a Project instance. If Quality settings
    change concurrently (e.g. during duplication), the job must apply current
    DB values, not stale in-memory maximum_annotations.
    """

    def test_update_tasks_states_uses_db_maximum_annotations(self):
        project = ProjectFactory(
            maximum_annotations=3,
            overlap_cohort_percentage=100,
        )
        TaskFactory.create_batch(5, project=project, overlap=1)
        assert project.maximum_annotations == 3

        Project.objects.filter(pk=project.pk).update(maximum_annotations=2)
        # In-memory instance still has the stale value (as after RQ unpickle).
        assert project.maximum_annotations == 3

        project._update_tasks_states(
            maximum_annotations_changed=True,
            overlap_cohort_percentage_changed=False,
            tasks_number_changed=False,
        )

        assert project.maximum_annotations == 2
        assert set(Task.objects.filter(project=project).values_list('overlap', flat=True)) == {2}

    def test_rearrange_overlap_cohort_uses_db_maximum_annotations(self):
        project = ProjectFactory(
            maximum_annotations=3,
            overlap_cohort_percentage=100,
        )
        TaskFactory.create_batch(5, project=project, overlap=1)
        assert project.maximum_annotations == 3

        Project.objects.filter(pk=project.pk).update(maximum_annotations=2)
        assert project.maximum_annotations == 3

        project._rearrange_overlap_cohort()

        assert project.maximum_annotations == 2
        assert set(Task.objects.filter(project=project).values_list('overlap', flat=True)) == {2}


class TestRearrangeOverlapCohort(TestCase):
    """
    Tests for Project._rearrange_overlap_cohort().

    Covers overlap cohort assignment when overlap_cohort_percentage < 100:
    correct cohort size, random tie-breaking,
    and prioritization of tasks with more annotations (progress preservation).
    """

    def test_randomizes_tie_breaking(self):
        """
        Cohort selection varies across runs because tie-breaking within the
        same annotation count is random. Expected: at least 2 distinct cohort
        ID sets over 10 runs, and cohort size always equals must_tasks.
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

    def test_preserves_progress(self):
        """
        Tasks with more finished annotations are prioritized into the cohort
        (progress preserved). Only tie-breaking is random.
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


class TestProjectHasPermission(TestCase):
    """LSO has one organization, so has_permission only has to reject revoked membership."""

    def test_member_is_allowed(self):
        project = ProjectFactory()
        user = UserFactory(active_organization=project.organization)

        assert project.has_permission(user) is True

    def test_removed_member_is_rejected(self):
        project = ProjectFactory()
        user = UserFactory(active_organization=project.organization)

        user.om_through.get(organization=project.organization).soft_delete()

        assert project.has_permission(user) is False

    def test_project_without_organization_is_allowed(self):
        project = Project.objects.create(title='No organization')
        user = UserFactory()

        assert project.has_permission(user) is True


class TestDeletePredictionsBumpsTaskUpdatedAt(TestCase):
    def test_delete_model_version_predictions_bumps_only_affected_tasks(self):
        """FIT-3092: QuerySet.delete skips Prediction.delete(); incremental exports need updated_at to move."""
        project = ProjectFactory()
        affected = TaskFactory(project=project)
        other_version = TaskFactory(project=project)
        Prediction.objects.create(task=affected, project=project, result=[], model_version='v1')
        Prediction.objects.create(task=other_version, project=project, result=[], model_version='v2')
        stale = timezone.now() - timedelta(days=3)
        Task.objects.filter(id__in=[affected.id, other_version.id]).update(updated_at=stale)

        assert project.delete_predictions(model_version='v1') == {'deleted_predictions': 1}

        affected.refresh_from_db()
        other_version.refresh_from_db()
        assert affected.updated_at > stale
        assert other_version.updated_at == stale

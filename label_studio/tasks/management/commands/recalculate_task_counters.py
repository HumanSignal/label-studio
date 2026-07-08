"""Recalculate denormalized task counters (total_annotations, cancelled_annotations,
total_predictions) for a project or organization.

Use this to repair drifted counters, e.g. tasks that show a non-zero annotation count in
the Data Manager while having no (or a different number of) actual annotations. Counters
(total_annotations, cancelled_annotations, total_predictions) AND the ``is_labeled`` state
are recomputed from the real annotation/prediction rows via
``Project.update_tasks_counters_and_is_labeled``.

Examples:
    # Report drift for a single project without changing anything
    python manage.py recalculate_task_counters --project 266281 --dry-run

    # Repair a single project
    python manage.py recalculate_task_counters --project 266281

    # Repair every project in an organization
    python manage.py recalculate_task_counters --organization 59834
"""

import logging

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Count, F, Q
from projects.models import Project
from tasks.models import Task

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Recalculate denormalized task counters for a project or organization'

    def add_arguments(self, parser):
        parser.add_argument('--project', type=int, default=None, help='Project id to recalculate')
        parser.add_argument(
            '--organization', type=int, default=None, help='Organization id (recalculates all its projects)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Only report how many tasks have drifted counters; do not modify anything',
        )

    def _drifted_count(self, project):
        """Number of tasks whose cached total_annotations disagrees with the real count."""
        return (
            Task.objects.filter(project=project)
            .annotate(real_total=Count('annotations', filter=Q(annotations__was_cancelled=False), distinct=True))
            .exclude(total_annotations=F('real_total'))
            .count()
        )

    def handle(self, *args, **options):
        project_id = options.get('project')
        organization_id = options.get('organization')
        dry_run = options.get('dry_run')

        if not project_id and not organization_id:
            raise CommandError('Provide --project <id> or --organization <id>')

        if project_id:
            projects = Project.objects.filter(id=project_id)
            if not projects.exists():
                raise CommandError(f'Project {project_id} not found')
        else:
            projects = Project.objects.filter(organization_id=organization_id)
            if not projects.exists():
                raise CommandError(f'No projects found for organization {organization_id}')

        for project in projects:
            drifted_before = self._drifted_count(project)
            self.stdout.write(
                f'Project {project.id} ({project.title!r}): {drifted_before} task(s) with drifted counters'
            )

            if dry_run:
                continue

            # Recompute counters AND is_labeled (run_sync=True runs the canonical
            # update_tasks_counters + bulk_update_stats_project_tasks inline, batched
            # in transactions), so is_labeled can't be left stale after the counters change.
            updated = project.update_tasks_counters_and_is_labeled(Task.objects.filter(project=project), run_sync=True)
            drifted_after = self._drifted_count(project)
            self.stdout.write(
                self.style.SUCCESS(
                    f'Project {project.id}: recalculated {updated} task(s); '
                    f'drifted counters {drifted_before} -> {drifted_after}'
                )
            )

        if dry_run:
            self.stdout.write('Dry run complete; no changes were made.')

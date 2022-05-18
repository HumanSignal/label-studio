from django.core.management.base import BaseCommand

from projects.models import Project


class Command(BaseCommand):
    help = 'Recalculate organization project stats (total_annotations, etc)'

    def add_arguments(self, parser):
        parser.add_argument('organization', type=int, help='organization id')

    def handle(self, *args, **options):
        projects = Project.objects.filter(organization_id=options['organization'])

        for project in projects:
            project.update_tasks_counters(project.tasks.all())

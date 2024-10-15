from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Recalculate project stats (total_annotations, etc) for all organizations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--from-scratch',
            dest='from_scratch',
            action='store_true',
            default=False,
            help='Start recalculation from scratch',
        )
        parser.add_argument(
            '--redis',
            dest='redis',
            action='store_true',
            default=False,
            help='Use rq workers with redis (async background processing)',
        )

    def handle(self, *args, **options):
        from tasks.functions import calculate_stats_all_orgs

        calculate_stats_all_orgs(from_scratch=options['from_scratch'], redis=options['redis'])

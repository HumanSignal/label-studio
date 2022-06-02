from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Recalculate project stats (total_annotations, etc) for all organizations'

    def handle(self, *args, **options):
        from tasks.functions import calculate_stats_all_orgs

        calculate_stats_all_orgs()

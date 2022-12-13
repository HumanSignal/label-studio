import importlib
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Fill updated_by field for Annotations'

    def add_arguments(self, parser):
        pass

    def handle(self, *args, **options):
        migration = importlib.import_module('tasks.migrations.0032_annotation_updated_by_fill')
        migration.forward(None, None) # Unused position args        

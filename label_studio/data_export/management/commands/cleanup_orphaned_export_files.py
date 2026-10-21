"""Find and delete export files that no export snapshot or converted format references.

Snapshot files used to stay in storage after their snapshot was deleted, so storage can hold
files left from deleted snapshots and deleted projects. The command walks the export directory
of the default storage (local disk, S3, GCS or Azure) and lists every file under it that no
``Export.file`` or ``ConvertedFormat.file`` row references. Files modified less than
``--min-age-hours`` ago are skipped, so exports still being written are not touched.

``--legacy`` also sweeps the local ``EXPORT_DIR``, where older versions kept a copy of every
quick export as a ``<name>.json`` + ``<name>-info.json`` pair. Only complete pairs are deleted.

Nothing is deleted without ``--delete``.

Examples:
    # List orphaned files
    python manage.py cleanup_orphaned_export_files

    # Delete them, including the legacy quick-export copies
    python manage.py cleanup_orphaned_export_files --legacy --delete
"""

import os
import time
from datetime import timedelta

from core.utils.common import batch
from data_export.models import ConvertedFormat, Export
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

LEGACY_INFO_SUFFIX = '-info.json'


class Command(BaseCommand):
    help = 'Find and delete export files that no export snapshot or converted format references'

    def add_arguments(self, parser):
        parser.add_argument('--delete', action='store_true', help='Delete the files instead of only listing them')
        parser.add_argument(
            '--min-age-hours',
            type=float,
            default=24,
            help='Skip files modified less than this many hours ago (default: 24)',
        )
        parser.add_argument(
            '--legacy',
            action='store_true',
            help='Also sweep <name>.json + <name>-info.json quick-export copies from the local EXPORT_DIR',
        )

    def handle(self, *args, **options):
        self.delete = options['delete']
        self.min_age = timedelta(hours=options['min_age_hours'])
        self.found = self.deleted = self.failed = 0

        self._cleanup_storage()
        if options['legacy']:
            self._cleanup_legacy_export_dir()

        if self.delete:
            self.stdout.write(f'Deleted {self.deleted} file(s), failed to delete {self.failed}')
        else:
            self.stdout.write(f'Found {self.found} orphaned file(s); run with --delete to remove them')

    def _cleanup_storage(self):
        storage = Export._meta.get_field('file').storage
        cutoff = timezone.now() - self.min_age
        for names in self._walk(storage, settings.DELAYED_EXPORT_DIR):
            for chunk in batch(names, 1000):
                referenced = set(Export.objects.filter(file__in=chunk).values_list('file', flat=True))
                referenced |= set(ConvertedFormat.objects.filter(file__in=chunk).values_list('file', flat=True))
                for name in chunk:
                    if name not in referenced and self._is_older_than(storage, name, cutoff):
                        self._remove(name, storage.delete)

    def _walk(self, storage, path):
        """Yield the file names of each directory under path, one list per directory"""
        try:
            dirs, files = storage.listdir(path)
        except FileNotFoundError:
            return
        if files:
            yield [f'{path}/{file}' for file in files]
        for directory in dirs:
            yield from self._walk(storage, f'{path}/{directory}')

    def _is_older_than(self, storage, name, cutoff):
        if not self.min_age:
            return True
        try:
            return storage.get_modified_time(name) < cutoff
        except (NotImplementedError, OSError):
            # the age is unknown, so the file may belong to an export in progress
            return False

    def _cleanup_legacy_export_dir(self):
        export_dir = settings.EXPORT_DIR
        if not os.path.isdir(export_dir):
            return
        cutoff = time.time() - self.min_age.total_seconds()
        for info_name in sorted(os.listdir(export_dir)):
            if not (info_name.startswith('project-') and info_name.endswith(LEGACY_INFO_SUFFIX)):
                continue
            pair = [
                os.path.join(export_dir, info_name[: -len(LEGACY_INFO_SUFFIX)] + '.json'),
                os.path.join(export_dir, info_name),
            ]
            if all(os.path.isfile(path) and os.path.getmtime(path) < cutoff for path in pair):
                for path in pair:
                    self._remove(path, os.remove)

    def _remove(self, name, delete_func):
        self.found += 1
        if not self.delete:
            self.stdout.write(f'Orphaned: {name}')
            return
        try:
            delete_func(name)
        except Exception as e:
            self.failed += 1
            self.stderr.write(f'Failed to delete {name}: {e}')
        else:
            self.deleted += 1
            self.stdout.write(f'Deleted: {name}')

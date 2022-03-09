"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import json
import logging
import signal
import os
from pathlib import Path
from subprocess import run, Popen
from time import sleep
from typing import Dict, Optional, Tuple

from django.conf import settings
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import ValidationError

from io_storages.base_models import (
      ExportStorage,
      ExportStorageLink,
      ImportStorage,
      ImportStorageLink,
)
from tasks.models import Annotation

PFS_DIR = Path("/pfs")
logger = logging.getLogger(__name__)

mount_processes: Dict[int, Popen] = {}


class PachydermMixin(models.Model):
    repository = models.TextField(_('repository'), blank=True, help_text='Local path')
    process: Optional[Popen] = None

    @property
    def is_mounted(self) -> bool:
        # Maybe we should do something with the stored process here.
        return self.local_path.exists()

    @property
    def mount_point(self) -> Path:
        return PFS_DIR / str(self.repository)

    @property
    def local_path(self) -> Path:
        repo_name, _ = self.repo_and_branch
        return self.mount_point / repo_name

    @property
    def repo_and_branch(self) -> Tuple[str, str]:
        repo_name, _, branch = str(self.repository).partition("@")
        return repo_name, branch

    def mount(self, wait: int = 30, *, writable: bool = False) -> None:
        repository = f"{self.repository}{'+w' if writable else ''}"
        command = ["pachctl", "mount", "-r", repository, str(self.mount_point)]
        process = mount_processes.pop(self.pk, None)
        if process is not None:
            logger.warning(f"Sending SIGINT to {process.pid} to cleanup old mount")
            # Must send SIGINT for pachctl to cleanup mount properly.
            process.send_signal(signal.SIGINT)
            process.wait()

        self.mount_point.mkdir(exist_ok=True)
        logger.debug(f"Mounting repository: {self.repository}")
        if not self.is_mounted:
            mount_processes[self.pk] = Popen(command)
            for _ in range(wait):
                if self.is_mounted:
                    break
                sleep(1)

    def unmount(self) -> None:
        logger.debug(f"Unmounting repository: {self.repository}")
        run(["pachctl", "unmount", str(self.mount_point)], capture_output=True, check=True)
        del mount_processes[self.pk]

    def clean(self):
        """
        Hook for doing any extra model-wide validation after clean() has been
        called on every field by self.clean_fields. Any ValidationError raised
        by this method will not be associated with a particular field; it will
        have a special-case association with the field defined by NON_FIELD_ERRORS.
        """
        repo_name, branch = self.repo_and_branch
        branch = branch or "master"
        self.repository = f"{repo_name}@{branch}"
        super().clean()

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)
        if self.is_mounted:
            self.unmount()

    def validate_connection(self):
        if not PFS_DIR.is_dir():
            raise ValidationError(f"Mount directory {PFS_DIR} does not exist.")
        repo_name, branch = self.repo_and_branch
        list_branch = run(["pachctl", "list", "branch", repo_name], capture_output=True)
        if list_branch.returncode:
            raise ValidationError(f"Pachyderm repo not found: {repo_name}")

        branches = {
            line.split()[0].decode() for line in list_branch.stdout.splitlines()[1:]
        }
        if branch not in branches:
            # Branch might be a commit
            list_commit = run(["pachctl", "list", "commit", self.repository], capture_output=True)
            if list_commit.returncode:
                raise ValidationError(
                    f"branch/commit {branch} not found for Pachyderm repo {repo_name}"
                )


class PachydermImportStorage(PachydermMixin, ImportStorage):
    url_scheme = 'https'

    def can_resolve_url(self, url):
        return False

    def iterkeys(self):
        for file in self.local_path.rglob('*'):
            if file.is_file():
                yield str(file)

    def get_data(self, key):
        relative_path = str(Path(key).relative_to(PFS_DIR))
        return {settings.DATA_UNDEFINED_NAME: f'{settings.HOSTNAME}/data/pfs/?d={relative_path}'}

    def scan_and_create_links(self):
        return self._scan_and_create_links(PachydermImportStorageLink)

    def sync(self):
        self.mount()
        self.scan_and_create_links()


class PachydermExportStorage(ExportStorage, PachydermMixin):

    def save_annotation(self, annotation):
        if not self.is_mounted:
            raise RuntimeError(
                f"Output repository \"{self.repository}\" not mounted\n"
                f"Please sync the associated target cloud storage"
            )

        logger.debug(f'Creating new object on {self.__class__.__name__} Storage {self} for annotation {annotation}')
        ser_annotation = self._get_serialized_data(annotation)

        # get key that identifies this object in storage
        key = PachydermExportStorageLink.get_key(annotation)
        key = os.path.join(self.local_path, f"{key}.json")

        # put object into storage
        with open(key, mode='w') as f:
            json.dump(ser_annotation, f, indent=2)

        # Create export storage link
        PachydermExportStorageLink.create(annotation, self)

    def sync(self):
        if not self.is_mounted:
            self.mount(writable=True)
        self.save_all_annotations()
        self.unmount()
        self.mount(writable=True)


class PachydermImportStorageLink(ImportStorageLink):
    storage = models.ForeignKey(PachydermImportStorage, on_delete=models.CASCADE, related_name='links')


class PachydermExportStorageLink(ExportStorageLink):
    storage = models.ForeignKey(PachydermExportStorage, on_delete=models.CASCADE, related_name='links')


@receiver(post_save, sender=Annotation)
def export_annotation_to_local_files(sender, instance, **kwargs):
    project = instance.task.project
    if hasattr(project, 'io_storages_pachydermexportstorages'):
        for storage in project.io_storages_pachydermexportstorages.all():
            logger.debug(f'Export {instance} to Local Storage {storage}')
            storage.save_annotation(instance)

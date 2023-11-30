"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import json
import logging
import threading

from django.conf import settings
from django.db import models
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.utils.translation import gettext_lazy as _
from io_storages.base_models import (
    ExportStorage,
    ExportStorageLink,
    ImportStorage,
    ImportStorageLink,
    ProjectStorageMixin,
)
from tasks.models import Annotation

from aperturedb import Connector

logger = logging.getLogger(__name__)


class ApertureDBStorageMixin(models.Model):
    hostname = models.TextField(_('hostname'), null=True, blank=True, 
                                help_text='ApertureDB host name')
    port = models.PositiveIntegerField(_('port'), null=True, blank=True,
                                       help_text='ApertureDB host port')
    username = models.TextField(_('username'),null=True, blank=True, 
                                help_text='ApertureDB user name')
    password = models.TextField(_('password'), null=True, blank=True, 
                                help_text='ApertureDB user password')
    token = models.TextField(_('token'), null=True, blank=True, 
                             help_text='ApertureDB user token')
    use_ssl = models.BooleanField(_('use_ssl'), default=True,
                                  help_text='Use SSL when communicating with ApertureDB')
    _db_lock = threading.Lock()
    _db = None

    def _response_status(self, response):
        if isinstance(response, list):
            return max([self._response_status(val) for val in response])
        elif isinstance(response, dict):
            if "status" in response:
                return response["status"]
            for val in response.items():
                return self._response_status(val)

    def get_connection(self):
        with self._db_lock:
            if self._db is None:
                self._db = Connector.Connector(
                    str(self.hostname),
                    self.port, user=str(self.username),
                    password=str(self.password),
                    token=str(self.token),
                    use_ssl=self.use_ssl)
        return self._db

    def validate_connection(self, client=None):
        db = self.get_connection()
        res = db.query([{"GetStatus": {}}])
        if self._response_status(res) != 0:
            raise ValueError(f"Failed to connect to ApertureDB: {db.get_last_response_str()}")

    class Meta:
        abstract = True


class ApertureDBImportStorageBase(ApertureDBStorageMixin, ImportStorage):

    constraints = models.TextField(
        _('constraints'),
        blank=True, null=True,
        help_text='ApertureDB FindImage constraints (see https://docs.aperturedata.io/query_language/Reference/shared_command_parameters/constraints)')

    def iterkeys(self):
        db = self.get_connection()
        limit = 100
        offset = 0
        find_images = {
            "uniqueids": True,
            "blobs": False,
            "limit": limit
        }
        if self.constraints:
            find_images["constrants"] = json.loads(str(self.constraints))

        while (True):
            find_images["offset"] = offset
            res, _, = db.query([{"FindImages": find_images}])
            if self._response_status(res) != 0:
                raise ValueError(f"Failed to query images: {db.get_last_response_str()}")
            fe_result = res[0]["FindImages"]
            if fe_result["returned"] == 0:
                return
            for ent in fe_result["entities"]:
                yield ent["_uniqueid"]
            offset += limit

    def get_data(self, key):
        return {
            settings.DATA_UNDEFINED_NAME: f'{settings.HOSTNAME}/data/aperturedb/?host={self.hostname}&key={key}'
        }

    def get_blob(self, uniqueid):
        db = self.get_connection()
        res, blob = db.query([{
            "FindImage": {
                "blobs": True,
                "unique": True,
                "constraints": {
                    "_uniqueid": ["==", uniqueid]
                },
            }
        }])

        status = self._response_status(res)
        if status == 0:
            return blob[0]
        if status == 1:  # empty
            return None
        raise ValueError(f"Error retrieving ApertureDB image data : {db.get_last_response_str()}")

    def scan_and_create_links(self):
        return self._scan_and_create_links(ApertureDBImportStorageLink)

    class Meta:
        abstract = True


class ApertureDBImportStorage(ProjectStorageMixin, ApertureDBImportStorageBase):
    class Meta:
        abstract = False


class ApertureDBExportStorage(ApertureDBStorageMixin, ExportStorage):

    def save_annotation(self, annotation):
        raise NotImplementedError


class ApertureDBImportStorageLink(ImportStorageLink):
    storage = models.ForeignKey(ApertureDBImportStorage,
                                on_delete=models.CASCADE, related_name='links')


class ApertureDBExportStorageLink(ExportStorageLink):
    storage = models.ForeignKey(ApertureDBExportStorage,
                                on_delete=models.CASCADE, related_name='links')

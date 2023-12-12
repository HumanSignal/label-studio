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
            for val in response.values():
                return self._response_status(val)

    def get_connection(self):
        if self._db is None:
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
        res, _ = db.query([{"GetStatus": {}}])
        if self._response_status(res) != 0:
            raise ValueError(f"Failed to connect to ApertureDB: {db.get_last_response_str()}")

    class Meta:
        abstract = True


class ApertureDBImportStorageBase(ApertureDBStorageMixin, ImportStorage):
    url_scheme = "none"

    constraints = models.TextField(
        _('constraints'),
        blank=True, null=True,
        help_text='ApertureDB FindImage constraints (see https://docs.aperturedata.io/query_language/Reference/shared_command_parameters/constraints)')
    
    predictions = models.BooleanField(_('predictions'), default=False,
                                  help_text='Load predictions from ApertureDB?')
    
    pred_conditions = models.TextField(
        _('constraints'),
        blank=True, null=True,
        help_text='ApertureDB constraints on predictions (see https://docs.aperturedata.io/query_language/Reference/shared_command_parameters/constraints)')

    def iterkeys(self):
        db = self.get_connection()

        limit = 60
        batch = 60

        offset = 0
        find_images = {
            "uniqueids": True,
            "blobs": False,
            "limit": batch
        }
        if self.constraints:
            find_images["constrants"] = json.loads(str(self.constraints))

        while (offset < limit):
            find_images["offset"] = offset
            res, _, = db.query([{"FindImage": find_images}])
            if self._response_status(res) != 0:
                raise ValueError(f"Failed to query images: {db.get_last_response_str()}")
            fe_result = res[0]["FindImage"]
            if fe_result["returned"] == 0:
                return
            for ent in fe_result["entities"]:
                yield ent["_uniqueid"]
            offset += batch

    @staticmethod
    def _adb_to_rectanglelabels(img, bboxen):
        width = img["width"]
        height = img["height"]
        return [{
            "result": [{
                "from_name": "label",
                "to_name": "image",
                "id": bbx["_uniqueid"],
                "type": "rectanglelabels",
                "original_width": width,
                "original_height": height,
                "image_rotation": 0,
                "value": {
                    "rotation": 0,
                    "x": 100 * bbx["_coordinates"]["x"] / width,
                    "y": 100 * bbx["_coordinates"]["y"] / height,
                    "width": 100 * bbx["_coordinates"]["width"] / width,
                    "height": 100 * bbx["_coordinates"]["height"] / height,
                    "rectanglelabels": [bbx["_label"]]
                }
            } for bbx in bboxen]
        }]
        
    def _get_bbox_labels(self, key):
        db = self.get_connection()
        query = [{
            "FindImage": {
                "blobs": False,
                "_ref": 1,
                "results": {
                    "list": ["width", "height"]
                },
                "constraints": {
                    "_uniqueid": ["==", key]
                }
            }
        },{
            "FindBoundingBox": {
                "image_ref": 1,
                "blobs": False,
                "coordinates": True,
                "labels": True,
                "uniqueids": True
            }
        }]

        res, _ = db.query(query)
        status = self._response_status(res)
        if status == 0:
            return self._adb_to_rectanglelabels(res[0]["FindImage"]["entities"][0] or {}, res[1]["FindBoundingBox"]["entities"] if res[1]["FindBoundingBox"]["returned"] > 0 else [])
        if status == 1:  # empty
            return None
        raise ValueError(f"Error retrieving ApertureDB image data : {db.get_last_response_str()}")


    def get_data(self, key):
        uri = f'{settings.HOSTNAME}/data/aperturedb/?title={self.title}&key={key}'
        data = {settings.DATA_UNDEFINED_NAME: uri}
        if self.predictions:
            return {
                "predictions": self._get_bbox_labels(key),
                "data": data
            }
        return data

    def get_blob(self, uniqueid):
        db = self.get_connection()
        res, blob = db.query([{
            "FindImage": {
                "blobs": True,
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

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

        limit = 10000
        batch = 100

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
                "id": str(bbx["LS_id"]) if bbx["LS_id"] is not None else bbx["_uniqueid"],
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
        }] if len(bboxen) > 0 else []
        
    def _get_bbox_annotations(self, key):
        db = self.get_connection()
        query = [{
            "FindImage": {
                "blobs": False,
                "_ref": 1,
                "results": {
                    "list": ["width", "height"]
                },
                "constraints": {
                    "width": [">", 0],
                    "height": [">", 0],
                    "_uniqueid": ["==", key]
                }
            }
        },{
            "FindEntity": {
                "with_class": "LS_annotation",
                "is_connected_to": { 
                    "ref": 1 
                },
                "results": {
                    "list": ["LS_data"]
                }
            }
        },{
            "FindBoundingBox": {
                "image_ref": 1,
                "blobs": False,
                "coordinates": True,
                "labels": True,
                "uniqueids": True,
                "results": {
                    "list": ["LS_id"]
                },
                "constraints": {
                    "LS_id": ["==", None],
                }
            }
        }]

        res, _ = db.query(query)
        status = self._response_status(res)
        anns = []
        preds = []
        if status == 0:
            img = res[0]["FindImage"]["entities"][0] or {}
            annotations = res[1]["FindEntity"]["entities"] if res[1]["FindEntity"]["returned"] > 0 else []
            bboxen = res[2]["FindBoundingBox"]["entities"] if res[2]["FindBoundingBox"]["returned"] > 0 else []

            anns = [json.loads(ann["LS_data"]) for ann in annotations]
            anns = [{"result": ann["result"]} for ann in anns]
            preds = self._adb_to_rectanglelabels(img, bboxen)
            return anns, preds
        if status == 1:  # empty
            return [], []
        raise ValueError(f"Error retrieving ApertureDB image data : {db.get_last_response_str()}")


    def get_data(self, key):
        data = {
            "data": {
                settings.DATA_UNDEFINED_NAME: f'{settings.HOSTNAME}/data/aperturedb/?title={self.title}&key={key}'
            }
        }

        anns, preds = self._get_bbox_annotations(key)
        if len(anns) > 0:
            data["annotations"] = anns
        if len(preds) > 0:
            data["predictions"] = preds
        return data

    def get_blob(self, uniqueid):
        db = self.get_connection()
        req = [{
            "FindImage": {
                "blobs": True,
                "constraints": {
                    "_uniqueid": ["==", uniqueid]
                },
            }
        }]
        res, blob = db.query(req)

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


class AnnotationBBox():
    @staticmethod
    def _get(obj, key, description="rectangle annotation"):
        if not isinstance(obj, dict):
            raise ValueError(f"{description} must be a dict")
        if not key in obj:
            raise ValueError(f"{description} must include \"{key}\"")
        return obj[key]

    def __init__(self, ann):
        self.original_width = self._get(ann, "original_width")
        self.original_height = self._get(ann, "original_height")
        if self._get(ann, "image_rotation") != 0:
            raise ValueError(f"Annotation must have 0 image_rotation")
        val = self._get(ann, "value")
        self.rect = {
            "x": int(self._get(val, "x", "annotation value") * self.original_width / 100),
            "y": int(self._get(val, "y", "annotation value") * self.original_height / 100),
            "width": int(self._get(val, "width", "annotation value") * self.original_width / 100),
            "height": int(self._get(val, "height", "annotation value") * self.original_height / 100),
        }
        if self._get(val, "rotation", "annotation value") != 0:
            raise ValueError(f"annotation value must have 0 rotation")
        self.labels = val["rectanglelabels"] if "rectanglelabels" in val else []
        if len(self.labels) > 1:
            raise ValueError(f"rectangle annotation can have at most one label: {','.join(self.labels)}")
        self.text = val["text"] if "text" in val else []
    
    @staticmethod
    def _attr_must_match(a, b, attr):
        a_val = a[attr] if isinstance(a, dict) else getattr(a, attr)
        b_val = b[attr] if isinstance(b, dict) else getattr(b, attr)
        if a_val != b_val:
            raise ValueError(f"Annotations have mismatched {attr}: {a_val} != {b_val}")
    
    def merge(self, other):
        if not isinstance(other, AnnotationBBox):
            other = AnnotationBBox(other)
        self._attr_must_match(self, other, "original_width")
        self._attr_must_match(self, other, "original_height")
        self._attr_must_match(self.rect, other.rect, "x")
        self._attr_must_match(self.rect, other.rect, "y")
        self._attr_must_match(self.rect, other.rect, "width")
        self._attr_must_match(self.rect, other.rect, "height")
        self.labels.extend(other.labels)
        if len(self.labels) > 1:
            raise ValueError(f"rectangle annotation can have at most one label: {','.join(self.labels)}")
        self.text.extend(other.text)


class ApertureDBExportStorage(ApertureDBStorageMixin, ExportStorage):

    def save_annotation(self, annotation):
        db = self.get_connection()
        logger.debug(f'Creating new object on {self.__class__.__name__} Storage {self} for annotation {annotation}...')
        ser_annotation = self._get_serialized_data(annotation)

        bbox_map = {}
        regions = annotation.result if isinstance(annotation.result, list) else [annotation.result]
        for ann in regions:
            if not "type" in ann: continue

            if ann["id"] in bbox_map:
                bbox_map[ann["id"]].merge(ann)
            elif ann["type"].startswith("rectangle"):
                bbox_map[ann["id"]] = AnnotationBBox(ann)

        query = [{
            "FindImage": {
                "blobs": False,
                "constraints": {
                    "_uniqueid": ["==", annotation.task.storage_filename]
                },
                "results": {
                    "count": True
                },
                "_ref": 1,
            }
        },{
            "AddEntity": {
                "class": "LS_annotation",
                "if_not_found": {
                    "LS_id": ["==", annotation.id]
                },
                "properties": {
                    "LS_id": annotation.id,
                },
                "connect": {
                    "ref": 1,
                    "class": "LS_annotation_image",
                },
                "_ref": 2
            }
        },{
            "UpdateEntity": {
                "ref": 2,
                "properties": {
                    # "LS_created_at": _convert_datetime(annotation.created_at),
                    "LS_project": annotation.project.title,
                    "LS_completed_by": annotation.completed_by.email,
                    # "LS_updated_at": _convert_datetime(annotation.updated_at),
                    "LS_updated_by": annotation.updated_by.email,
                    "LS_data": json.dumps(ser_annotation)
                }
            }
        }]

        ref = 3
        for id, bbox in bbox_map.items():
            query.extend([{
                "AddBoundingBox": {
                    "image_ref": 1,
                    "_ref": ref,
                    "rectangle": bbox.rect,
                    "properties": {
                        "LS_id": id
                    },
                    "if_not_found": {
                        "any": {
                            "LS_id": ["==", id],
                            "_uniqueid": ["==", id]
                        }
                    }
                }
            },{
                "UpdateBoundingBox": {
                    "ref": ref,
                    "rectangle": bbox.rect,
                    "label": bbox.labels[0] if len(bbox.labels) > 0 else "",
                    "properties": {
                        "LS_text": json.dumps(bbox.text),
                        "LS_annotation": annotation.id,
                        "LS_label": json.dumps(bbox.labels)
                    }
                }
            },{
                "AddConnection": {
                    "class": "LS_annotation_region",
                    "src": 2,
                    "dst": ref,
                    "if_not_found": {}
                }
            }])
            ref += 1
        
        res, _ = db.query(query)
        status = self._response_status(res)
        if (status not in (0,2)):
            raise ValueError(f"Error retrieving ApertureDB image data : {db.get_last_response_str()}")
        logger.debug(f'Saved annotation {annotation} to {self.__class__.__name__} Storage')
        

class ApertureDBImportStorageLink(ImportStorageLink):
    storage = models.ForeignKey(ApertureDBImportStorage,
                                on_delete=models.CASCADE, related_name='links')


class ApertureDBExportStorageLink(ExportStorageLink):
    storage = models.ForeignKey(ApertureDBExportStorage,
                                on_delete=models.CASCADE, related_name='links')

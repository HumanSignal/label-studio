import pathlib
import contextlib
import datetime
import os
import io
import json


from tasks.models import Task, Annotation, Prediction
from projects.models import Project
from data_import.models import FileUpload
from core.utils.io import get_data_dir
from data_manager.models import View, FilterGroup, Filter
from django.core.files.base import File
from io_storages.gcs.models import GCSImportStorage, GCSExportStorage
from io_storages.azure_blob.models import AzureBlobImportStorage, AzureBlobExportStorage
from io_storages.s3.models import S3ImportStorage, S3ExportStorage
from io_storages.redis.models import RedisImportStorage, RedisExportStorage
from ml.models import MLBackend
from core.utils.params import get_env


@contextlib.contextmanager
def suppress_autotime(model, fields):
    """ allow to keep original created_at value for auto_now_add=True field
    """
    _original_values = {}
    for field in model._meta.local_fields:
        if field.name in fields:
            _original_values[field.name] = {'auto_now': field.auto_now, 'auto_now_add': field.auto_now_add}
            field.auto_now = False
            field.auto_now_add = False
    try:
        yield
    finally:
        for field in model._meta.local_fields:
            if field.name in fields:
                field.auto_now = _original_values[field.name]['auto_now']
                field.auto_now_add = _original_values[field.name]['auto_now_add']


def _migrate_tasks(project_path, project):
    """ Migrate tasks from json file to database objects"""
    tasks_path = project_path / 'tasks.json'
    with io.open(os.path.abspath(tasks_path)) as t:
        tasks_data = json.load(t)
        for task_id, task_data in tasks_data.items():
            task = Task.objects.create(data=task_data.get('data', {}), project=project)

            # migrate annotations
            annotations_path = project_path / 'completions' / '{}.json'.format(task_id)
            if annotations_path.exists():
                with io.open(os.path.abspath(annotations_path)) as c:
                    annotations_data = json.load(c)
                    for annotation in annotations_data['completions']:
                        task_annotation = Annotation(
                            result=annotation['result'],
                            task=task,
                            lead_time=annotation['lead_time'],
                            was_cancelled=annotation.get('was_cancelled', False),
                            completed_by=project.created_by,
                        )
                        with suppress_autotime(task_annotation, ['created_at']):
                            task_annotation.created_at = datetime.datetime.fromtimestamp(
                                annotation['created_at'], tz=datetime.datetime.now().astimezone().tzinfo
                            )
                            task_annotation.save()

            # migrate predictions
            predictions_data = task_data.get('predictions', [])
            for prediction in predictions_data:
                task_prediction = Prediction(result=prediction['result'], task=task, score=prediction.get('score'))
                with suppress_autotime(task_prediction, ['created_at']):
                    task_prediction.created_at = datetime.datetime.fromtimestamp(
                        prediction['created_at'], tz=datetime.datetime.now().astimezone().tzinfo
                    )
                    task_prediction.save()


def _migrate_tabs(project_path, project):
    """Migrate tabs from tabs.json to Views table"""
    tabs_path = project_path / 'tabs.json'
    if tabs_path.exists():
        with io.open(os.path.abspath(tabs_path)) as t:
            tabs_data = json.load(t)
            for tab in tabs_data['tabs']:
                view = View.objects.create(project=project)
                tab['id'] = view.id
                ordering = tab.pop('ordering', None)
                selected_items = tab.pop('selectedItems', None)

                # migrate filters
                filter_group = None
                filters = tab.pop('filters', None)
                if filters is not None:
                    filter_group = FilterGroup.objects.create(conjunction=filters.get('conjunction', 'and'))
                    if "items" in filters:
                        for f in filters["items"]:
                            view_filter = Filter.objects.create(
                                **{
                                    "column": f.get("filter", ""),
                                    "operator": f.get("operator", ""),
                                    "type": f.get("type", ""),
                                    "value": f.get("value", {}),
                                }
                            )
                            filter_group.filters.add(view_filter)
                hidden_columns = {'explore': [], 'labeling': []}
                hidden_columns_data = tab.pop('hiddenColumns', None)

                # apply naming change to tabs internal data
                if hidden_columns_data is not None:
                    for c in hidden_columns_data.get('explore', []):
                        hidden_columns['explore'].append(c.replace('completion', 'annotation'))
                    for c in hidden_columns_data.get('labeling', []):
                        hidden_columns['labeling'].append(c.replace('completion', 'annotation'))
                    tab['hiddenColumns'] = hidden_columns
                view.data = tab
                view.ordering = ordering
                view.selected_items = selected_items
                view.filter_group = filter_group
                view.save()


def _migrate_storages(project, config):
    """Migrate source and target storages from config.json to database"""

    # source storages migration
    source = config.get('source', None)
    if source:
        if source.get('type') == 'gcs':
            params = source.get('params', {})
            GCSImportStorage.objects.create(
                project=project,
                bucket=source.get('path'),
                prefix=params.get('prefix'),
                regex_filter=params.get('regex'),
                use_blob_urls=params.get('use_blob_urls'),
            )
        elif source.get('type') == 'azure-blob':
            params = source.get('params', {})
            AzureBlobImportStorage.objects.create(
                project=project,
                container=source.get('path'),
                prefix=params.get('prefix'),
                regex_filter=params.get('regex'),
                use_blob_urls=params.get('use_blob_urls'),
            )
        elif source.get('type') == 's3':
            params = source.get('params', {})
            S3ImportStorage.objects.create(
                project=project,
                bucket=source.get('path'),
                prefix=params.get('prefix'),
                regex_filter=params.get('regex'),
                use_blob_urls=params.get('use_blob_urls'),
                region_name=params.get('region'),
            )
        elif source.get('type') == 'redis':
            params = source.get('params', {})
            RedisImportStorage.objects.create(
                project=project,
                path=source.get('path'),
                host=params.get('host'),
                port=params.get('port'),
                password=params.get('password'),
                db=params.get('db', 1),
            )
    # target storages migration
    target = config.get('target', None)
    if target:
        if target.get('type') == 'gcs':
            params = target.get('params', {})
            GCSExportStorage.objects.create(
                project=project,
                bucket=target.get('path'),
                prefix=params.get('prefix'),
                regex_filter=params.get('regex'),
                use_blob_urls=params.get('use_blob_urls'),
            )
        elif target.get('type') == 'azure-blob':
            params = target.get('params', {})
            AzureBlobExportStorage.objects.create(
                project=project,
                container=target.get('path'),
                prefix=params.get('prefix'),
                regex_filter=params.get('regex'),
                use_blob_urls=params.get('use_blob_urls'),
            )
        elif target.get('type') == 's3':
            params = target.get('params', {})
            S3ExportStorage.objects.create(
                project=project,
                bucket=target.get('path'),
                prefix=params.get('prefix'),
                regex_filter=params.get('regex'),
                use_blob_urls=params.get('use_blob_urls'),
                region_name=params.get('region'),
            )
        elif target.get('type') == 'redis':
            params = target.get('params', {})
            RedisExportStorage.objects.create(
                project=project,
                path=target.get('path'),
                host=params.get('host'),
                port=params.get('port'),
                password=params.get('password'),
                db=params.get('db', 1),
            )


def _migrate_ml_backends(project, config):
    """Migrate ml backend settings from config.json to database"""
    ml_backends = config.get('ml_backends', [])
    for ml_backend in ml_backends:
        MLBackend.objects.create(project=project, url=ml_backend.get('url'), title=ml_backend.get('name'))


def _migrate_uploaded_files(project, project_path):
    """Migrate files uploaded by user"""
    source_upload_path = project_path / 'upload'
    if not source_upload_path.exists():
        return
    target_upload_path = pathlib.Path(get_env('LABEL_STUDIO_BASE_DATA_DIR', get_data_dir())) / 'upload'
    if not target_upload_path.exists():
        os.makedirs(str(target_upload_path), exist_ok=True)

    src_files = os.listdir(str(source_upload_path))
    for file_name in src_files:
        full_file_name = os.path.join(str(source_upload_path), file_name)
        with open(full_file_name, 'rb') as f:
            FileUpload.objects.create(user=project.created_by, project=project, file=File(f, name=file_name))


def migrate_existing_project(project_path, project, config):
    """Migration projects from previous version of Label Studio"""

    _migrate_tasks(project_path, project)
    _migrate_tabs(project_path, project)
    _migrate_storages(project, config)
    _migrate_ml_backends(project, config)
    _migrate_uploaded_files(project, project_path)


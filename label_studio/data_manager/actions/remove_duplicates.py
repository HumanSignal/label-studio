"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

import logging
from collections import defaultdict

import ujson as json
from core.label_config import replace_task_data_undefined_with_config_field
from core.permissions import AllPermissions
from core.redis import start_job_async_or_sync
from data_manager.actions.basic import delete_tasks
from io_storages.azure_blob.models import AzureBlobImportStorageLink
from io_storages.gcs.models import GCSImportStorageLink
from io_storages.localfiles.models import LocalFilesImportStorageLink
from io_storages.redis.models import RedisImportStorageLink
from io_storages.s3.models import S3ImportStorageLink
from tasks.models import Task

logger = logging.getLogger(__name__)
all_permissions = AllPermissions()


def remove_duplicates(project, queryset, **kwargs):
    """Remove duplicated tasks with the same data fields:
    Duplicated tasks will be deleted and all annotations will be moved to the first of the duplicated tasks.
    Storage links will be restored for the first task.
    """
    start_job_async_or_sync(
        remove_duplicates_job,
        project,
        queryset,
        organization_id=project.organization_id,
    )
    return {'response_code': 200}


def remove_duplicates_job(project, queryset, **kwargs):
    """Job for start_job_async_or_sync"""
    duplicates = find_duplicated_tasks_by_data(project, queryset)
    restore_storage_links_for_duplicated_tasks(duplicates)
    move_annotations(duplicates)
    remove_duplicated_tasks(duplicates, project, queryset)

    # totally update tasks counters
    project._update_tasks_counters_and_task_states(
        project.tasks.all(),
        maximum_annotations_changed=True,
        overlap_cohort_percentage_changed=True,
        tasks_number_changed=False,
        from_scratch=True,
    )


def remove_duplicated_tasks(duplicates, project, queryset):
    """Remove duplicated tasks from queryset with condition that they don't have annotations

    :param duplicates: dict with duplicated tasks
    :param project: Project instance
    :param queryset: queryset with input tasks
    :return: queryset with tasks which should be kept
    """
    removing = []
    # prepare main tasks which won't be deleted
    for data in duplicates:
        root = duplicates[data]
        if len(root) == 1:
            continue

        one_task_saved = False
        new_root = []
        for task in root:
            # keep all tasks with annotations in safety
            if task['total_annotations'] + task['cancelled_annotations'] > 0:
                one_task_saved = True
            else:
                new_root.append(task)

        for task in new_root:
            # keep the first task in safety
            if not one_task_saved:
                one_task_saved = True
            # remove all other tasks
            else:
                removing.append(task['id'])

    # get the final queryset for removing tasks
    queryset = queryset.filter(id__in=removing, annotations__isnull=True)
    kept = queryset.exclude(id__in=removing, annotations__isnull=True)

    # check that we don't remove tasks with annotations
    if queryset.count() != len(removing):
        raise Exception(
            f'Remove duplicates failed, operation is not finished: '
            f'queryset count {queryset.count()} != removing {len(removing)}. '
            'It means that some of duplicated tasks have been annotated twice or more.'
        )

    delete_tasks(project, queryset)
    logger.info(f'Removed {len(removing)} duplicated tasks')
    return kept


def move_annotations(duplicates):
    """Move annotations to the first task from duplicated tasks"""
    total_moved_annotations = 0

    for data in duplicates:
        root = duplicates[data]
        if len(root) == 1:
            continue

        # find a task with annotations, make it as "first" main one
        i, first = 0, root[0]
        for i, task in enumerate(root):
            first = task
            if task['total_annotations'] + task['cancelled_annotations'] > 0:
                break

        # move annotations to the first task
        for task in root[i + 1 :]:
            if task['total_annotations'] + task['cancelled_annotations'] > 0:
                Task.objects.get(id=task['id']).annotations.update(task_id=first['id'])
                total_moved_annotations += task['total_annotations'] + task['cancelled_annotations']
                logger.info(
                    f"Moved {task['total_annotations']} annotations from task {task['id']} to task {first['id']}"
                )
                task['total_annotations'] = 0
                task['cancelled_annotations'] = 0


def restore_storage_links_for_duplicated_tasks(duplicates) -> None:
    """Build storage links for duplicated tasks and save them to Task in DB"""

    # storage classes
    classes = {
        'io_storages_s3importstoragelink': S3ImportStorageLink,
        'io_storages_gcsimportstoragelink': GCSImportStorageLink,
        'io_storages_azureblobimportstoragelink': AzureBlobImportStorageLink,
        'io_storages_localfilesimportstoragelink': LocalFilesImportStorageLink,
        'io_storages_redisimportstoragelink': RedisImportStorageLink,
        # 'lse_io_storages_lses3importstoragelink'  # not supported yet
    }

    total_restored_links = 0
    for data in list(duplicates):
        tasks = duplicates[data]
        source = None

        # find first task with existing StorageLink
        for task in tasks:
            for link in classes:
                if link in task and task[link] is not None:
                    # we don't support case when there are many storage links in duplicated tasks
                    if source is not None:
                        source = None
                        break
                    source = (
                        task,
                        classes[link],
                        task[link],
                    )  # last arg is a storage link id

        # add storage links to duplicates
        if source:
            storage_link_class = source[1]  # get link name
            for task in tasks:
                if task['id'] != source[0]['id']:
                    # get already existing StorageLink
                    link_instance = storage_link_class.objects.get(id=source[2])

                    # assign existing StorageLink to other duplicated tasks
                    link = storage_link_class(
                        task_id=task['id'],
                        key=link_instance.key,
                        storage=link_instance.storage,
                    )
                    link.save()
                    total_restored_links += 1
                    logger.info(f"Restored storage link for task {task['id']} from source task {source[0]['id']}")

    logger.info(f'Restored {total_restored_links} storage links for duplicated tasks')


def find_duplicated_tasks_by_data(project, queryset):
    """Find duplicated tasks by `task.data` and return them as a dict"""

    # get io_storage_* links for tasks, we need to copy them
    storages = []
    for field in dir(Task):
        if field.startswith('io_storages_'):
            storages += [field]

    groups = defaultdict(list)
    tasks = list(queryset.values('data', 'id', 'total_annotations', 'cancelled_annotations', *storages))
    logger.info(f'Retrieved {len(tasks)} tasks from queryset')

    for task in list(tasks):
        replace_task_data_undefined_with_config_field(task['data'], project)
        task['data'] = json.dumps(task['data'])
        groups[task['data']].append(task)

    # make groups of duplicated ids for info print
    duplicates = {d: groups[d] for d in groups if len(groups[d]) > 1}
    info = {d: [task['id'] for task in duplicates[d]] for d in duplicates}

    logger.info(f'Found {len(duplicates)} duplicated tasks')
    logger.info(f'Duplicated tasks: {info}')
    return duplicates


actions = [
    {
        'entry_point': remove_duplicates,
        'permission': all_permissions.projects_change,
        'title': 'Remove Duplicated Tasks',
        'order': 95,
        'experimental': False,
        'dialog': {
            'text': (
                'Confirm that you want to remove duplicated tasks with the same data fields. '
                'Duplicated tasks will be deleted and all annotations will be moved to the first task from duplicated tasks. '
                'Also Source Storage Links will be restored if at least one duplicated task has a storage link. '
                "Warning: Task assignments (enterprise only) won't be saved."
            ),
            'type': 'confirm',
        },
    },
]

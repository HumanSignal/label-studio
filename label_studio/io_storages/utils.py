"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import io
import json
import logging
import re
from dataclasses import dataclass
from typing import Optional, Union

from core.feature_flags import flag_set
from core.utils.common import load_func
from django.conf import settings

logger = logging.getLogger(__name__)

# Put storage prefixes here
uri_regex = r"([\"'])(?P<uri>(?P<storage>{})://[^\1=]*)\1"


@dataclass
class BucketURI:
    bucket: str
    path: str
    scheme: str


def get_uri_via_regex(data, prefixes=('s3', 'gs')) -> tuple[Union[str, None], Union[str, None]]:
    data = str(data).strip()
    middle_check = False

    # make the fastest startswith check first
    for prefix in prefixes:
        if data.startswith(prefix):
            return data, prefix

        # another fast middle-check before regex run
        if prefix + ':' in data:
            middle_check = True

    # no prefixes in data, exit
    if middle_check is False:
        return None, None

    # make complex regex check for data like <a href="s3://test/123.jpg">
    try:
        uri_regex_prepared = uri_regex.format('|'.join(prefixes))
        r_match = re.search(uri_regex_prepared, data)
    except Exception as exc:
        logger.error(f"Can't parse task.data to match URI. Reason: {exc}", exc_info=True)
        return None, None
    else:
        if r_match is None:
            logger.warning("Can't parse task.data to match URI. Reason: Match is not found.")
            return None, None
    return r_match.group('uri'), r_match.group('storage')


def parse_bucket_uri(value: object, storage) -> Union[BucketURI, None]:
    if not value:
        return None

    uri, _ = get_uri_via_regex(value, prefixes=(storage.url_scheme,))
    if not uri:
        return None

    try:
        scheme, rest = uri.split('://', 1)
        bucket, path = rest.split('/', 1)
    except ValueError:
        return None

    return BucketURI(bucket=bucket, path=path, scheme=scheme)


def storage_can_resolve_bucket_url(storage, url) -> bool:
    if not storage.can_resolve_scheme(url):
        return False

    uri = parse_bucket_uri(url, storage)
    if not uri:
        return False

    storage_bucket: str | None = getattr(storage, 'bucket', None) or getattr(storage, 'container', None)
    if storage_bucket != uri.bucket:
        return False

    return True


def parse_range(range_header):
    """
    Parse HTTP Range header and extract start and end values.

    Args:
        range_header (str): Range header in format 'bytes=start-end'

    Returns:
        tuple: (start, end) where start is an integer and end is either an integer or empty string
    """
    start, end = 0, ''
    if not range_header:
        return None, None

    try:
        values = range_header.split('=')[1].split('-')
        start = int(values[0])
        if len(values) > 1:
            end = values[1]
            if end != '':
                end = int(end)
    except (IndexError, ValueError) as e:
        # Return default values if parsing fails
        logger.warning(f'Invalid range header: {range_header}: {e}')
        start = 0
        end = ''

    return start, end


@dataclass
class StorageObject:
    task_data: dict
    key: str
    row_index: int | None = None
    row_group: int | None = None

    @classmethod
    def bulk_create(
        cls, task_data: list[dict], key, row_indexes: list[int] | None = None, row_groups: list[int] | None = None
    ) -> list['StorageObject']:
        if row_indexes is None:
            row_indexes = [None] * len(task_data)
        if row_groups is None:
            row_groups = [None] * len(task_data)
        return [
            cls(key=key, row_index=row_idx, row_group=row_group, task_data=task_data)
            for row_idx, row_group, task_data in zip(row_indexes, row_groups, task_data)
        ]


def load_tasks_json_lso(blob: bytes, key: str) -> list[StorageObject]:
    """
    Parse blob containing task JSON(s) and return the validated result or raise an error.

    Args:
        blob (bytes): The blob string to parse.
        key (str): The key of the blob. Used for error messages.

    Returns:
        list[StorageObject]: link params for each task.
    """
    # Check feature flag to decide between generator and list
    if flag_set('fflag_fix_back_plt_870_import_from_storage_batch_28082025_short'):
        # Return generator version
        return _load_tasks_json_lso_generator(blob, key)
    else:
        # Return list version (current implementation)
        return _load_tasks_json_lso_list(blob, key)


def _load_tasks_json_lso_list(blob: bytes, key: str) -> list[StorageObject]:
    """
    Current implementation - returns list of StorageObjects.
    """

    def _error_wrapper(exc: Optional[Exception] = None):
        raise ValueError(
            (
                f"Can't import JSON-formatted tasks from {key}. If you're trying to import binary objects, "
                f'perhaps you forgot to enable "Tasks" import method?'
            )
        ) from exc

    try:
        value = json.loads(blob)
    except json.decoder.JSONDecodeError as e:
        if flag_set('fflag_feat_root_11_support_jsonl_cloud_storage'):
            try:
                value = []
                with io.BytesIO(blob) as f:
                    for line in f:
                        value.append(json.loads(line))
                return StorageObject.bulk_create(value, key, range(len(value)))
            except Exception as e:
                _error_wrapper(e)
        else:
            _error_wrapper(e)

    if isinstance(value, dict):
        return [StorageObject(key=key, task_data=value)]
    if isinstance(value, list):
        return StorageObject.bulk_create(value, key, range(len(value)))

    _error_wrapper()


def _load_tasks_json_lso_generator(blob: bytes, key: str):
    """
    Generator version - yields StorageObjects one by one to save memory.
    """

    def _error_wrapper(exc: Optional[Exception] = None):
        raise ValueError(
            (
                f"Can't import JSON-formatted tasks from {key}. If you're trying to import binary objects, "
                f'perhaps you forgot to enable "Tasks" import method?'
            )
        ) from exc

    try:
        value = json.loads(blob)
    except json.decoder.JSONDecodeError as e:
        if flag_set('fflag_feat_root_11_support_jsonl_cloud_storage'):
            try:
                # For JSONL: yield one object per line as we parse
                row_index = 0
                with io.BytesIO(blob) as f:
                    for line in f:
                        task_data = json.loads(line)
                        yield StorageObject(key=key, task_data=task_data, row_index=row_index)
                        row_index += 1
                return
            except Exception as e:
                _error_wrapper(e)
        else:
            _error_wrapper(e)

    if isinstance(value, dict):
        # Single dict - yield one object
        yield StorageObject(key=key, task_data=value)
    elif isinstance(value, list):
        # JSON array - yield one object at a time
        for row_index, task_data in enumerate(value):
            yield StorageObject(key=key, task_data=task_data, row_index=row_index)
    else:
        _error_wrapper()


def load_tasks_json(blob: str, key: str) -> list[StorageObject]:
    # uses load_tasks_json_lso here and an LSE-specific implementation in LSE
    load_tasks_json_func = load_func(settings.STORAGE_LOAD_TASKS_JSON)
    return load_tasks_json_func(blob, key)

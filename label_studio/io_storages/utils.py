"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import io
import json
import logging
import re
from dataclasses import dataclass
from typing import Iterator, Optional, Union

import ijson
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
        cls, task_datas: list[dict], key, row_indexes: list[int] | None = None, row_groups: list[int] | None = None
    ) -> list['StorageObject']:
        if row_indexes is None:
            row_indexes = [None] * len(task_datas)
        if row_groups is None:
            row_groups = [None] * len(task_datas)
        return [
            cls(key=key, row_index=row_idx, row_group=row_group, task_data=task_data)
            for row_idx, row_group, task_data in zip(row_indexes, row_groups, task_datas)
        ]


def load_tasks_json_lso(blob: bytes, key: str) -> Iterator[StorageObject]:
    """
    Parse blob containing task JSON(s) using memory-efficient streaming and yield StorageObjects.

    This function uses ijson for streaming JSON array parsing to avoid loading the entire
    file into memory at once, which is critical for large files (>100k rows, >200MB).

    Supported formats:
        - Single JSON object: {"data": {...}}
        - JSON array: [{"data": {...}}, {"data": {...}}, ...]
        - JSONL (newline-delimited JSON): {"data": {...}}\n{"data": {...}}\n...

    Args:
        blob (bytes): The blob bytes to parse.
        key (str): The key of the blob. Used for error messages.

    Yields:
        StorageObject: link params for each task.
    """

    def _error_wrapper(exc: Optional[Exception] = None):
        raise ValueError(
            (
                f"Can't import JSON-formatted tasks from {key}. If you're trying to import binary objects, "
                f'perhaps you forgot to enable "Tasks" import method?'
            )
        ) from exc

    # Peek at the first non-whitespace character to determine format
    first_char = None
    for byte in blob:
        char = chr(byte)
        if not char.isspace():
            first_char = char
            break

    if first_char is None:
        _error_wrapper(ValueError('Empty or whitespace-only content'))

    if first_char == '[':
        # JSON array - use ijson for memory-efficient streaming
        try:
            row_index = 0
            with io.BytesIO(blob) as f:
                # ijson.items parses the array incrementally, yielding one item at a time
                # use_float=True ensures numbers are parsed as float (not Decimal), which is JSON-serializable
                for task_data in ijson.items(f, 'item', use_float=True):
                    yield StorageObject(key=key, task_data=task_data, row_index=row_index)
                    row_index += 1
            # Check if we got any items - if not, it's an empty array which is valid
            return
        except ijson.JSONError as e:
            _error_wrapper(e)
        except Exception as e:
            _error_wrapper(e)

    elif first_char == '{':
        # Could be single JSON object or JSONL
        try:
            value = json.loads(blob)
            # Successfully parsed as single JSON object
            yield StorageObject(key=key, task_data=value)
            return
        except json.decoder.JSONDecodeError:
            # Failed to parse as single object, try JSONL
            pass

        # Try JSONL format (newline-delimited JSON)
        try:
            row_index = 0
            with io.BytesIO(blob) as f:
                for line in f:
                    line = line.strip()
                    if line:  # Skip empty lines
                        task_data = json.loads(line)
                        yield StorageObject(key=key, task_data=task_data, row_index=row_index)
                        row_index += 1
            return
        except Exception as e:
            _error_wrapper(e)

    else:
        _error_wrapper(ValueError(f'Unexpected character at start of JSON: {first_char}'))


def load_tasks_json(blob: bytes, key: str) -> Iterator[StorageObject]:
    """
    Load tasks from a JSON/JSONL blob using the configured loader.

    Uses load_tasks_json_lso in open-source and an LSE-specific implementation in enterprise.

    Args:
        blob (bytes): The blob bytes to parse.
        key (str): The key of the blob. Used for error messages.

    Yields:
        StorageObject: link params for each task.
    """
    load_tasks_json_func = load_func(settings.STORAGE_LOAD_TASKS_JSON)
    return load_tasks_json_func(blob, key)

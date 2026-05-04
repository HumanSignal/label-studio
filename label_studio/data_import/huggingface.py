import logging
from typing import Any, Dict, Iterable, List, Optional, Tuple

import requests
from django.conf import settings
from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)

DATASET_VIEWER_BASE_URL = 'https://datasets-server.huggingface.co'
ROWS_ENDPOINT = f'{DATASET_VIEWER_BASE_URL}/rows'
ROWS_PAGE_SIZE = 100
DEFAULT_IMPORT_LIMIT = 100
MAX_IMPORT_LIMIT = 1000
REQUEST_TIMEOUT = 30


def _clean_dataset_name(dataset: str) -> str:
    dataset = (dataset or '').strip()
    if not dataset:
        raise ValidationError({'dataset': ['This field is required.']})
    if dataset.startswith('http://') or dataset.startswith('https://'):
        raise ValidationError({'dataset': ['Use the Hugging Face dataset id, for example "namespace/repo".']})
    if '..' in dataset or dataset.startswith('/') or dataset.endswith('/'):
        raise ValidationError({'dataset': ['Invalid Hugging Face dataset id.']})
    return dataset


def _coerce_non_negative_int(value: Any, field: str, default: int) -> int:
    if value in (None, ''):
        return default
    try:
        value = int(value)
    except (TypeError, ValueError):
        raise ValidationError({field: ['Must be an integer.']})
    if value < 0:
        raise ValidationError({field: ['Must be greater than or equal to 0.']})
    return value


def _coerce_positive_int(value: Any, field: str, default: int, maximum: int) -> int:
    value = _coerce_non_negative_int(value, field, default)
    if value <= 0:
        raise ValidationError({field: ['Must be greater than 0.']})
    if value > maximum:
        raise ValidationError({field: [f'Must be less than or equal to {maximum}.']})
    return value


def _normalise_hf_cell(value: Any) -> Any:
    """Convert Dataset Viewer media cells into values Label Studio tags can use."""
    if isinstance(value, dict) and value.get('src'):
        return value['src']
    return value


def _normalise_hf_row(row: Dict[str, Any]) -> Dict[str, Any]:
    return {key: _normalise_hf_cell(value) for key, value in row.items()}


def _extract_data_columns(rows: Iterable[Dict[str, Any]]) -> List[str]:
    columns = []
    seen = set()
    for task in rows:
        for column in task.get('data', {}).keys():
            if column not in seen:
                columns.append(column)
                seen.add(column)
    return columns


def _raise_for_huggingface_error(response: requests.Response):
    try:
        response.raise_for_status()
    except requests.RequestException as exc:
        message = f'Hugging Face request failed with status {response.status_code}'
        try:
            payload = response.json()
        except ValueError:
            payload = None
        if isinstance(payload, dict) and payload.get('error'):
            message = f'{message}: {payload["error"]}'
        elif response.text:
            message = f'{message}: {response.text[:300]}'
        raise ValidationError(message) from exc


def fetch_huggingface_rows(
    *,
    dataset: str,
    config: str,
    split: str,
    token: Optional[str] = None,
    offset: int = 0,
    limit: int = DEFAULT_IMPORT_LIMIT,
) -> Tuple[List[Dict[str, Any]], int, bool]:
    dataset = _clean_dataset_name(dataset)
    config = (config or 'default').strip()
    split = (split or 'train').strip()
    offset = _coerce_non_negative_int(offset, 'offset', 0)
    limit = _coerce_positive_int(limit, 'limit', DEFAULT_IMPORT_LIMIT, MAX_IMPORT_LIMIT)

    headers = {'Accept': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token.strip()}'

    tasks = []
    total_rows = None
    partial = False
    next_offset = offset

    while len(tasks) < limit:
        page_length = min(ROWS_PAGE_SIZE, limit - len(tasks))
        params = {
            'dataset': dataset,
            'config': config,
            'split': split,
            'offset': next_offset,
            'length': page_length,
        }

        try:
            response = requests.get(ROWS_ENDPOINT, params=params, headers=headers, timeout=REQUEST_TIMEOUT)
        except requests.RequestException as exc:
            raise ValidationError(f'Could not connect to Hugging Face Dataset Viewer: {exc}') from exc

        _raise_for_huggingface_error(response)
        payload = response.json()
        rows = payload.get('rows') or []
        total_rows = payload.get('num_rows_total', total_rows)
        partial = bool(payload.get('partial', partial))

        if not rows:
            break

        for item in rows:
            row_data = item.get('row') or {}
            row_idx = item.get('row_idx')
            tasks.append(
                {
                    'data': _normalise_hf_row(row_data),
                    'meta': {
                        'huggingface': {
                            'dataset': dataset,
                            'config': config,
                            'split': split,
                            'row_idx': row_idx,
                        }
                    },
                    'import_source': 'huggingface',
                    'import_tags': [f'hf:{dataset}', f'hf:{config}:{split}'],
                }
            )

        next_offset += len(rows)
        if len(rows) < page_length:
            break

    if len(tasks) > settings.TASKS_MAX_NUMBER:
        raise ValidationError(
            f'Maximum task number is {settings.TASKS_MAX_NUMBER}, current task number is {len(tasks)}'
        )

    return tasks, total_rows or len(tasks), partial


def build_huggingface_import_response(tasks, duration, total_rows=None, partial=False, created_tasks=None, serializer=None):
    response = {
        'task_count': len(created_tasks) if created_tasks is not None else len(tasks),
        'annotation_count': len(serializer.db_annotations) if serializer is not None else None,
        'prediction_count': len(serializer.db_predictions) if serializer is not None else None,
        'duration': duration,
        'file_upload_ids': [],
        'could_be_tasks_list': False,
        'found_formats': ['HUGGINGFACE'],
        'data_columns': _extract_data_columns(tasks),
        'huggingface': {
            'total_rows': total_rows,
            'partial': partial,
        },
    }
    if created_tasks is not None:
        response['task_ids'] = [task.id for task in created_tasks]
    return response

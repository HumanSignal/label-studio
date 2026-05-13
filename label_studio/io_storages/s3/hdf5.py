"""HDF5-to-image extraction helpers for S3 imports."""

import hashlib
import logging
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
from django.conf import settings
from io_storages.utils import StorageObject
from PIL import Image

logger = logging.getLogger(__name__)

HDF5_SUFFIXES = ('.h5', '.hdf5')


@dataclass(frozen=True)
class HDF5ImageRef:
    dataset_path: str
    frame_index: int | None
    shape: tuple[int, ...]
    dtype: str


def is_hdf5_key(key: str) -> bool:
    return key.lower().endswith(HDF5_SUFFIXES)


def extract_hdf5_images_from_s3(storage, key: str) -> list[StorageObject]:
    try:
        import h5py
    except ImportError as exc:
        raise RuntimeError('HDF5 S3 imports require the h5py package. Rebuild the Biowork image.') from exc

    client = storage.get_client()
    head = client.head_object(Bucket=storage.bucket, Key=key)
    etag = str(head.get('ETag') or '').strip('"')
    cache_path = _download_to_cache(client, storage.bucket, key, etag)

    derived_prefix = _derived_prefix()
    max_frames_per_dataset = _positive_int_env('HDF5_IMPORT_MAX_FRAMES_PER_DATASET', 100)
    max_tasks_per_file = _positive_int_env('HDF5_IMPORT_MAX_TASKS_PER_FILE', 500)

    task_objects: list[StorageObject] = []
    with h5py.File(cache_path, 'r') as h5_file:
        for image_ref, image_array in _iter_image_arrays(h5_file, max_frames_per_dataset):
            derived_key = _derived_key(derived_prefix, key, etag, image_ref)
            _upload_png_if_missing(client, storage.bucket, derived_key, image_array)

            task_objects.append(
                StorageObject(
                    key=key,
                    task_data={
                        'image': f's3://{storage.bucket}/{derived_key}',
                        'h5_uri': f's3://{storage.bucket}/{key}',
                        'h5_dataset': image_ref.dataset_path,
                        'h5_frame_index': image_ref.frame_index,
                        'h5_shape': list(image_ref.shape),
                        'h5_dtype': image_ref.dtype,
                    },
                    row_index=len(task_objects),
                )
            )

            if len(task_objects) >= max_tasks_per_file:
                logger.warning(
                    'Stopped HDF5 extraction for s3://%s/%s at %s tasks due to HDF5_IMPORT_MAX_TASKS_PER_FILE',
                    storage.bucket,
                    key,
                    max_tasks_per_file,
                )
                break

    if not task_objects:
        raise ValueError(f'No image-like datasets found in HDF5 object s3://{storage.bucket}/{key}')

    return task_objects


def _download_to_cache(client, bucket: str, key: str, etag: str) -> Path:
    cache_dir = Path(os.getenv('HDF5_IMPORT_CACHE_DIR') or settings.BASE_DATA_DIR) / 'h5-cache'
    cache_dir.mkdir(parents=True, exist_ok=True)

    cache_id = hashlib.sha256(f'{bucket}/{key}:{etag}'.encode()).hexdigest()[:24]
    suffix = Path(key).suffix or '.h5'
    cache_path = cache_dir / f'{cache_id}{suffix}'
    incomplete_path = cache_path.with_suffix(cache_path.suffix + '.part')

    if cache_path.exists():
        return cache_path

    with tempfile.NamedTemporaryFile(dir=cache_dir, prefix=cache_path.name, suffix='.part', delete=False) as tmp:
        incomplete_path = Path(tmp.name)

    try:
        client.download_file(bucket, key, str(incomplete_path))
        incomplete_path.replace(cache_path)
    except Exception:
        incomplete_path.unlink(missing_ok=True)
        raise

    return cache_path


def _iter_image_arrays(h5_file, max_frames_per_dataset: int) -> Iterable[tuple[HDF5ImageRef, np.ndarray]]:
    datasets = []

    def collect_dataset(name, node):
        if hasattr(node, 'shape') and hasattr(node, 'dtype'):
            datasets.append((name, node))

    h5_file.visititems(collect_dataset)

    for name, dataset in datasets:
        shape = tuple(int(dim) for dim in dataset.shape or ())
        dtype = str(dataset.dtype)

        if not _is_numeric_dataset(dataset, shape):
            continue

        dataset_path = '/' + name.strip('/')

        if len(shape) == 2:
            yield HDF5ImageRef(dataset_path, None, shape, dtype), np.asarray(dataset[...])
        elif len(shape) == 3 and shape[-1] in (1, 3, 4):
            yield HDF5ImageRef(dataset_path, None, shape, dtype), np.asarray(dataset[...])
        elif len(shape) == 3:
            frame_count = min(shape[0], max_frames_per_dataset)
            for frame_index in range(frame_count):
                yield HDF5ImageRef(dataset_path, frame_index, shape, dtype), np.asarray(dataset[frame_index, ...])
        elif len(shape) == 4 and shape[-1] in (1, 3, 4):
            frame_count = min(shape[0], max_frames_per_dataset)
            for frame_index in range(frame_count):
                yield HDF5ImageRef(dataset_path, frame_index, shape, dtype), np.asarray(dataset[frame_index, ...])
        elif len(shape) == 4 and shape[1] in (1, 3, 4):
            frame_count = min(shape[0], max_frames_per_dataset)
            for frame_index in range(frame_count):
                frame = np.moveaxis(np.asarray(dataset[frame_index, ...]), 0, -1)
                yield HDF5ImageRef(dataset_path, frame_index, shape, dtype), frame


def _is_numeric_dataset(dataset, shape: tuple[int, ...]) -> bool:
    if len(shape) < 2 or len(shape) > 4 or any(dim <= 0 for dim in shape):
        return False
    if not _has_image_sized_plane(shape):
        return False
    return np.issubdtype(dataset.dtype, np.number) or np.issubdtype(dataset.dtype, np.bool_)


def _has_image_sized_plane(shape: tuple[int, ...]) -> bool:
    if len(shape) == 2:
        return min(shape) >= 8
    if len(shape) == 3 and shape[-1] in (1, 3, 4):
        return min(shape[0], shape[1]) >= 8
    if len(shape) == 3:
        return min(shape[1], shape[2]) >= 8
    if len(shape) == 4 and shape[-1] in (1, 3, 4):
        return min(shape[1], shape[2]) >= 8
    if len(shape) == 4 and shape[1] in (1, 3, 4):
        return min(shape[2], shape[3]) >= 8
    return False


def _upload_png_if_missing(client, bucket: str, key: str, image_array: np.ndarray) -> None:
    try:
        client.head_object(Bucket=bucket, Key=key)
        return
    except Exception:
        pass

    image = Image.fromarray(_to_uint8_image(image_array))
    with tempfile.SpooledTemporaryFile(max_size=16 * 1024 * 1024) as tmp:
        image.save(tmp, format='PNG')
        tmp.seek(0)
        client.put_object(Bucket=bucket, Key=key, Body=tmp.read(), ContentType='image/png')


def _to_uint8_image(array: np.ndarray) -> np.ndarray:
    array = np.asarray(array)
    array = np.squeeze(array)

    if array.ndim == 3 and array.shape[0] in (1, 3, 4) and array.shape[-1] not in (1, 3, 4):
        array = np.moveaxis(array, 0, -1)

    if array.ndim == 3 and array.shape[-1] == 1:
        array = array[..., 0]

    if array.dtype == np.uint8:
        return array

    if np.issubdtype(array.dtype, np.bool_):
        return array.astype(np.uint8) * 255

    finite = array[np.isfinite(array)]
    if finite.size == 0:
        return np.zeros(array.shape, dtype=np.uint8)

    low, high = np.percentile(finite, [1, 99])
    if high <= low:
        low = float(np.min(finite))
        high = float(np.max(finite))

    if high <= low:
        return np.zeros(array.shape, dtype=np.uint8)

    scaled = (array.astype(np.float32) - low) * (255.0 / (high - low))
    return np.nan_to_num(np.clip(scaled, 0, 255)).astype(np.uint8)


def _derived_prefix() -> str:
    return (os.getenv('HDF5_IMPORT_DERIVED_PREFIX') or 'derived/h5-preview').strip('/')


def _derived_key(prefix: str, h5_key: str, etag: str, image_ref: HDF5ImageRef) -> str:
    digest = hashlib.sha256(
        f'{h5_key}:{etag}:{image_ref.dataset_path}:{image_ref.frame_index}'.encode()
    ).hexdigest()[:20]
    frame_suffix = '' if image_ref.frame_index is None else f'-frame-{image_ref.frame_index:06d}'
    name = Path(h5_key).stem
    safe_name = ''.join(ch if ch.isalnum() or ch in ('-', '_') else '-' for ch in name)[:80]
    return f'{prefix}/{safe_name}/{digest}{frame_suffix}.png'


def _positive_int_env(name: str, default: int) -> int:
    try:
        value = int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default
    return max(1, value)

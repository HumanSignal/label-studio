"""Exporter that creates a ZIP with one CSV per image, with one row per segmentation annotation.

Computes bounding box (pixels), area (pixels), and mean intensities (gray and RGB) for
both Brush (RLE mask) and Polygon regions.
"""

import csv
import io
import json
import logging
import os
import re
import shutil
import base64
from urllib.parse import urljoin
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Tuple

import numpy as np
import requests
from django.conf import settings
from PIL import Image, ImageDraw

logger = logging.getLogger(__name__)


@dataclass
class ImageSource:
    url: str
    path: Optional[str]  # local path if resolvable
    filename: str  # best-effort filename for reporting


CSV_COLUMNS = [
    "image_filename",
    "task_id",
    "annotation_id",
    "region_id",
    "label",
    "shape_type",
    "bbox_x_px",
    "bbox_y_px",
    "x_length_px",
    "y_length_px",
    "area_px",
    "mean_gray",
    "mean_r",
    "mean_g",
    "mean_b",
    "polygon_points_px",
]


def _decode_brush_rle_to_mask(rle: List[int], width: int, height: int) -> np.ndarray:
    """Decode Label Studio brush RLE to a boolean mask of shape (height, width).

    RLE is a list of run-lengths alternating 0s and 1s, starting with 0s.
    Example: [0, 1, 1, 2, 3] -> 0, 1, 0,0, 1,1, 0,0,0
    """
    total = width * height
    flat = np.zeros(total, dtype=np.uint8)
    value = 0  # start from zeros
    idx = 0
    for count in rle:
        if count <= 0:
            value = 1 - value
            continue
        end = min(idx + count, total)
        if value == 1:
            flat[idx:end] = 1
        idx = end
        value = 1 - value
        if idx >= total:
            break
    if idx < total:
        # remaining assumed zeros (already 0)
        pass
    return flat.reshape((height, width)) > 0


def _polygon_points_percent_to_px(points: List[List[float]], width: int, height: int) -> List[Tuple[float, float]]:
    px_points: List[Tuple[float, float]] = []
    for x_perc, y_perc in points:
        x = (x_perc / 100.0) * float(width)
        y = (y_perc / 100.0) * float(height)
        px_points.append((x, y))
    return px_points


def _rasterize_polygon(points_px: List[Tuple[float, float]], width: int, height: int) -> np.ndarray:
    if not points_px:
        return np.zeros((height, width), dtype=bool)
    img = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(img)
    # Cast to ints for robust rasterization
    draw.polygon([(int(round(x)), int(round(y))) for x, y in points_px], outline=1, fill=1)
    return np.array(img, dtype=np.uint8) > 0


def _compute_bbox_and_area(mask: np.ndarray) -> Tuple[int, int, int, int, int]:
    """Return bbox_x, bbox_y, width, height, area (all ints)."""
    ys, xs = np.where(mask)
    if xs.size == 0 or ys.size == 0:
        return 0, 0, 0, 0, 0
    x_min = int(xs.min())
    y_min = int(ys.min())
    x_max = int(xs.max())
    y_max = int(ys.max())
    w = int(max(0, x_max - x_min))
    h = int(max(0, y_max - y_min))
    area = int(mask.sum())
    return x_min, y_min, w, h, area


def _compute_intensities(image: Image.Image, mask: np.ndarray) -> Tuple[Optional[float], Optional[float], Optional[float], Optional[float]]:
    mask_bool = mask.astype(bool)
    if mask_bool.sum() == 0:
        return 0.0, 0.0, 0.0, 0.0

    mode = image.mode
    if mode in ("L", "I", "I;16", "F"):
        gray_np = np.array(image.convert("L"), dtype=np.float32)
        mean_gray = float(gray_np[mask_bool].mean()) if mask_bool.any() else 0.0
        return mean_gray, 0.0, 0.0, 0.0

    img_rgb = image.convert("RGB")
    r, g, b = img_rgb.split()
    r_np = np.array(r, dtype=np.float32)
    g_np = np.array(g, dtype=np.float32)
    b_np = np.array(b, dtype=np.float32)
    mean_r = float(r_np[mask_bool].mean()) if mask_bool.any() else 0.0
    mean_g = float(g_np[mask_bool].mean()) if mask_bool.any() else 0.0
    mean_b = float(b_np[mask_bool].mean()) if mask_bool.any() else 0.0
    # For RGB images we report gray as 0.0 per requirement
    return 0.0, mean_r, mean_g, mean_b


def _parse_textarea_means(texts: List[str]) -> Tuple[Optional[float], Optional[float], Optional[float], Optional[float]]:
    """Parse textarea text values for pre-computed intensities."""
    if not texts:
        return None, None, None, None
    raw = str(texts[0]).strip()
    try:
        val = float(raw)
        return val, None, None, None
    except Exception:
        pass

    gray = r = g = b = None
    try:
        matches = re.findall(r'(gray|grey|r|g|b)\s*[:=]\s*(-?\d+(?:\.\d+)?)', raw, flags=re.IGNORECASE)
        for key, val in matches:
            val_f = float(val)
            lk = key.lower()
            if lk in ("gray", "grey"):
                gray = val_f
            elif lk == "r":
                r = val_f
            elif lk == "g":
                g = val_f
            elif lk == "b":
                b = val_f
    except Exception:
        return None, None, None, None
    return gray, r, g, b


def _best_effort_filename_from_url(url: str) -> str:
    try:
        # strip query
        path = url.split("?")[0]
        base = os.path.basename(path)
        return base or "image"
    except Exception:
        return "image"


def _resolve_image_source(project, image_url: str, download_resources: bool, hostname: Optional[str]) -> ImageSource:
    # Local upload
    if image_url.startswith("upload://"):
        rel = image_url[len("upload://") :]
        local_path = os.path.join(settings.MEDIA_ROOT, settings.UPLOAD_DIR, rel)
        return ImageSource(url=image_url, path=local_path, filename=os.path.basename(local_path))

    # Absolute filesystem path
    if os.path.isabs(image_url) and os.path.exists(image_url):
        return ImageSource(url=f"file://{image_url}", path=image_url, filename=os.path.basename(image_url))

    # Presigned/translated storage URL if possible
    try:
        resolved = project.resolve_storage_uri(image_url)
    except Exception:
        resolved = None
    if resolved and isinstance(resolved, dict) and resolved.get("url"):
        return ImageSource(url=resolved["url"], path=None, filename=_best_effort_filename_from_url(resolved["url"]))

    # Data URI
    if image_url.startswith("data:"):
        return ImageSource(url=image_url, path=None, filename=_best_effort_filename_from_url("inline.png"))

    # file:// scheme
    if image_url.startswith("file://"):
        local_path = image_url[len("file://"):]
        return ImageSource(url=image_url, path=local_path, filename=os.path.basename(local_path))

    # Remote HTTP(S)
    if image_url.startswith("http://") or image_url.startswith("https://"):
        return ImageSource(url=image_url, path=None, filename=_best_effort_filename_from_url(image_url))

    # Relative path: build absolute using hostname if provided
    if hostname and image_url.startswith("/"):
        abs_url = urljoin(hostname if hostname.endswith('/') else hostname + '/', image_url.lstrip('/'))
        return ImageSource(url=abs_url, path=None, filename=_best_effort_filename_from_url(image_url))

    # Fallback unknown scheme
    return ImageSource(url=image_url, path=None, filename=_best_effort_filename_from_url(image_url))


def _open_image(project, source: ImageSource, download_resources: bool) -> Optional[Image.Image]:
    # Local path
    if source.path and os.path.exists(source.path):
        try:
            return Image.open(source.path)
        except Exception as exc:
            logger.debug(f"Failed to open local image {source.path}: {exc}")
            return None

    # Data URI
    if isinstance(source.url, str) and source.url.startswith("data:"):
        try:
            header, encoded = source.url.split(',', 1)
            if ';base64' in header:
                data = base64.b64decode(encoded)
            else:
                data = encoded.encode('utf-8')
            return Image.open(io.BytesIO(data))
        except Exception as exc:
            logger.debug(f"Failed to open data URI image: {exc}")
            return None

    # file:// absolute path
    if isinstance(source.url, str) and source.url.startswith("file://"):
        local_path = source.url[len("file://"):]
        try:
            return Image.open(local_path)
        except Exception as exc:
            logger.debug(f"Failed to open file URI {local_path}: {exc}")
            return None

    # Remote: only if allowed
    if not download_resources:
        return None

    headers = {}
    try:
        token = project.organization.created_by.auth_token.key
        if token:
            headers["Authorization"] = f"Token {token}"
    except Exception:
        pass

    try:
        resp = requests.get(source.url, headers=headers, timeout=30)
        resp.raise_for_status()
        return Image.open(io.BytesIO(resp.content))
    except Exception as exc:
        logger.debug(f"Failed to download image {source.url}: {exc}")
        return None


def _get_object_value_key_for_result(project, result_to_name: str) -> Optional[str]:
    """From parsed config find the object tag value key (e.g., "$image" -> "image") for the given to_name."""
    try:
        config = project.get_parsed_config()
    except Exception:
        config = {}
    for control_name, control in (config or {}).items():
        for obj in control.get("inputs", []) or []:
            if obj.get("type") == "Image" and obj.get("name") == result_to_name:
                val = obj.get("value") or ""
                if isinstance(val, str) and val.startswith("$"):
                    return val[1:]
                return val
    # Fallback: find any image object
    for control_name, control in (config or {}).items():
        for obj in control.get("inputs", []) or []:
            if obj.get("type") == "Image":
                val = obj.get("value") or ""
                return val[1:] if isinstance(val, str) and val.startswith("$") else val
    return None


def _first_label_from_result_value(value: Dict, key: str) -> str:
    labels = value.get(key) or []
    if isinstance(labels, list):
        return ";".join(str(x) for x in labels)
    return str(labels)


def export_segmentation_metrics(tasks: Iterable[Dict], project, download_resources: bool, hostname: Optional[str] = None):
    """Create a ZIP file with per-image CSVs and return (open_file, content_type, filename).

    The filename will be like project-{id}-segmentation.zip
    """
    # Prepare temp directory structure
    base_tmp_dir = os.path.join(settings.MEDIA_ROOT, settings.TMP_DIR if hasattr(settings, "TMP_DIR") else "tmp")
    os.makedirs(base_tmp_dir, exist_ok=True)

    # In-process temp directory
    from core.utils.io import get_temp_dir, path_to_open_binary_file

    with get_temp_dir() as tmp_dir:
        # Per-image rows accumulator
        rows_by_image: Dict[str, List[Dict]] = defaultdict(list)

        for task in tasks:
            task_id = task.get("id")
            data = task.get("data") or {}
            annotations = task.get("annotations") or []

            for ann in annotations:
                ann_id = ann.get("id")
                results = ann.get("result") or []
                # Pre-scan labels and textarea means by region id to merge shape+label cases and reuse intensities
                label_by_region: Dict[str, str] = {}
                textarea_by_region: Dict[str, Tuple[Optional[float], Optional[float], Optional[float], Optional[float]]] = {}
                for res in results:
                    value = res.get("value") or {}
                    region_id = res.get("id")
                    if region_id is None:
                        continue
                    lb = None
                    if value.get("brushlabels"):
                        lb = _first_label_from_result_value(value, "brushlabels")
                    elif value.get("polygonlabels"):
                        lb = _first_label_from_result_value(value, "polygonlabels")
                    if lb:
                        label_by_region[str(region_id)] = lb
                    # Reuse TextArea mean intensity if present
                    if res.get("type") == "textarea":
                        texts = value.get("text") or []
                        if isinstance(texts, list) and texts:
                            parsed = _parse_textarea_means(texts)
                            textarea_by_region[str(region_id)] = parsed

                processed_region_ids: set[str] = set()
                for res in results:
                    rtype = (res.get("type") or "").lower()
                    value = res.get("value") or {}

                    # Determine object/image URL but avoid fetching; rely on annotation dims
                    to_name = res.get("to_name") or ""
                    data_key = _get_object_value_key_for_result(project, to_name) or next(iter(data.keys()), None)
                    image_url = data.get(data_key) if data_key in data else next(iter(data.values()), None)
                    if not image_url:
                        logger.debug("Skip region without image url")
                        continue
                    source_filename = _best_effort_filename_from_url(str(image_url))

                    ow = res.get("original_width") or value.get("original_width")
                    oh = res.get("original_height") or value.get("original_height")
                    original_width = int(ow) if ow else 0
                    original_height = int(oh) if oh else 0
                    if not original_width or not original_height:
                        logger.debug("Skip region without original image size (no fallback available)")
                        continue

                    # Detect mask/polygon robustly
                    is_mask = (rtype == "brushlabels") or (value.get("format") == "rle" and isinstance(value.get("rle"), list))
                    is_polygon = (rtype == "polygonlabels") or (isinstance(value.get("points"), list) and value.get("points"))

                    region_id = res.get("id")
                    if region_id is None:
                        # Avoid duplicates but still handle anonymous regions uniquely per index
                        region_id = f"{rtype}-{id(res)}"
                    region_id_str = str(region_id)
                    if region_id_str in processed_region_ids:
                        continue

                    if is_mask:
                        rle = value.get("rle") or []
                        try:
                            mask = _decode_brush_rle_to_mask(list(rle), original_width, original_height)
                        except Exception as exc:
                            logger.debug(f"Failed to decode RLE: {exc}")
                            continue
                        shape_type = "mask"
                        label = _first_label_from_result_value(value, "brushlabels") or label_by_region.get(region_id_str, "")
                        poly_points_px: List[Tuple[float, float]] = []
                    elif is_polygon:
                        points = value.get("points") or []
                        poly_points_px = _polygon_points_percent_to_px(points, original_width, original_height)
                        mask = _rasterize_polygon(poly_points_px, original_width, original_height)
                        shape_type = "polygon"
                        label = _first_label_from_result_value(value, "polygonlabels") or label_by_region.get(region_id_str, "")
                    else:
                        continue

                    bbox_x, bbox_y, w, h, area = _compute_bbox_and_area(mask)

                    # Prefer existing TextArea mean intensity if available for this region
                    text_means = textarea_by_region.get(region_id_str)
                    mean_gray = mean_r = mean_g = mean_b = None
                    if text_means is not None:
                        mean_gray, mean_r, mean_g, mean_b = text_means

                    # Ensure all channels are populated; default missing values to 0.0
                    mean_gray = 0.0 if mean_gray is None else mean_gray
                    mean_r = 0.0 if mean_r is None else mean_r
                    mean_g = 0.0 if mean_g is None else mean_g
                    mean_b = 0.0 if mean_b is None else mean_b

                    row = {
                        "image_filename": source_filename,
                        "task_id": task_id,
                        "annotation_id": ann_id,
                        "region_id": region_id,
                        "label": label,
                        "shape_type": shape_type,
                        "bbox_x_px": bbox_x,
                        "bbox_y_px": bbox_y,
                        "x_length_px": w,
                        "y_length_px": h,
                        "area_px": area,
                        "mean_gray": mean_gray,
                        "mean_r": mean_r,
                        "mean_g": mean_g,
                        "mean_b": mean_b,
                        "polygon_points_px": json.dumps(poly_points_px) if poly_points_px else "",
                    }

                    # Group per image (include task id to avoid collisions)
                    key = f"{source_filename}__task_{task_id}"
                    rows_by_image[key].append(row)
                    processed_region_ids.add(region_id_str)

        # Write CSVs
        for key, rows in rows_by_image.items():
            # sanitize filename
            safe_name = key.replace("/", "_").replace("\\", "_")
            if not safe_name.lower().endswith(".csv"):
                safe_name = f"{safe_name}.csv"
            csv_path = os.path.join(tmp_dir, safe_name)
            os.makedirs(os.path.dirname(csv_path), exist_ok=True)
            with open(csv_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
                writer.writeheader()
                for r in rows:
                    writer.writerow(r)

        # If no rows produced, include a README to clarify
        produced_any = any(rows_by_image.values())
        if not produced_any:
            readme_path = os.path.join(tmp_dir, "README.txt")
            with open(readme_path, "w", encoding="utf-8") as rf:
                rf.write(
                    "No segmentation rows were generated. Ensure annotations include Brush (RLE) or Polygon regions, and that original image dimensions are present."
                )

        # Package to ZIP and return file handle
        archive_base = os.path.join(tmp_dir)
        shutil.make_archive(archive_base, "zip", tmp_dir)
        zip_path = archive_base + ".zip"
        from core.utils.io import path_to_open_binary_file

        out = path_to_open_binary_file(os.path.abspath(zip_path))
        filename = f"project-{project.id}-segmentation.csv.zip"
        return out, "application/zip", filename



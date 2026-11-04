import { useEffect, useMemo, useState } from "react";
import { cn } from "../../../utils/bem";
import { decodeBrushMask, getImageLabels, loadGridPreview, selectPreviewAnnotation } from "./annotation-overlay";

function renderRegion(region, color, width, height, fillOpacity) {
  const value = region.value;
  if (!value || region.image_rotation) throw new Error("Unsupported image rotation");
  const x = (n) => (n * width) / 100;
  const y = (n) => (n * height) / 100;
  const common = { stroke: color, fill: color, fillOpacity, strokeWidth: 2, vectorEffect: "non-scaling-stroke" };
  const label = Array.isArray(value[region.type]) ? value[region.type].join(", ") : "";
  const title = <title>{label}</title>;
  const rotate = value.rotation ? `rotate(${value.rotation} ${x(value.x)} ${y(value.y)})` : undefined;
  switch (region.type) {
    case "polygonlabels":
    case "polygon":
      return (
        <polygon {...common} points={value.points.map(([px, py]) => `${x(px)},${y(py)}`).join(" ")}>
          {title}
        </polygon>
      );
    case "rectanglelabels":
    case "rectangle":
      return (
        <rect
          {...common}
          x={x(value.x)}
          y={y(value.y)}
          width={x(value.width)}
          height={y(value.height)}
          transform={rotate}
        >
          {title}
        </rect>
      );
    case "ellipselabels":
    case "ellipse":
      return (
        <ellipse
          {...common}
          cx={x(value.x)}
          cy={y(value.y)}
          rx={x(value.radiusX)}
          ry={y(value.radiusY)}
          transform={rotate}
        >
          {title}
        </ellipse>
      );
    case "keypointlabels":
    case "keypoint":
      return (
        <circle {...common} cx={x(value.x)} cy={y(value.y)} r={x(value.width ?? 1)} fillOpacity={0.8}>
          {title}
        </circle>
      );
    case "brushlabels":
    case "brush": {
      const canvas = document.createElement("canvas");
      canvas.width = region.original_width;
      canvas.height = region.original_height;
      const pixels = decodeBrushMask(value.rle, canvas.width, canvas.height, color);
      const context = canvas.getContext("2d");
      const image = context.createImageData(canvas.width, canvas.height);
      image.data.set(pixels);
      context.putImageData(image, 0, 0);
      return (
        <image href={canvas.toDataURL()} width={width} height={height} opacity={0.45}>
          {title}
        </image>
      );
    }
    // Non-spatial controls have no overlay to draw.
    case "choices":
    case "textarea":
    case "rating":
    case "number":
      return null;
    default:
      throw new Error("Unsupported region type");
  }
}

export function AnnotatedImage({ task, image, field, config, enabled, loadTask, revision, fitImagesToWidth = false }) {
  const [state, setState] = useState(null);
  const [naturalSize, setNaturalSize] = useState(null);
  const labels = useMemo(() => getImageLabels(config, field), [config, field]);
  const taskId = task.id;
  const count = task.total_annotations;

  useEffect(() => {
    let current = true;
    setState(null);
    if (!enabled || count === 0)
      return () => {
        current = false;
      };
    loadGridPreview(
      () => loadTask("task", { taskID: taskId, annotations_stub: false, annotations_ordering: "-id" }),
      () => current,
    )
      .then((data) => {
        if (!current) return;
        if (!Array.isArray(data?.annotations)) throw new Error("Missing annotations");
        setState({
          taskId,
          annotation: selectPreviewAnnotation(data.annotations),
          count: data.annotations.filter((a) => !a.was_cancelled).length,
        });
      })
      .catch(() => {
        if (current) setState({ taskId, error: true });
      });
    return () => {
      current = false;
    };
  }, [enabled, taskId, count, loadTask, revision, config, image]);

  const current = state?.taskId === taskId ? state : null;
  const annotation = enabled ? current?.annotation : null;
  const regions = annotation?.result;
  const dimensions = regions?.find(
    (r) => labels.imageNames.includes(r.to_name) && r.original_width && r.original_height,
  );
  const width = naturalSize && naturalSize.image === image ? naturalSize.width : (dimensions?.original_width ?? 100);
  const height = naturalSize && naturalSize.image === image ? naturalSize.height : (dimensions?.original_height ?? 100);
  const overlay = useMemo(() => {
    let incomplete = false;
    const nodes = [];
    for (const region of regions ?? []) {
      if (!labels.imageNames.includes(region.to_name)) continue;
      const label = region.value?.[region.type]?.[0];
      const color = labels.colors[`${region.from_name}:${label}`] ?? "#ff7800";
      try {
        nodes.push(
          <g key={`${region.id}-${region.type}`}>
            {renderRegion(region, color, width, height, labels.fillOpacities[region.from_name] ?? 0.2)}
          </g>,
        );
      } catch {
        incomplete = true;
      }
    }
    return { nodes, incomplete };
  }, [regions, labels, width, height]);

  let status;
  if (enabled) {
    if (current?.error) status = "Preview unavailable · open task";
    else if (count === 0 || (current && !annotation)) status = "No submitted annotations";
    else if (!current) status = "Loading annotations…";
    else if (!labels.imageNames.length || overlay.incomplete) status = "Partial preview · open task";
    else status = `Annotation #${annotation.id}${current.count > 1 ? ` · latest of ${current.count}` : ""}`;
  }

  return (
    <div className={cn("grid-annotated-image").toClassName()}>
      <img
        src={image}
        alt={`Task ${taskId}`}
        loading="lazy"
        style={{ objectFit: fitImagesToWidth ? "cover" : "contain" }}
        onLoad={(e) =>
          setNaturalSize({ image, width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })
        }
      />
      {annotation && (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio={fitImagesToWidth ? "xMidYMid slice" : "xMidYMid meet"}
          aria-label={`Annotation ${annotation.id}`}
          role="img"
        >
          {overlay.nodes}
        </svg>
      )}
      {status && <span className={cn("grid-annotated-image").elem("status").toClassName()}>{status}</span>}
    </div>
  );
}

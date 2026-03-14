import { getRoot } from "mobx-state-tree";
import { AnnotationPreview } from "../Common/AnnotationPreview/AnnotationPreview";
import { cn } from "../../utils/bem";

export const IMAGE_SIZE_COEFFICIENT = 8;

const defaultRoot = { showPreviews: false, SDK: {} };
function getRootSafe(node) {
  try {
    return getRoot(node);
  } catch {
    return defaultRoot;
  }
}

export const ImageDataGroup = (column) => {
  const {
    value,
    original,
    field: { alias },
    columnCount,
  } = column;
  const root = getRootSafe(original);
  const imageHeight = ImageDataGroup.height * Math.max(1, IMAGE_SIZE_COEFFICIENT - columnCount);

  return original.total_annotations === 0 || !root.showPreviews ? (
    <div className={cn("grid-image-wrapper").toClassName()}>
      <img src={value} width="auto" style={{ height: imageHeight }} alt="" loading="lazy" />
    </div>
  ) : (
    <AnnotationPreview
      task={original}
      annotation={original.annotations[0]}
      config={root.SDK}
      name={alias}
      width="100%"
      size="large"
      fallbackImage={value}
      height={ImageDataGroup.height}
    />
  );
};

ImageDataGroup.height = 150;

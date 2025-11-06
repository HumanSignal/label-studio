import { getRoot } from "mobx-state-tree";
import { AnnotationPreview } from "../Common/AnnotationPreview/AnnotationPreview";
import { cn } from "../../utils/bem";

export const IMAGE_SIZE_COEFFICIENT = 8;

export const ImageDataGroup = (column) => {
  const {
    value,
    original,
    field: { alias },
    columnCount,
  } = column;
  const root = getRoot(original);
  const imageHeight = ImageDataGroup.height * Math.max(1, IMAGE_SIZE_COEFFICIENT - columnCount);

  return original.total_annotations === 0 || !root.showPreviews ? (
    <div className={cn("grid-image-wrapper").toClassName()}>
      <img src={value} width="auto" style={{ height: imageHeight }} alt="" />
    </div>
  ) : (
    <AnnotationPreview
      task={original}
      annotation={original.annotations[0]}
      config={getRoot(original).SDK}
      name={alias}
      width="100%"
      size="large"
      fallbackImage={value}
      height={ImageDataGroup.height}
    />
  );
};

ImageDataGroup.height = 150;

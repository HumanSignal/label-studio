import { getRoot } from "mobx-state-tree";
import { AnnotationPreview } from "../Common/AnnotationPreview/AnnotationPreview";

export const ImageDataGroup = (column) => {
  const {
    value,
    original,
    field: { alias },
  } = column;
  const root = getRoot(original);

  return original.total_annotations === 0 || !root.showPreviews ? (
    <div>
      <img
        src={value}
        width="100%"
        height={ImageDataGroup.height}
        alt=""
      />
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

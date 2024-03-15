import { getRoot } from "mobx-state-tree";
import { FF_LSDV_4711, isFF } from "../../utils/feature-flags";
import { AnnotationPreview } from "../Common/AnnotationPreview/AnnotationPreview";

const imgDefaultProps = {};

if (isFF(FF_LSDV_4711)) imgDefaultProps.crossOrigin = "anonymous";

export const ImageCell = (column) => {
  const {
    original,
    value,
    column: { alias },
  } = column;
  const root = getRoot(original);

  const renderImagePreview = original.total_annotations === 0 || !root.showPreviews;
  const imgSrc = Array.isArray(value) ? value[0] : value;

  if (!imgSrc) return null;

  return renderImagePreview ? (
    <img
      {...imgDefaultProps}
      key={imgSrc}
      src={imgSrc}
      alt="Data"
      style={{
        maxHeight: "100%",
        maxWidth: "100px",
        objectFit: "contain",
        borderRadius: 3,
      }}
    />
  ) : (
    <AnnotationPreview
      task={original}
      annotation={original.annotations[0]}
      config={getRoot(original).SDK}
      name={alias}
      variant="120x120"
      fallbackImage={value}
      style={{
        maxHeight: "100%",
        maxWidth: "100px",
        objectFit: "contain",
        borderRadius: 3,
      }}
    />
  );
};

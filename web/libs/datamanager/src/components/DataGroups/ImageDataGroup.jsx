import { observer } from "mobx-react";
import { AnnotatedImage } from "../MainView/GridView/AnnotatedImage";
import { getRoot } from "mobx-state-tree";
import { AnnotationPreview } from "../Common/AnnotationPreview/AnnotationPreview";
import { cn } from "../../utils/bem";

export const IMAGE_SIZE_COEFFICIENT = 8;

export const ImageDataGroup = observer((column) => {
  const {
    value,
    original,
    field: { alias },
    columnCount,
  } = column;
  const root = getRoot(original);
  const imageHeight = ImageDataGroup.height * Math.max(1, IMAGE_SIZE_COEFFICIENT - columnCount);

  if (root.SDK.type !== "DE") {
    return (
      <AnnotatedImage
        task={original}
        image={value}
        field={alias}
        config={root.labelingConfig}
        enabled={root.gridShowAnnotations && !root.isLabeling}
        loadTask={root.apiCall}
        revision={original.updated_at}
        fitImagesToWidth={root.currentView?.gridFitImagesToWidth}
      />
    );
  }

  return original.total_annotations === 0 || !root.showPreviews ? (
    <div className={cn("grid-image-wrapper").toClassName()}>
      <img src={value} width="auto" style={{ height: imageHeight }} alt="" loading="lazy" />
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
});

ImageDataGroup.height = 150;

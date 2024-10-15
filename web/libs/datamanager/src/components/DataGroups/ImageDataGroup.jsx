import { getRoot } from "mobx-state-tree";
import { AnnotationPreview } from "../Common/AnnotationPreview/AnnotationPreview";
import { Block } from "../../utils/bem";

export const ImageDataGroup = (column) => {
  const {
    value,
    original,
    field: { alias },
  } = column;
  const root = getRoot(original);

  return original.total_annotations === 0 || !root.showPreviews ? (
    <Block name="grid-image-wrapper">
      <img src={value} width="auto" height={ImageDataGroup.height} alt="" />
    </Block>
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

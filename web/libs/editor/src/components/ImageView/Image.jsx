import { observer } from "mobx-react";
import { forwardRef, useCallback, useMemo } from "react";
import { cn } from "../../utils/bem";
import messages from "../../utils/messages";
import { ErrorMessage } from "../ErrorMessage/ErrorMessage";
import "./Image.scss";

/**
 * Coordinates in relative mode belong to a data domain consisting of percentages in the range from 0 to 100
 */
export const RELATIVE_STAGE_WIDTH = 100;

/**
 * Coordinates in relative mode belong to a data domain consisting of percentages in the range from 0 to 100
 */
export const RELATIVE_STAGE_HEIGHT = 100;

/**
 * Mode of snapping to pixel
 */
export const SNAP_TO_PIXEL_MODE = {
  EDGE: "edge",
  CENTER: "center",
};

export const Image = observer(
  forwardRef(({ imageEntity, imageTransform, updateImageSize, usedValue, size, overlay }, ref) => {
    const imageSize = useMemo(() => {
      return {
        width: size.width === 1 ? "100%" : size.width,
        height: size.height === 1 ? "auto" : size.height,
      };
    }, [size]);

    const onLoad = useCallback(
      (event) => {
        updateImageSize(event);
        imageEntity.setImageLoaded(true);
      },
      [updateImageSize, imageEntity],
    );

    return (
      <div className={cn("image").toClassName()} style={imageSize}>
        {overlay}
        <ImageProgress
          downloading={imageEntity.downloading}
          progress={imageEntity.progress}
          error={imageEntity.error}
          src={imageEntity.src}
          usedValue={usedValue}
        />
        {imageEntity.downloaded ? (
          <ImageRenderer
            alt="image"
            ref={ref}
            src={imageEntity.currentSrc}
            onLoad={onLoad}
            isLoaded={imageEntity.imageLoaded}
            imageTransform={imageTransform}
          />
        ) : null}
      </div>
    );
  }),
);

const ImageProgress = observer(({ downloading, progress, error, src, usedValue }) => {
  return downloading ? (
    <div className={cn("image-progress").toClassName()}>
      <div className={cn("image-progress").elem("message").toClassName()}>Downloading image</div>
      <progress
        className={cn("image-progress").elem("bar").toClassName()}
        value={progress}
        min="0"
        max={1}
        step={0.0001}
      />
    </div>
  ) : error ? (
    <ImageLoadingError src={src} value={usedValue} />
  ) : null;
});

const imgDefaultProps = { crossOrigin: "anonymous" };

const ImageRenderer = observer(
  forwardRef(({ src, onLoad, imageTransform, isLoaded }, ref) => {
    const imageStyles = useMemo(() => {
      // We can't just skip rendering the image because we need its dimensions to be set
      // so we just hide it with 0x0 dimensions.
      //
      // Real dimension will still be available via `naturalWidth` and `naturalHeight`
      const style = {
        // For now, we can't fully hide it as it is used by the Magic Wand tool, so this will hide it visually, but allow using it on the canvas.
        // It is still possible that there is another way to get the right image data in the tool, so it's a temporary quick fix
        ...imageTransform,
        clip: "rect(1px, 1px, 1px, 1px)",
      };

      return {
        ...style,
        maxWidth: "unset",
        visibility: isLoaded ? "visible" : "hidden",
      };
    }, [imageTransform, isLoaded]);

    // biome-ignore lint/a11y/noRedundantAlt: The use of this component justifies this alt text
    return <img {...imgDefaultProps} ref={ref} alt="image" src={src} onLoad={onLoad} style={imageStyles} />;
  }),
);

const ImageLoadingError = ({ src, value }) => {
  const error = useMemo(() => {
    return messages.ERR_LOADING_HTTP({
      url: src,
      error: "",
      attr: value,
    });
  }, [src]);

  return <ErrorMessage error={error} />;
};

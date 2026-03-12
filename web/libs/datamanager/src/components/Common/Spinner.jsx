import { inject } from "mobx-react";
import React from "react";
import Running from "../../assets/running";

const injector = inject(({ store }) => {
  return {
    SDK: store?.SDK,
  };
});

export const Spinner = injector(({ SDK, visible = true, ...props }) => {
  const size = React.useMemo(() => {
    switch (props.size) {
      case "large":
        return SDK?.spinnerSize?.large ?? 128;
      case "middle":
        return SDK?.spinnerSize?.middle ?? 48;
      case "small":
        return SDK?.spinnerSize?.small ?? 24;
      default:
        return SDK?.spinnerSize?.middle ?? 48;
    }
  }, [props.size]);

  const source = Running.default;
  const largeThreshold = SDK?.spinnerSize?.large ?? 128;
  const isLarge = size >= largeThreshold;
  // Large: always use x2 so 128px display has 128px image. Small/middle: use srcSet so browser picks by DPR.
  const imgSrc = isLarge ? source.x2 : source.x1;
  const imgSrcSet = isLarge ? undefined : `${source.x1} 1x, ${source.x2} 2x`;
  const imgStyles = {
    width: size,
    height: size,
    objectFit: "contain",
  };

  const ExternalSpinner = SDK?.spinner;

  return visible ? (
    <div
      {...props}
      style={{ width: size, height: size }}
      children={
        <div style={{ width: "100%", height: "100%" }}>
          {ExternalSpinner ? (
            <ExternalSpinner size={size} />
          ) : (
            <img src={imgSrc} srcSet={imgSrcSet} style={imgStyles} alt="opossum loader" />
          )}
        </div>
      }
    />
  ) : null;
});

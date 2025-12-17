import chroma from "chroma-js";
import { observe } from "mobx";
import { useContext, useEffect, useMemo, useState } from "react";
import { ImageViewContext } from "../components/ImageView/ImageViewContext";
import Constants, { defaultStyle } from "../core/Constants";
import { isDefined } from "../utils/utilities";

const defaultStyles = {
  defaultOpacity: defaultStyle.opacity,
  defaultFillColor: defaultStyle.fillcolor,
  defaultStrokeColor: defaultStyle.strokecolor,
  defaultStrokeColorHighlighted: Constants.HIGHLIGHTED_STROKE_COLOR,
  defaultStrokeWidth: defaultStyle.strokewidth,
  defaultStrokeWidthHighlighted: Constants.HIGHLIGHTED_STROKE_WIDTH,
  defaultSuggestionWidth: Constants.SUGGESTION_STROKE_WIDTH,
};

type StyleOptions = typeof defaultStyles & {
  region: any;
  highlighted?: boolean;
  shouldFill?: boolean;
  suggestion?: boolean;
  includeFill?: boolean;
  useStrokeAsFill?: boolean;
  sameStrokeWidthForSelected?: boolean;
  forceNoFill?: boolean;
  strokeWidthMultiplier?: number;
};

export const getRegionStyles = ({
  region,
  highlighted = false,
  shouldFill = false,
  useStrokeAsFill = false,
  sameStrokeWidthForSelected = false,
  suggestion = false,
  defaultOpacity = defaultStyle.opacity,
  defaultFillColor = defaultStyle.fillcolor,
  defaultStrokeColor = defaultStyle.strokecolor,
  defaultStrokeColorHighlighted = Constants.HIGHLIGHTED_STROKE_COLOR,
  defaultStrokeWidth = defaultStyle.strokewidth,
  defaultStrokeWidthHighlighted = Constants.HIGHLIGHTED_STROKE_WIDTH,
  defaultSuggestionWidth = Constants.SUGGESTION_STROKE_WIDTH,
  strokeWidthMultiplier = 1,
}: StyleOptions) => {
  const style = region.style || region.tag;

  const selected = region.inSelection || highlighted;

  const fillopacity = style?.fillopacity;
  const opacity = isDefined(fillopacity) ? fillopacity : style?.opacity;

  const fillColor = shouldFill
    ? chroma((useStrokeAsFill ? style?.strokecolor : style?.fillcolor) ?? defaultFillColor)
        .darken(0.3)
        .alpha(+(opacity ?? defaultOpacity ?? 0.5))
        .css()
    : null;

  const strokeColor = selected ? defaultStrokeColorHighlighted : chroma(style?.strokecolor ?? defaultStrokeColor).css();

  const strokeWidth = (() => {
    if (suggestion) {
      return defaultSuggestionWidth;
    }
    if (selected && !sameStrokeWidthForSelected) {
      return defaultStrokeWidthHighlighted;
    }
    return +(style?.strokewidth ?? defaultStrokeWidth);
  })();

  return {
    strokeColor,
    fillColor,
    strokeWidth: strokeWidth * strokeWidthMultiplier,
  };
};

export const useRegionStyles = (region: any, options: Partial<StyleOptions> = {}) => {
  const { suggestion } = useContext(ImageViewContext) ?? {};
  const [highlighted, setHighlighted] = useState(region.highlighted);
  const forceNoFill = options.forceNoFill ?? false;
  const [shouldFill, setShouldFill] = useState(
    forceNoFill ? false : (region.fill ?? (options.useStrokeAsFill || options.includeFill)),
  );

  const styles = useMemo(() => {
    return getRegionStyles({
      ...defaultStyles,
      ...(options ?? {}),
      highlighted,
      shouldFill: forceNoFill ? false : shouldFill,
      region,
      suggestion,
    });
  }, [region, suggestion, options, highlighted, shouldFill, forceNoFill]);

  useEffect(() => {
    const disposeObserver = ["highlighted", "fill"].map((prop) => {
      try {
        return observe(
          region,
          prop,
          ({ newValue }) => {
            switch (prop) {
              case "highlighted":
                return setHighlighted(newValue);
              case "fill":
                if (forceNoFill) return;
                return setShouldFill(newValue);
            }
          },
          true,
        );
      } catch (e) {
        return () => {};
      }
    });

    return () => {
      disposeObserver.forEach((dispose) => dispose());
    };
  }, [region, forceNoFill]);

  return styles;
};

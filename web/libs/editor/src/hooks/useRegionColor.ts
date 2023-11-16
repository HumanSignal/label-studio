import chroma from 'chroma-js';
import { observe } from 'mobx';
import { useContext, useEffect, useMemo, useState } from 'react';
import { ImageViewContext } from '../components/ImageView/ImageViewContext';
import Constants, { defaultStyle } from '../core/Constants';
import { isDefined } from '../utils/utilities';

const defaultStyles = {
  defaultOpacity: defaultStyle.opacity,
  defaultFillColor: defaultStyle.fillcolor,
  defaultStrokeColor: defaultStyle.strokecolor,
  defaultStrokeColorHighlighted: Constants.HIGHLIGHTED_STROKE_COLOR,
  defaultStrokeWidth: defaultStyle.strokewidth,
  defaultStrokeWidthHighlighted: Constants.HIGHLIGHTED_STROKE_WIDTH,
  defaultSuggestionWidth: Constants.SUGGESTION_STROKE_WIDTH,
};

type StyleOptions = (typeof defaultStyles) & {
  region: any,
  highlighted?: boolean,
  shouldFill?: boolean,
  suggestion?: boolean,
  includeFill?: boolean,
  useStrokeAsFill?: boolean,
  sameStrokeWidthForSelected?: boolean,
}

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
}: StyleOptions) => {
  const style = region.style || region.tag;

  const selected = region.inSelection || highlighted;

  const fillopacity = style?.fillopacity;
  const opacity = isDefined(fillopacity) ? fillopacity : style?.opacity;

  const fillColor = shouldFill ? (
    chroma((useStrokeAsFill ? style?.strokecolor : style?.fillcolor) ?? defaultFillColor)
      .darken(0.3)
      .alpha(+(opacity ?? defaultOpacity ?? 0.5))
      .css()
  ) : null;

  const strokeColor = selected
    ? defaultStrokeColorHighlighted
    : chroma(style?.strokecolor ?? defaultStrokeColor).css();

  const strokeWidth = (() => {
    if (suggestion) {
      return defaultSuggestionWidth;
    } else if (selected && !sameStrokeWidthForSelected) {
      return defaultStrokeWidthHighlighted;
    } else {
      return +(style?.strokewidth ?? defaultStrokeWidth);
    }
  })();

  return {
    strokeColor,
    fillColor,
    strokeWidth,
  };
};


export const useRegionStyles = (region: any, options: Partial<StyleOptions> = {}) => {
  const { suggestion } = useContext(ImageViewContext) ?? {};
  const [highlighted, setHighlighted] = useState(region.highlighted);
  const [shouldFill, setShouldFill] = useState(region.fill ?? (options.useStrokeAsFill || options.includeFill));

  const styles = useMemo(() => {
    return getRegionStyles({
      ...defaultStyles,
      ...(options ?? {}),
      highlighted,
      shouldFill,
      region,
      suggestion,
    });
  }, [region, suggestion, options, highlighted, shouldFill]);

  useEffect(() => {
    const disposeObserver = [
      'highlighted',
      'fill',
    ].map(prop => {
      try {
        return observe(region, prop, ({ newValue }) => {
          switch (prop) {
            case 'highlighted': return setHighlighted(newValue);
            case 'fill': return setShouldFill(newValue);
          }
        }, true);
      } catch (e) {
        return () => {};
      }
    });

    return () => {
      disposeObserver.forEach(dispose => dispose());
    };
  }, [region]);

  return styles;
};

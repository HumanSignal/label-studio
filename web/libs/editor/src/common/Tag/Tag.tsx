import color from 'chroma-js';
import { CSSProperties, FC } from 'react';
import { Block } from '../../utils/bem';
import { colors } from '../../utils/namedColors';
import './Tag.styl';

type ColorName = keyof typeof colors;

const prepareColor = (colorString: string, solid: boolean) => {
  const baseColor = color(colorString);

  return solid ? {
    'color': color.contrast(baseColor, '#fff') > 4.5 ? '#fff' : '#000',
    'background': baseColor,
    'shadow-color': baseColor.darken(0.22),
  } : {
    'color': baseColor,
    'background': baseColor.desaturate(2).brighten(2.2),
    'shadow-color': baseColor.desaturate(1).brighten(1.22),
  };
};

const getColor = (colorString: string | ColorName) => {
  if (colorString) {
    return colors[colorString as ColorName] ?? colorString;
  } else {
    return colors.blue;
  }
};

interface TagProps {
  color: string | ColorName;
  className?: string;
  style?: CSSProperties;
  size?: 'small' | 'compact';
  solid?: boolean;
  children?: React.ReactNode;
}

export const Tag: FC<TagProps> = ({ className, style, size, color, solid = false, children }) => {
  const preparedColor = prepareColor(getColor(color), solid);

  const finalColor = Object.entries(preparedColor).reduce(
    (res, [key, color]) => ({ ...res, [`--${key}`]: color }),
    {},
  );

  const styles = { ...(style ?? {}), ...finalColor };

  return (
    <Block tag="span" name="tag" mod={{ size }} mix={className} style={styles}>
      {children}
    </Block>
  );
};

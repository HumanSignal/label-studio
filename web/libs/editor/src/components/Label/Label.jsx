import chroma from "chroma-js";
import React, { useMemo } from "react";
import { Block, Elem } from "../../utils/bem";
import { asVars } from "../../utils/styles";

import "./Label.styl";

export const Label = React.forwardRef(
  (
    {
      className,
      style,
      color,
      empty = false,
      hidden = false,
      selected = false,
      margins = false,
      onClick,
      children,
      hotkey,
      ...rest
    },
    ref,
  ) => {
    const styles = useMemo(() => {
      if (!color) return null;
      const background = chroma(color).alpha(0.15);

      return {
        ...(style ?? {}),
        ...asVars({
          color,
          background,
        }),
      };
    }, [color]);

    return (
      <Block
        tag="span"
        ref={ref}
        name="label"
        mod={{ empty, hidden, selected, clickable: !!onClick, margins }}
        mix={className}
        style={styles}
        onClick={onClick}
        {...rest}
      >
        <Elem tag="span" name="text">
          {children}
        </Elem>
        {hotkey ? (
          <Elem tag="span" name="hotkey">
            {hotkey}
          </Elem>
        ) : null}
      </Block>
    );
  },
);

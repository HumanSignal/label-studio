import React from 'react';
import { cn } from '../../utils/bem';
import "./Card.styl";

export const Card = ({header, extra, children, style}) => {
  const rootClass = cn("card");
  return <div className={rootClass} style={style}>
    {(header || extra) && (
      <div className={rootClass.elem("header")}>
        <div className={rootClass.elem("header-content")}>
          {header}
        </div>

        {extra && (
          <div className={rootClass.elem("header-extra")}>
            {extra}
          </div>
        )}
      </div>
    )}
    <div className={rootClass.elem("content")}>
      {children}
    </div>
  </div>;
};

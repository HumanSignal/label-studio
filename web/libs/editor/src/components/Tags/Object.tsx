import React, { type CSSProperties, type FC } from "react";
import { observer } from "mobx-react";
import { cn } from "../../utils/bem";

interface ObjectTagViewProps {
  item: any;
  className?: string;
  style?: CSSProperties;
}

/**
 * Object Tag Component
 */
const ObjectTagView: FC<ObjectTagViewProps> = ({ item, style, className, children }) => {
  const moreProps = item.getProps && item.getProps();
  const objectClassName = cn("object").toClassName();

  return (
    <div
      className={[objectClassName, className].join(" ")}
      data-needs-update={item._needsUpdate}
      style={style}
      {...moreProps}
    >
      {children}
    </div>
  );
};

export const ObjectTag = observer(ObjectTagView);

export default observer(ObjectTagView);

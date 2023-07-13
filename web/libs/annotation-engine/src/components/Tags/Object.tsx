import React, { CSSProperties, FC } from 'react';
import { observer } from 'mobx-react';

interface ObjectTagViewProps {
  item: any;
  className?: string;
  style?: CSSProperties;
}

/**
 * Object Tag Component
 */
const ObjectTagView: FC<ObjectTagViewProps> = ({
  item,
  style,
  className,
  children,
}) => {

  const moreProps = item.getProps && item.getProps();

  return (
    <div
      className={['lsf-object', className].join(' ')}
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

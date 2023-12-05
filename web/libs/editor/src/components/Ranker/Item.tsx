import { useContext, useMemo } from 'react';
import { Draggable } from 'react-beautiful-dnd';

import { sanitizeHtml } from '../../utils/html';
import { InputItem } from './createData';
import { CollapsedContext } from './Ranker';

import styles from './Ranker.module.scss';

interface ItemProps {
  item: InputItem;
  index: number;
  readonly?: boolean;
}

/**
 * Item component represents a draggable item within each column. Items can be dragged within a
 * given column as well as between columns.
 */
const Item = (props: ItemProps) => {
  const { item, index, readonly } = props;

  // @todo document html parameter later after proper tests
  const html = useMemo(() => item.html ? sanitizeHtml(item.html) : '', [item.html]);
  const [collapsible, collapsedMap, toggleCollapsed] = useContext(CollapsedContext);
  const collapsed = collapsedMap[item.id] ?? false;
  const toggle = collapsible
    ? () => toggleCollapsed(item.id, !collapsed)
    : undefined;
  const classNames = [styles.item, 'htx-ranker-item'];

  if (collapsible) classNames.push(collapsed ? styles.collapsed : styles.expanded);

  return (
    <Draggable draggableId={item.id} index={index} isDragDisabled={readonly}>
      {provided => {
        return (
          <div
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{ ...provided.draggableProps.style }}
            className={classNames.join(' ')}
            ref={provided.innerRef}
            data-ranker-id={item.id}
          >
            {item.title && <h3 className={styles.itemTitle} onClick={toggle}>{item.title}</h3>}
            {item.body && <p className={styles.itemLine}>{item.body}</p>}
            {item.html && <p className={styles.itemLine} dangerouslySetInnerHTML={{ __html: html }} />}
            <p className={styles.itemLine}>{item.id}</p>
          </div>
        );
      }}
    </Draggable>
  );
};

export default Item;

import Item from './Item';
import { StrictModeDroppable } from './StrictModeDroppable';
import { InputItem, NewColumnData } from './createData';

import styles from './Ranker.module.scss';

interface ColumnProps {
  column: NewColumnData;
  items: InputItem[];
  readonly?: boolean;
}

/*
 * defines a column component used by the DragDropBoard component. Each column contains items
 * that can be reordered by dragging.
 */

const Column = (props: ColumnProps) => {
  const { column, items, readonly } = props;

  return (
    <div className={[styles.column, 'htx-ranker-column'].join(' ')}>
      <h1>{column.title}</h1>
      <StrictModeDroppable droppableId={column.id}>
        {provided => (
          <div ref={provided.innerRef} {...provided.droppableProps} className={styles.dropArea}>
            {items.map((item, index) => (
              <Item key={item.id} item={item} index={index} readonly={readonly} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </StrictModeDroppable>
    </div>
  );
};

export default Column;

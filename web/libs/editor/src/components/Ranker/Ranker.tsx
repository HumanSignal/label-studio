import React, { createContext, useCallback, useEffect, useState } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';

import Column from './Column';
import { NewBoardData } from './createData';

import styles from './Ranker.module.scss';

interface BoardProps {
  inputData: NewBoardData;
  handleChange?: (ids: Record<string, string[]>) => void;
  readonly?: boolean;
  collapsible?: boolean;
}
type CollapsedMap = Record<string, boolean>;
type CollapsedContextType = [
  boolean,
  CollapsedMap,
  (idOrIds: string | string[], value: boolean) => void
];

const CollapsedContext = createContext<CollapsedContextType>([true, {}, (_id, _value) => {}]);

// Component for a drag and drop board with 1+ columns
const Ranker = ({ inputData, handleChange, readonly, collapsible = true }: BoardProps) => {
  const [data, setData] = useState(inputData);
  // items in different columns are different components, so collapsed state should be stored
  // separately; also it's better to not mutate items itself, so here is the map
  const [collapsed, setCollapsed] = useState<CollapsedMap>({});
  // array of ids is used by columns
  const toggleCollapsed = useCallback((idOrIds: string | string[], value: boolean) => {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    const values = ids.reduce((acc, id) => ({ ...acc, [id]: value }), {});

    setCollapsed(c => ({ ...c, ...values }));
  }, []);

  // Update data when inputData changes
  useEffect(() => {
    setData(inputData);
  }, [inputData]);

  // Handle reordering of items
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Check if user dropped item outside of columns or in same location as starting location
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    // handle reorder when item was dragged to a new position
    // determine which column item was moved from
    const startCol = data.columns.find(col => col.id === source.droppableId);
    const endCol = data.columns.find(col => col.id === destination.droppableId);

    if (startCol === endCol) {
      // get original items list
      const newCol = [...data.itemIds[source.droppableId]];

      // reorder items list
      newCol.splice(source.index, 1);
      newCol.splice(destination.index, 0, draggableId);

      // update state
      const newItemIds = {
        ...data.itemIds,
        [source.droppableId]: newCol,
      };

      const newData = {
        ...data,
        itemIds: newItemIds,
      };

      setData(newData);
      // update results
      handleChange ? handleChange(newItemIds) : null;
      return;
    }

    // handle case when moving from one column to a different column
    const startItemIds = [...data.itemIds[source.droppableId]];

    startItemIds.splice(source.index, 1);

    const endItemIds = [...(data.itemIds[destination.droppableId] ?? [])];

    endItemIds.splice(destination.index, 0, draggableId);

    const newItemIds = {
      ...data.itemIds,
      [source.droppableId]: startItemIds,
      [destination.droppableId]: endItemIds,
    };

    const newData = {
      ...data,
      itemIds: newItemIds,
    };


    handleChange ? handleChange(newItemIds) : null;
    setData(newData);
  };

  return (
    <CollapsedContext.Provider value={[collapsible, collapsed, toggleCollapsed]}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className={styles.board}>
          <>
            {data.columns.map(column => {
              const items = data.itemIds[column.id]?.map(itemId => data.items[itemId]) ?? [];

              return <Column key={column.id} column={column} items={items} readonly={readonly} />;
            })}
          </>
        </div>
      </DragDropContext>
    </CollapsedContext.Provider>
  );
};

export { CollapsedContext };
export default Ranker;

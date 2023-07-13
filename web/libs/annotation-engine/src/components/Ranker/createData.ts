/**
 * this file dictates the shape of the data used in the ranker component.
 */

//represents a column of data
export interface ColumnData {
  id: string;
  title: string;
  itemIds: string[];
}

//represents an item living in a column
export interface InputItem {
  id: string;
  title?: string;
  body?: string;
  html?: string;
}

//represents the entire board of columns and items
export interface BoardData {
  items: { [id: string]: InputItem };
  columns: { [id: string]: ColumnData };
  columnOrder: string[];
}

//represents a column of data
export interface NewColumnData {
  id: string;
  title: string;
}
//represents the entire board of columns and items
export interface NewBoardData {
  items: { [id: string]: InputItem };
  columns: NewColumnData[];
  itemIds: Record<string, string[]>;
}

/**
 * assumed input data structure:
 * id: string
 * title: string
 * body: string
 */

export const transformData = (columns: Array<InputItem[]>, titles: string[]) => {
  /* loop through input data and create query data object used for ranker component */

  const queryData: BoardData = {
    items: {},
    columns: {},
    columnOrder: [],
  };

  columns.forEach((items, idx) => {
    const id = String(idx);

    queryData.columns[id] = {
      id,
      title: titles[idx] || '',
      itemIds: items.map(item => item.id),
    };

    items.forEach(item => {
      queryData.items[item.id] = item;
    });

    queryData.columnOrder.push(id);
  });

  return queryData;
};

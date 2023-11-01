import React from "react";
import { TableElem } from "../TableContext";

export const TableCell = ({ ...props }) => {
  return <TableElem {...props} name="cell" />;
};
TableCell.displayName = "TableCell";

export const TableCellContent = ({ ...props }) => {
  return <TableElem {...props} name="cell-content" />;
};
TableCellContent.displayName = "TableCellContent";

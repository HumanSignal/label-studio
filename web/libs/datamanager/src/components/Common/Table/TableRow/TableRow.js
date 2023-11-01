import { observer } from "mobx-react";
import React from "react";
import { toStudlyCaps } from 'strman';
import { Block } from "../../../../utils/bem";
import { TableContext, TableElem } from "../TableContext";
import { getProperty, getStyle } from "../utils";
import "./TableRow.styl";

const CellRenderer = observer(
  ({ col: colInput, data, decoration, cellViews }) => {
    const { Header: _, Cell, id, ...col } = colInput;

    if (Cell instanceof Function) {
      const { headerClassName: _, cellClassName, ...rest } = col;

      return (
        <TableElem {...rest} name="cell" key={id} mix={cellClassName}>
          <Cell data={data} />
        </TableElem>
      );
    }


    const valuePath = id.split(":")[1] ?? id;
    const altType = toStudlyCaps(valuePath);
    const value = getProperty(data, valuePath);

    const Renderer = cellViews[altType] ?? cellViews[col.original.currentType] ?? cellViews.String;
    const renderProps = { column: col, original: data, value };
    const Decoration = decoration?.get?.(col);
    const style = getStyle(cellViews, col, Decoration);

    return (
      <TableElem name="cell">
        <div
          style={{
            ...(style ?? {}),
            display: "flex",
            height: "100%",
            alignItems: "center",
          }}
        >
          {Renderer ? <Renderer {...renderProps} /> : value}
        </div>
      </TableElem>
    );
  },
);

export const TableRow = observer(({ data, even, style, wrapperStyle, onClick, stopInteractions, decoration }) => {
  const classNames = ["table-row"];

  if (data.isLoading) classNames.push("loading");

  const { columns, cellViews } = React.useContext(TableContext);

  const mods = {
    even,
    selected: data.isSelected,
    highlighted: data.isHighlighted,
    loading: data.isLoading,
    disabled: stopInteractions,
  };

  return (
    <TableElem
      name="row-wrapper"
      mod={mods}
      style={wrapperStyle}
      onClick={(e) => onClick?.(data, e)}
    >
      <Block
        name="table-row"
        style={style}
        className={classNames.join(" ")}
      >
        {columns.map((col) => {
          return (
            <CellRenderer
              key={col.id}
              col={col}
              data={data}
              cellViews={cellViews}
              decoration={decoration}
            />
          );
        })}
      </Block>
    </TableElem>
  );
});

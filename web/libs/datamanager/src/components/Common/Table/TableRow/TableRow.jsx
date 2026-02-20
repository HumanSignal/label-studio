import { observer } from "mobx-react";
import React from "react";
import { cn } from "../../../../utils/bem";
import { FF_LOPS_E_3, isFF } from "../../../../utils/feature-flags";
import { normalizeCellAlias } from "../../../CellViews";
import { SkeletonLoader } from "../../SkeletonLoader";
import "./TableRow.scss";
import { TableContext, tableCN } from "../TableContext";
import { getProperty, getStyle } from "../utils";

const CellRenderer = observer(({ col: colInput, data, decoration, cellViews }) => {
  const { Header: _, Cell, id, ...col } = colInput;

  if (Cell instanceof Function) {
    const { headerClassName: _, cellClassName, ...rest } = col;

    return (
      <span className={tableCN.elem("cell").mix(cellClassName).toClassName()} {...rest} key={id}>
        <Cell data={data} />
      </span>
    );
  }

  const valuePath = id.split(":")[1] ?? id;
  const altType = normalizeCellAlias(valuePath);
  const value = getProperty(data, valuePath);

  const Renderer = cellViews[altType] ?? cellViews[col.original.currentType] ?? cellViews.String;
  const renderProps = { column: col, original: data, value };
  const Decoration = decoration?.get?.(col);
  const style = getStyle(cellViews, col, Decoration);
  const cellIsLoading = isFF(FF_LOPS_E_3) && data.loading === colInput.alias;

  return (
    <div className={tableCN.elem("cell").toClassName()}>
      <div
        style={{
          ...(style ?? {}),
          display: "flex",
          height: "100%",
          alignItems: cellIsLoading ? "" : "center",
        }}
      >
        {cellIsLoading ? <SkeletonLoader /> : Renderer ? <Renderer {...renderProps} /> : value}
      </div>
    </div>
  );
});

export const TableRow = observer(
  ({ data, even, style, wrapperStyle, onClick, stopInteractions, decoration, onContextMenu }) => {
    const { columns, cellViews, contextMenuRowId } = React.useContext(TableContext);
    const rowWrapperCN = tableCN.elem("row-wrapper");
    const tableRowCN = cn("table-row");
    const hasContextMenuOpen = contextMenuRowId === data.id;
    const mods = {
      even,
      selected: data.isSelected,
      highlighted: data.isHighlighted,
      loading: data.isLoading,
      disabled: stopInteractions,
      "context-menu-open": hasContextMenuOpen,
    };

    return (
      <div
        className={rowWrapperCN.mod(mods).toClassName()}
        style={wrapperStyle}
        onClick={(e) => onClick?.(data, e)}
        onContextMenu={(e) => onContextMenu?.(e, data)}
        data-testid="table-row-wrapper"
      >
        <div className={tableRowCN.toClassName()} style={style} data-leave={true} data-testid="table-row">
          {columns.map((col) => {
            return <CellRenderer key={col.id} col={col} data={data} cellViews={cellViews} decoration={decoration} />;
          })}
        </div>
      </div>
    );
  },
);

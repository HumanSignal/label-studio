import { observer } from "mobx-react";
import React from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeGrid } from "react-window";
import { Block, Elem } from "../../../utils/bem";
import { Checkbox } from "../../Common/Checkbox/Checkbox";
import { Space } from "../../Common/Space/Space";
import { getProperty, prepareColumns } from "../../Common/Table/utils";
import * as DataGroups from "../../DataGroups";
import "./GridView.styl";
import { FF_LOPS_E_3, isFF } from "../../../utils/feature-flags";
import { SkeletonLoader } from "../../Common/SkeletonLoader";

const GridHeader = observer(({ row, selected }) => {
  return (
    <Elem name="cell-header">
      <Space>
        <Checkbox checked={selected.isSelected(row.id)} />
        <span>{row.id}</span>
      </Space>
    </Elem>
  );
});

const GridBody = observer(({ row, fields }) => {
  const dataFields = fields.filter((f) => f.parent?.alias === "data");

  return dataFields.map((field, index) => {
    const valuePath = field.id.split(":")[1] ?? field.id;
    const value = getProperty(row, valuePath);

    return (
      <GridDataGroup
        key={`${row.id}-${index}`}
        type={field.currentType}
        value={value}
        field={field}
        row={row}
      />
    );
  });
});

const GridDataGroup = observer(({ type, value, field, row }) => {
  const DataTypeComponent = DataGroups[type];

  return (isFF(FF_LOPS_E_3) && row.loading === field.alias) ? <SkeletonLoader /> : (
    DataTypeComponent ? (
      <DataTypeComponent value={value} field={field} original={row} />
    ) : (
      <DataGroups.TextDataGroup value={value} field={field} original={row} />
    )
  );
});

const GridCell = observer(
  ({ view, selected, row, fields, onClick, ...props }) => {
    return (
      <Elem
        {...props}
        name="cell"
        onClick={onClick}
        mod={{ selected: selected.isSelected(row.id) }}
      >
        <Elem name="cell-content">
          <GridHeader
            view={view}
            row={row}
            fields={fields}
            selected={view.selected}
          />
          <GridBody view={view} row={row} fields={fields} />
        </Elem>
      </Elem>
    );
  },
);

export const GridView = observer(
  ({ data, view, fields, onChange, hiddenFields }) => {
    const columnCount = view.gridWidth ?? 4;

    const getCellIndex = (row, column) => columnCount * row + column;

    const fieldsData = React.useMemo(() => {
      return prepareColumns(fields, hiddenFields);
    }, [fields, hiddenFields]);

    const rowHeight = fieldsData
      .filter((f) => f.parent?.alias === "data")
      .reduce((res, f) => {
        const height = (DataGroups[f.currentType] ?? DataGroups.TextDataGroup)
          .height;

        return res + height;
      }, 16);

    const renderItem = React.useCallback(
      ({ style, rowIndex, columnIndex }) => {
        const index = getCellIndex(rowIndex, columnIndex);
        const row = data[index];

        if (!row) return null;

        const props = {
          style: {
            ...style,
            marginLeft: "1em",
          },
        };

        return (
          <GridCell
            {...props}
            view={view}
            row={row}
            fields={fieldsData}
            selected={view.selected}
            onClick={() => onChange?.(row.id)}
          />
        );
      },
      [
        data,
        fieldsData,
        view.selected,
        view,
        view.selected.list,
        view.selected.all,
        columnCount,
      ],
    );

    const itemCount = Math.ceil(data.length / columnCount);

    return (
      <Block
        name="grid-view"
        style={{ flex: 1, "--column-count": `${columnCount}n` }}
      >
        <Elem tag={AutoSizer} name="resize">
          {({ width, height }) => (
            <Elem
              tag={FixedSizeGrid}
              width={width}
              height={height}
              name="list"
              rowHeight={rowHeight + 42}
              overscanRowCount={30}
              columnCount={columnCount}
              columnWidth={width / columnCount - 9.5}
              rowCount={itemCount}
              style={{ overflowX: "hidden" }}
            >
              {renderItem}
            </Elem>
          )}
        </Elem>
      </Block>
    );
  },
);

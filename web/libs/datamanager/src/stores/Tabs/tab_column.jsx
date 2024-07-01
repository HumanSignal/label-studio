import { getRoot, getSnapshot, types } from "mobx-state-tree";
import React from "react";
import {
  CommentCheck,
  CommentRed,
  LsAnnotation,
  LsBanSquare,
  LsSparkSquare,
  LsStarSquare,
  LsThumbsDown,
  LsThumbsUp,
} from "../../assets/icons";
import * as CellViews from "../../components/CellViews";
import { normalizeCellAlias } from "../../components/CellViews";
import { all } from "../../utils/utils";
import { StringOrNumberID } from "../types";

export const ViewColumnType = types.enumeration([
  "String",
  "Number",
  "Boolean",
  "Datetime",
  "List",
  "Image",
  "Audio",
  "AudioPlus",
  "Video",
  "Text",
  "HyperText",
  "TimeSeries",
  "Unknown",
]);

export const ViewColumnTypeShort = (type) => {
  switch (type) {
    default:
    case "String":
      return "str";
    case "Number":
      return "num";
    case "Boolean":
      return "bool";
    case "Datetime":
      return "date";
    case "Image":
      return "img";
    case "Audio":
      return "aud";
    case "AudioPlus":
      return "aud";
    case "Video":
      return "vid";
    case "Text":
      return "txt";
    case "HyperText":
      return "html";
    case "TimeSeries":
      return "ts";
  }
};

export const ViewColumnTypeName = (type) => {
  switch (type) {
    default:
    case "String":
      return "String";
    case "Number":
      return "Number";
    case "Boolean":
      return "Boolean";
    case "Datetime":
      return "Date Time";
    case "Image":
      return "Image";
    case "Audio":
      return "Audio";
    case "AudioPlus":
      return "Audio";
    case "Video":
      return "Video";
    case "Text":
      return "Text";
    case "HyperText":
      return "Hyper Text";
    case "TimeSeries":
      return "Time Series";
  }
};

export const TabColumn = types
  .model("ViewColumn", {
    id: StringOrNumberID,
    title: types.string,
    alias: types.string,
    type: types.optional(ViewColumnType, "String"),
    displayType: types.optional(types.maybeNull(ViewColumnType), null),
    defaultHidden: types.optional(types.boolean, false),
    parent: types.maybeNull(types.late(() => types.reference(TabColumn))),
    children: types.maybeNull(types.array(types.late(() => types.reference(TabColumn)))),
    target: types.enumeration(["tasks", "annotations"]),
    orderable: types.optional(types.boolean, true),
    help: types.maybeNull(types.string),
  })
  .views((self) => ({
    get hidden() {
      if (self.children) {
        return all(self.children, (c) => c.hidden);
      }
      return self.parentView?.hiddenColumns.hasColumn(self) ?? (self.parent.hidden || false);
    },

    get parentView() {
      return getRoot(self).viewsStore.selected;
    },

    get key() {
      return self.id;
    },

    get accessor() {
      return (data) => {
        if (!self.parent) {
          const value = data[self.alias];

          return typeof value === "object" ? null : value;
        }

        try {
          const value = data?.[self.parent.alias]?.[self.alias];

          return value ?? null;
        } catch {
          console.log("Error generating accessor", {
            id: self.alias,
            parent: self.parent?.alias,
            data,
            snapshot: getSnapshot(self),
          });
          return data[self.alias];
        }
      };
    },

    get renderer() {
      return ({ value }) => {
        return value?.toString() ?? null;
      };
    },

    get canOrder() {
      return self.orderable && !self.children && !getRoot(self).isLabeling;
    },

    get order() {
      return self.parentView.currentOrder[self.id];
    },

    get currentType() {
      const displayType = self.parentView?.columnsDisplayType?.get(self.id);

      return displayType ?? self.type;
    },

    get asField() {
      const result = [];

      if (self.children) {
        const childColumns = [].concat(...self.children.map((subColumn) => subColumn.asField));

        result.push(...childColumns);
      } else {
        result.push({
          ...self,
          id: self.key,
          accessor: self.accessor,
          hidden: self.hidden,
          original: self,
          currentType: self.currentType,
          width: self.width,
        });
      }

      return result;
    },

    get icon() {
      switch (self.alias) {
        default:
          return null;
        case "total_annotations":
          return <LsAnnotation width="20" height="20" style={{ color: "#617ADA" }} />;
        case "cancelled_annotations":
          return <LsBanSquare width="20" height="20" style={{ color: "#DD0000" }} />;
        case "total_predictions":
          return <LsSparkSquare width="20" height="20" style={{ color: "#944BFF" }} />;
        case "reviews_accepted":
          return <LsThumbsUp width="20" height="20" style={{ color: "#2AA000" }} />;
        case "reviews_rejected":
          return <LsThumbsDown width="20" height="20" style={{ color: "#DD0000" }} />;
        case "ground_truth":
          return <LsStarSquare width="20" height="20" style={{ color: "#FFB700" }} />;
        case "comment_count":
          return <CommentCheck width="20" height="20" style={{ color: "#FFB700" }} />;
        case "unresolved_comment_count":
          return <CommentRed width="20" height="20" style={{ color: "#FFB700" }} />;
      }
    },

    get readableType() {
      return ViewColumnTypeShort(self.currentType);
    },

    get width() {
      return self.parentView?.columnsWidth?.get(self.id) ?? null;
    },

    get filterable() {
      const cellView = CellViews[self.type] ?? CellViews[normalizeCellAlias(self.alias)];

      return cellView?.filterable !== false;
    },
  }))
  .actions((self) => ({
    toggleVisibility() {
      self.parentView.toggleColumn(self);
    },

    setType(type) {
      self.parentView.setColumnDisplayType(self.id, type);
      self.parentView.save();
    },

    setWidth(width) {
      const view = self.parentView;

      view.setColumnWidth(self.id, width ?? null);
      view.save();
    },

    resetWidth() {
      self.parentView.setColumnWidth(self.id, null);
      self.parentView.save();
    },
  }));

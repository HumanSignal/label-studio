import { getRoot, getSnapshot, types } from "mobx-state-tree";
import {
  IconCommentCheck,
  IconCommentRed,
  IconAnnotation,
  IconBanSquare,
  IconSparkSquare,
  IconStarSquare,
  IconThumbsDown,
  IconThumbsUp,
} from "@humansignal/icons";
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
  "Time",
  "Unknown",
  "AgreementSelected",
  "TaskState",
]);

const typeShortMap = {
  String: "str",
  Number: "num",
  Boolean: "bool",
  Datetime: "date",
  Image: "img",
  Audio: "aud",
  AudioPlus: "aud",
  Video: "vid",
  Text: "txt",
  HyperText: "html",
  TimeSeries: "ts",
  Time: "time",
};

export const ViewColumnTypeShort = (type) => typeShortMap[type] || "str";

const typeNameMap = {
  String: "String",
  Number: "Number",
  Boolean: "Boolean",
  Datetime: "Date Time",
  Image: "Image",
  Audio: "Audio",
  AudioPlus: "Audio",
  Video: "Video",
  Text: "Text",
  HyperText: "Hyper Text",
  TimeSeries: "Time Series",
  Time: "Time",
};

export const ViewColumnTypeName = (type) => typeNameMap[type] || "String";

export const TabColumn = types
  .model("ViewColumn", {
    id: StringOrNumberID,
    title: types.string,
    alias: types.string,
    type: types.optional(ViewColumnType, "String"),
    displayType: types.optional(types.maybeNull(ViewColumnType), null),
    // Hidden by default, can be toggled by the user
    defaultHidden: types.optional(types.boolean, false),
    parent: types.maybeNull(types.late(() => types.reference(TabColumn))),
    children: types.maybeNull(types.array(types.late(() => types.reference(TabColumn)))),
    target: types.enumeration(["tasks", "annotations"]),
    orderable: types.optional(types.boolean, true),
    help: types.maybeNull(types.string),
    // Column alias whose filter should be joined automatically when a filter is created for this column
    child_filter: types.maybeNull(types.string),
    // Whether filtering and selection is disabled for the column
    disabled: types.optional(types.boolean, false),
    // Whether the column is hidden in the data manager, can't be toggled by the user
    hidden: types.optional(types.boolean, false),
    // Whether to show an EnterpriseBadge for the column
    enterprise_badge: types.optional(types.boolean, false),
  })
  .views((self) => ({
    get is_hidden() {
      if (self.children) {
        return all(self.children, (c) => c.is_hidden);
      }
      return self.hidden || (self.parentView?.hiddenColumns.hasColumn(self) ?? (self.parent.is_hidden || false));
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
      } else if (!self.isAnnotationResultsFilterColumn) {
        result.push({
          ...self,
          id: self.key,
          accessor: self.accessor,
          hidden: self.is_hidden,
          original: self,
          currentType: self.currentType,
          width: self.width,
        });
      }

      return result;
    },

    get icon() {
      switch (self.alias) {
        case "total_annotations":
          return <IconAnnotation width="20" height="20" style={{ color: "#617ADA" }} />;
        case "cancelled_annotations":
          return <IconBanSquare width="20" height="20" style={{ color: "#DD0000" }} />;
        case "total_predictions":
          return <IconSparkSquare width="20" height="20" style={{ color: "#944BFF" }} />;
        case "reviews_accepted":
          return <IconThumbsUp width="20" height="20" style={{ color: "#2AA000" }} />;
        case "reviews_rejected":
          return <IconThumbsDown width="20" height="20" style={{ color: "#DD0000" }} />;
        case "ground_truth":
          return <IconStarSquare width="20" height="20" style={{ color: "#FFB700" }} />;
        case "comment_count":
          return <IconCommentCheck width="20" height="20" style={{ color: "#FFB700" }} />;
        case "unresolved_comment_count":
          return <IconCommentRed width="20" height="20" style={{ color: "#FFB700" }} />;
        default:
          return null;
      }
    },

    get readableType() {
      // Show a friendly tag for per-dimension agreement columns
      if (typeof self.alias === "string") {
        if (self.alias.startsWith("dimension_agreement__")) {
          return "agreement";
        }
      }
      return ViewColumnTypeShort(self.currentType);
    },

    get width() {
      return self.parentView?.columnsWidth?.get(self.id) ?? null;
    },

    get filterable() {
      const cellView = CellViews[self.type] ?? CellViews[normalizeCellAlias(self.alias)];

      return cellView?.filterable !== false;
    },

    get isAnnotationResultsFilterColumn() {
      // these columns are not visible in the column selector, but are used for filtering
      const hidden_column_ids = ["annotations_results_json", "predictions_results_json"];
      return hidden_column_ids.some((id) => self.id.includes(`${id}.`) || self.id.endsWith(`:${id}`));
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

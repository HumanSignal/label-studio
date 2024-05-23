import { isDefined } from "../../utils/helpers";

/** @type {import("../utils/api-proxy").APIProxyOptions} */
export const APIConfig = {
  gateway: "/api/dm",
  endpoints: {
    /** Project base info */
    project: "/project",

    /** Available columns/fields of the dataset */
    columns: "/columns",

    /** Tabs (materialized views) */
    tabs: "/views",

    /** Creates a new tab */
    createTab: "POST:/views",

    /** Update particular tab (PATCH) */
    updateTab: "PATCH:/views/:tabID",

    /** Delete particular tab (DELETE) */
    deleteTab: "DELETE:/views/:tabID",

    /** Per-task annotations (annotations, predictions) */
    annotations: "/views/:tabID/annotations",

    /** Single task (sample) */
    task: "/../tasks/:taskID",

    /** List of tasks (samples) in the dataset */
    tasks: "/../tasks",

    /** Next task (labelstream, default sequential) */
    nextTask: "/tasks/next",

    /** Single annotation */
    annotation: "/../annotations/:id",

    /** Mark sample as skipped */
    skipTask: {
      method: "post",
      path: (params) => {
        const pathBase = "/../tasks/:taskID/annotations";
        const isNewAnnotation = !isDefined(params.annotationID);

        return isNewAnnotation ? pathBase : `${pathBase}/:annotationID`;
      },
    },

    /** Submit annotation */
    submitAnnotation: "POST:/../tasks/:taskID/annotations",

    /** Update annotation */
    updateAnnotation: "PATCH:/../annotations/:annotationID",

    /** Delete annotation */
    deleteAnnotation: "DELETE:/../annotations/:annotationID",

    /** Override selected items list (checkboxes) */
    setSelectedItems: "POST:/views/:tabID/selected-items",

    /** Add item to the current selection */
    addSelectedItem: "PATCH:/views/:tabID/selected-items",

    /** List of available actions */
    actions: "/actions",

    /** Subtract item from the current selection */
    deleteSelectedItem: "DELETE:/views/:tabID/selected-items",

    /** Invoke a particular action */
    invokeAction: "POST:/actions",
  },
};

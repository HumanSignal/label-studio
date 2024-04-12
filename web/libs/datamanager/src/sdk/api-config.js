/** @type {import("../utils/api-proxy").APIProxyOptions} */
export const APIConfig = {
  gateway: "/api/dm",
  endpoints: {
    /** Project base info */
    project: "/project",

    /** users list */
    users: "/../users",

    /** user info */
    user: "/../users/:pk",

    /** Available columns/fields of the dataset */
    columns: "/columns",

    /** Tabs (materialized views) */
    tabs: "/views",

    /** Single tab */
    tab: "/views/:tabId",

    /** Creates a new tab */
    createTab: {
      path: "/views",
      method: "post",
    },

    /** Update particular tab (PATCH) */
    updateTab: {
      path: "/views/:tabID",
      method: "patch",
    },

    /** Delete particular tab (DELETE) */
    deleteTab: {
      path: "/views/:tabID",
      method: "delete",
    },

    userLabelsForProject: "/../label_links",
    saveUserLabels: {
      path: "/../labels",
      method: "post",
    },

    /** List of tasks (samples) in the dataset */
    tasks: "/tasks",

    /** List of task history */
    taskHistory: "/../projects/:projectId/label-stream-history",

    /** Per-task annotations (annotations, predictions) */
    annotations: "/views/:tabID/annotations",

    /** Single task (sample) */
    task: "/tasks/:taskID",

    /** Next task (labelstream, default sequential) */
    nextTask: "/tasks/next",

    /** Single annotation */
    annotation: "/tasks/:taskID/annotations/:id",

    /** Presign url */
    presignUrlForTask: "/../../tasks/:taskID/presign",

    /** Presign url outside of task context */
    presignUrlForProject: "/../../projects/:projectId/presign",

    /** Submit annotation */
    submitAnnotation: {
      path: "/../tasks/:taskID/annotations",
      method: "post",
    },

    /** Update annotation */
    updateAnnotation: {
      path: "/../annotations/:annotationID",
      method: "patch",
    },

    /** Delete annotation */
    deleteAnnotation: {
      path: "/../annotations/:annotationID",
      method: "delete",
    },

    /** Task drafts */
    taskDrafts: "/../tasks/:taskID/drafts",

    /** Update draft by id */
    updateDraft: {
      path: "/../drafts/:draftID",
      method: "patch",
    },

    /** Delete draft by id */
    deleteDraft: {
      path: "/../drafts/:draftID",
      method: "delete",
    },

    /** Create draft for existing annotation */
    createDraftForAnnotation: {
      path: "/../tasks/:taskID/annotations/:annotationID/drafts",
      method: "post",
    },

    /** Create draft for new annotation */
    createDraftForTask: {
      path: "/../tasks/:taskID/drafts",
      method: "post",
    },

    /** Convert an annotation to draft */
    convertToDraft: {
      path: "/../annotations/:annotationID/convert-to-draft",
      method: "post",
    },

    /** Override selected items list (checkboxes) */
    setSelectedItems: {
      path: "/views/:tabID/selected-items",
      method: "post",
    },

    /** Add item to the current selection */
    addSelectedItem: {
      path: "/views/:tabID/selected-items",
      method: "patch",
    },

    /** List of available actions */
    actions: "/actions",

    /** Subtract item from the current selection */
    deleteSelectedItem: {
      path: "/views/:tabID/selected-items",
      method: "delete",
    },

    /** Invoke a particular action */
    invokeAction: {
      path: "/actions",
      method: "post",
    },

    /** List comments ?annotation=<annotation_id> **/
    listComments: "/../comments",

    /** Create a new comment **/
    createComment: {
      path: "/../comments",
      method: "post",
    },

    /** Update a comment **/
    updateComment: {
      path: "/../comments/:id",
      method: "patch",
    },

    /** Update a comment **/
    deleteComment: {
      path: "/../comments/:id",
      method: "delete",
    },
  },
};

function getData() {
  /**
   * TODO
   * Remove, this is here because MST either takes string or a fully features typed tree
   */
  if (window.taskData && window.taskData.data) {
    window.taskData.data = JSON.stringify(window.taskData.data);
  }

  const data = {
    /**
     * Project ID
     */
    projectID: window.projectID,
    /**
     * Loading of LS
     */
    isLoading: false,
    /**
     * Config in XML format
     */
    config: window.editorAppConfig,
    /**
     * Task ID
     */
    taskID: window.taskID,
    /**
     * Task data
     */
    task: window.taskData,
    /**
     * Expert
     */
    expert: window.expertData,
    /**
     * Debug mode of LS
     */
    debug: window.debugEditor,
    /**
     * Interfaces of LS
     */
    interfaces: window.editorInterfaces ? window.editorInterfaces : ["basic", "completions"],
    /**
     * Flag for display completions of task
     */
    explore: window.explore,
  };

  /**
   * This is here to make project_render_editor to work because it expects static config
   */
  if (window.preRender) {
    data["task"] = window.taskData;
  }

  /**
   * window.explore used for display completions
   */
  if (window.explore) {
    data["interfaces"] = window.editorInterfaces ? window.editorInterfaces : ["completions"];
  } else {
    data["interfaces"] = window.editorInterfaces ? window.editorInterfaces : ["submit", "skip"];
  }

  return data;
}

/**
 * LS will render in this part
 * TODO: Change #root to #L
 */
function rootElement() {
  const el = document.createElement("div");

  let root = document.getElementById("label-studio");

  root.innerHTML = "";
  root.appendChild(el);

  return el;
}

/**
 * Get current state of LS
 */
function getState() {
  const completions = window.taskData && window.taskData.completions ? window.taskData.completions : null;
  const predictions = window.taskData && window.taskData.predictions ? window.taskData.predictions : null;

  return {
    completions: completions,
    predictions: predictions,
  };
}

export default { getData, getState, rootElement };

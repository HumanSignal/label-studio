function getData() {
  // TODO remove, this is here because MST either takes string or a
  // fully features typed tree
  if (window.taskData) window.taskData.data = JSON.stringify(window.taskData.data);

  const data = {
    projectID: window.projectID,
    isLoading: false,
    config: window.editorAppConfig,
    // task: window.taskData,
    taskID: window.taskID,
    expert: window.expertData,
    debug: window.debugEditor,
    interfaces: window.editorInterfaces ? window.editorInterfaces : ["basic", "completions"],
  };

  // this is here to make project_render_editor to work because it
  // expects static config
  if (window.preRender) {
    data["task"] = window.taskData;
  }

  // /tasks/$id/explore
  if (window.explore) {
    data["interfaces"] = window.editorInterfaces ? window.editorInterfaces : ["basic", "completions"];
  } else {
    data["interfaces"] = window.editorInterfaces
      ? window.editorInterfaces
      : ["basic", "submit", "submit:skip", "submit:submit"];
  }

  return data;
}

function rootElement() {
  const el = document.createElement("div");
  var root = document.getElementById("root");
  root.innerHTML = "";
  root.appendChild(el);

  return el;
}

function getState() {
  const c = window.taskData && window.taskData.completions ? window.taskData.completions : null;

  return {
    completions: c,
  };
}

export default { getData, getState, rootElement };

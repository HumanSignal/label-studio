import configEnv from "./config-development";

/**
 * Wrapper to generate development config
 * @param {string} config
 */
function templateData(config) {
  let task = configEnv[config].task;

  window.T = task;

  task = {
    ...task,
    data: JSON.stringify(configEnv[config].data),
  };

  return {
    projectID: 1,
    isLoading: false, // loading of editor
    config: configEnv[config].config,
    task: task,
    taskID: 1,
    expert: {
      pk: 1,
      lastName: "Jones",
      firstName: "Oliver",
    },
    debug: window.location.search.indexOf("debug=true") !== -1,
    interfaces: window.editorInterfaces
      ? window.editorInterfaces
      : ["basic", "completions", "submit", "panel", "side-column"],
  };
}

/**
 * Function to generate data
 * @member default - Default with text
 * @member gptc - General-purpose text classifier
 * @member ner - Named-entity recognition
 * @member gpic - General-purpose image classifier
 * @member gptg - General-purpose text tagging
 * @member cda - Chatbot Dialogs Analysis
 * @member bbox - Annotate And Categorize Objects In An Image Using A Bounding Box
 * @member audio - Audio Region Labeling
 * @member dialog - Dialog
 *
 */
function getData() {
  return templateData("ner");
}

/**
 * Get completions for task
 */
function getState() {
  const resultCompletions = getData().task.completions ? getData().task.completions : null;
  return {
    completions: resultCompletions,
  };
}

/**
 * Function to return Root element
 */
function rootElement() {
  const el = document.createElement("div");

  let root = document.getElementById("root");

  root.innerHTML = "";
  root.appendChild(el);

  root.style.marginTop = "10px";
  root.style.marginBottom = "10px";
  root.style.marginLeft = "10px";
  root.style.marginRight = "10px";

  return el;
}

export default { getState, getData, rootElement };

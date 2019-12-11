import External from "../core/External";
import Requests from "../core/Requests";
import Messages from "../utils/messages";

function getData(task) {
  let mstTask = task;

  if (mstTask && mstTask.data) {
    mstTask = {
      ...mstTask,
      data: JSON.stringify(mstTask.data),
    };
  }

  return mstTask;
}

function getState(task) {
  const completions = task && task.completions ? task.completions : null;
  const predictions = task && task.predictions ? task.predictions : null;

  return {
    completions: completions,
    predictions: predictions,
  };
}

/**
 * LS will render in this part
 */
function rootElement(element) {
  const el = document.createElement("div");

  let root = document.getElementById(element);

  root.innerHTML = "";
  root.appendChild(el);

  return el;
}

/**
 * Function to configure application with callbacks
 * @param {object} params
 */
function configureApplication(params) {
  const options = {
    fetch: params.fetch || Requests.fetcher,
    patch: params.patch || Requests.patch,
    post: params.post || Requests.poster,
    remove: params.remove || Requests.remover,
    submitCompletion: params.submitCompletion || External.submitCompletion,
    updateCompletion: params.updateCompletion || External.updateCompletion,
    deleteCompletion: params.deleteCompletion || External.deleteCompletion,
    skipTask: params.skipTask || External.skipTask,
    onTaskLoad: params.onTaskLoad || External.onTaskLoad,
    onLabelStudioLoad: params.onLabelStudioLoad || External.onLabelStudioLoad,
    alert: m => console.log(m), // Noop for demo: window.alert(m)
    messages: { ...Messages, ...params.messages },
  };

  return options;
}

export default { getData, getState, rootElement, configureApplication };

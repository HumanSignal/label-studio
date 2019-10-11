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

export default { getData, getState, rootElement };

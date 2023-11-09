import External from '../core/External';
import Messages from '../utils/messages';

function getData(task) {
  if (task && task.data) {
    return {
      ...task,
      data: JSON.stringify(task.data),
    };
  }

  return task;
}

function getState(task) {
  return {
    annotations: task?.annotations,
    completions: task?.completions,
    predictions: task?.predictions,
  };
}

/**
 * LS will render in this part
 */
function rootElement(element) {
  let root;

  if (typeof element === 'string') {
    root = document.getElementById(element);
  } else {
    root = element;
  }

  root.innerHTML = '';

  return root;
}

/**
 * Function to configure application with callbacks
 * @param {object} params
 */
function configureApplication(params) {
  // callbacks for back compatibility
  const osCB = params.submitAnnotation || params.onSubmitAnnotation;
  const ouCB = params.updateAnnotation || params.onUpdateAnnotation;
  const odCB = params.deleteAnnotation || params.onDeleteAnnotation;

  const options = {
    // communication with the server
    // fetch: params.fetch || Requests.fetcher,
    // patch: params.patch || Requests.patch,
    // post: params.post || Requests.poster,
    // remove: params.remove || Requests.remover,

    // communication with the user
    settings: params.settings || {},
    messages: { ...Messages, ...params.messages },

    // callbacks and event handlers
    onSubmitAnnotation: params.onSubmitAnnotation ? osCB : External.onSubmitAnnotation,
    onUpdateAnnotation: params.onUpdateAnnotation ? ouCB : External.onUpdateAnnotation,
    onDeleteAnnotation: params.onDeleteAnnotation ? odCB : External.onDeleteAnnotation,
    onSkipTask: params.onSkipTask ? params.onSkipTask : External.onSkipTask,
    onUnskipTask: params.onUnskipTask ? params.onUnskipTask : External.onUnskipTask,
    onSubmitDraft: params.onSubmitDraft,
    onPresignUrlForProject: params.onPresignUrlForProject,
    onTaskLoad: params.onTaskLoad || External.onTaskLoad,
    onLabelStudioLoad: params.onLabelStudioLoad || External.onLabelStudioLoad,
    onEntityCreate: params.onEntityCreate || External.onEntityCreate,
    onEntityDelete: params.onEntityDelete || External.onEntityDelete,
    onGroundTruth: params.onGroundTruth || External.onGroundTruth,
    onSelectAnnotation: params.onSelectAnnotation || External.onSelectAnnotation,
    onAcceptAnnotation: params.onAcceptAnnotation || External.onAcceptAnnotation,
    onRejectAnnotation: params.onRejectAnnotation || External.onRejectAnnotation,
    onStorageInitialized: params.onStorageInitialized || External.onStorageInitialized,
    onNextTask: params.onNextTask || External.onNextTask,
    onPrevTask: params.onPrevTask || External.onPrevTask,

    // other settings aka flags
    forceAutoAnnotation: params.forceAutoAnnotation ?? false,
    forceAutoAcceptSuggestions: params.forceAutoAcceptSuggestions ?? false,
  };

  return options;
}

export default { getData, getState, rootElement, configureApplication };

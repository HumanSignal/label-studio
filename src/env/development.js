import { Sentiment } from "../examples/sentiment_analysis";
import { AudioClassification } from "../examples/audio_classification";
import { AudioRegions } from "../examples/audio_regions";
import { ChatbotAnalysis } from "../examples/chatbot_analysis";
import { ImageBbox } from "../examples/image_bbox";
import { NamedEntity } from "../examples/named_entity";
import { References } from "../examples/references";
import { TranscribeAudio } from "../examples/transcribe_audio";

/**
 * Choose data type
 */
let dataType = Sentiment;

function templateDynamicData() {
  let settings = {
    /**
     * For development environment
     */
    developmentEnv: true,
    /**
     * Project ID
     */
    projectID: 1,
    /**
     * Flag to display completion
     */
    viewCompletion: true,
    /**
     * Loading of LS
     */
    isLoading: false,
    /**
     * Expert
     */
    expert: {
      pk: 1,
      lastName: "Jones",
      firstName: "Oliver",
    },
    /**
     * Debug
     */
    debug: window.location.search.indexOf("debug=true") !== -1,
    interfaces: window.editorInterfaces
      ? window.editorInterfaces
      : [
          "controls",
          "predictions",
          "completions",
          "completions:menu",
          "predictions:menu",
          "panel",
          "side-column",
          "update",
          "check-empty",
        ],
    task: {
      data: JSON.stringify(dataType.tasks[0]),
      project: 10,
      id: 100,
      completions: [],
      predictions: [],
    },
  };

  if (settings.viewCompletion && dataType.completion) {
    settings = {
      ...settings,
      task: {
        ...settings.task,
        completions: dataType.completion.completions,
        predictions: dataType.completion.predictions,
      },
    };
  }

  let reqXML = () =>
    fetch(dataType.config)
      .then(resp => resp.text())
      .then(r => {
        settings = {
          ...settings,
          config: r,
        };

        return settings;
      });

  return reqXML();
}

function getData() {
  return templateDynamicData();
}

/**
 * Get completions for task
 */
async function getState() {
  const resp = await getData();
  /**
   * Completions
   */
  const resultCompletions = resp.task.completions ? resp.task.completions : null;
  /**
   * Predictions for Platform
   */
  const resultPredictions = resp.task.predictions ? resp.task.predictions : null;

  return {
    completions: resultCompletions,
    predictions: resultPredictions,
  };
}

/**
 * Function to return Root element
 */
function rootElement() {
  const el = document.createElement("div");

  let root = document.getElementById("label-studio");

  root.innerHTML = "";
  root.appendChild(el);

  root.style.margin = "0 auto";

  return el;
}

export default { getState, getData, rootElement };

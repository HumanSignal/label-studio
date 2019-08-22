import { Sentiment } from "../examples/sentiment_analysis";
import { AudioClassifiaction } from "../examples/audio_classification";
import { AudioRegions } from "../examples/audio_regions";
import { ChatbotAnalysis } from "../examples/chatbot_analysis";
import { ImageBbox } from "../examples/image_bbox";
import { NamedEntity } from "../examples/named_entity";
import { References } from "../examples/references";
import { TranscribeAudio } from "../examples/transcribe_audio";

/**
 * Choose data type
 */
let dataType = AudioClassifiaction;

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
      : ["basic", "completions", "submit", "panel", "side-column", "submit:rewrite"],
    task: {
      data: JSON.stringify(dataType.tasks[0]),
      project: 10,
      id: 100,
      completions: [],
    },
  };

  if (settings.viewCompletion && dataType.completion) {
    settings = {
      ...settings,
      task: {
        ...settings.task,
        completions: dataType.completion.completions,
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
  const resultCompletions = resp.task.completions ? resp.task.completions : null;
  return {
    completions: resultCompletions,
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

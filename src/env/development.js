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
let dataType = AudioRegions;

function templateDynamicData() {
  let settings = {
    projectID: 1,
    isLoading: false,
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
    task: {
      data: JSON.stringify(dataType.tasks[0]),
      project: 10,
      id: 100,
      completions: [],
    },
  };

  if (dataType.completion) {
    settings = {
      ...settings,
      task: {
        ...settings.task,
        completions: [
          {
            result: dataType.completion.completions[0].result,
          },
        ],
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

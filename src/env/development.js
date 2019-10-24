import { Sentiment } from "../examples/sentiment_analysis";
import { AudioClassification } from "../examples/audio_classification";
import { AudioRegions } from "../examples/audio_regions";
import { DialogueAnalysis } from "../examples/dialogue_analysis";
import { ImageBbox } from "../examples/image_bbox";
import { ImagePolygons } from "../examples/image_polygons";
import { ImageKeyPoint } from "../examples/image_keypoints";
import { ImageMultilabel } from "../examples/image_multilabel";
import { NamedEntity } from "../examples/named_entity";
import { References } from "../examples/references";
import { TranscribeAudio } from "../examples/transcribe_audio";

import External from "../core/External";
import Requests from "../core/Requests";

/**
 * Custom Data
 */
const data = ImagePolygons;

/**
 * Get current config
 * @param {string} pathToConfig
 */
async function getConfig(pathToConfig) {
  const response = await fetch(pathToConfig);
  const config = await response.text();
  return config;
}

/**
 * Get custom config
 */
async function getExample() {
  let datatype = data;

  let config = await getConfig(datatype.config);
  let task = {
    data: JSON.stringify(datatype.tasks[0]),
  };
  let completion = datatype.completion.completions[0];

  return { config, task, completion };
}

/**
 * Function to return App element
 */
function rootElement(element) {
  const el = document.createElement("div");

  let root = document.getElementById(element);

  root.innerHTML = "";
  root.appendChild(el);

  root.style.margin = "0 auto";

  return el;
}

/**
 * Function to configure application with callbacks
 * @param {object} params
 */
function configureApplication(params) {
  const options = {
    fetch: Requests.fetcher,
    fetchAuth: Requests.fetcherAuth,
    patch: Requests.patch,
    post: Requests.poster,
    remove: Requests.remover,
    submitCompletion: params.submitCompletion ? params.submitCompletion : External.submitCompletion,
    updateCompletion: params.updateCompletion ? params.updateCompletion : External.updateCompletion,
    deleteCompletion: params.deleteCompletion ? params.deleteCompletion : External.deleteCompletion,
    skipTask: params.skipTask ? params.skipTask : External.skipTask,
    onTaskLoad: params.onTaskLoad ? params.onTaskLoad : External.onTaskLoad,
    onLabelStudioLoad: params.onLabelStudioLoad ? params.onLabelStudioLoad : External.onLabelStudioLoad,
    alert: m => console.log(m), // Noop for demo: window.alert(m)
  };

  return options;
}

export default { rootElement, getExample, configureApplication };

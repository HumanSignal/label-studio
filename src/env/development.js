/**
 * Text
 */
import { Sentiment } from "../examples/sentiment_analysis";
import { NamedEntity } from "../examples/named_entity";
import { References } from "../examples/references";
import { DialogueAnalysis } from "../examples/dialogue_analysis";

/**
 * Audio
 */
import { AudioClassification } from "../examples/audio_classification";
import { AudioRegions } from "../examples/audio_regions";
import { TranscribeAudio } from "../examples/transcribe_audio";

/**
 * Image
 */
import { ImageBbox } from "../examples/image_bbox";
import { ImagePolygons } from "../examples/image_polygons";
import { ImageKeyPoint } from "../examples/image_keypoints";
import { ImageMultilabel } from "../examples/image_multilabel";

/**
 * HTML
 */
import { HTMLDocument } from "../examples/html_document";

/**
 * Different
 */
import { Pairwise } from "../examples/pairwise";

import External from "../core/External";
import Requests from "../core/Requests";
import Messages from "../utils/messages";

/**
 * Custom Data
 */
const data = Sentiment;

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
    data: JSON.stringify(datatype.tasks[0].data),
  };
  let completion = datatype.completion.completions[0];
  let predictions = datatype.tasks[0].predictions;

  return { config, task, completion, predictions };
}

/**
 * Function to return App element
 */
function rootElement(element) {
  const el = document.createElement("div");

  let root = document.getElementById(element);

  root.innerHTML = "";
  root.appendChild(el);

  root.style.width = "auto";

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
    alert: m => console.log(m), // Noop for demo: window.alert(m)
    messages: { ...Messages, ...params.messages },
    onSubmitCompletion: params.onSubmitCompletion ? params.onSubmitCompletion : External.onSubmitCompletion,
    onUpdateCompletion: params.onUpdateCompletion ? params.onUpdateCompletion : External.onUpdateCompletion,
    onDeleteCompletion: params.onDeleteCompletion ? params.onDeleteCompletion : External.onDeleteCompletion,
    onSkipTask: params.onSkipTask ? params.onSkipTask : External.onSkipTask,
    onTaskLoad: params.onTaskLoad ? params.onTaskLoad : External.onTaskLoad,
    onLabelStudioLoad: params.onLabelStudioLoad ? params.onLabelStudioLoad : External.onLabelStudioLoad,
    onEntityCreate: params.onEntityCreate || External.onEntityCreate,
    onEntityDelete: params.onEntityDelete || External.onEntityDelete,
  };

  return options;
}

export default { rootElement, getExample, configureApplication };

---
title: Integrate Label Studio into your machine learning pipeline
short: Machine learning integration
type: guide
tier: all
order: 355
order_enterprise: 305
meta_title: Integrate Label Studio into your machine learning pipeline
meta_description: Machine learning frameworks for integrating your model development pipeline seamlessly with your data labeling workflow.
section: "Machine learning"
---

You can use an ML backend to integrate your model development pipeline with your data labeling workflow. There are several use cases, including: 

- Pre-annotate data with a model
- Use active learning to select the most relevant data for labeling
- Interactive (AI-assisted) labeling
- Model fine-tuning based on recently annotated data

For example, for an image classification task, the model pre-selects an image class for data annotators to verify. For audio transcriptions, the model displays a transcription that data annotators can modify. 

!!! info Tip
    You can use [Label Studio Enterprise to build an automated active learning loop](https://docs.humansignal.com/guide/active_learning.html) with a machine learning model backend. If you use the open source Community Edition of Label Studio, you can manually sort tasks and retrieve predictions to mimic an active learning process.

If you just need to load static pre-annotated data into Label Studio, running an ML backend might be overkill for you. Instead, you can [import preannotated data](predictions).

## Set up an example ML backend

The Label Studio ML backend is an SDK that wraps your machine learning code and turns it into a web server. The web server can be connected to a running Label Studio instance to automate labeling tasks. We have provided a [library of example models](https://github.com/HumanSignal/label-studio-ml-backend?tab=readme-ov-file#models) that you can use in your own workflow, or extend and customize as needed. 

Ir you want to write your own model instead, see [Write your own ML backend](ml_create).

### Prerequisites

<div class="opensource-only">

* [Label Studio](install)
* [Docker Compose](https://docs.docker.com/compose/install/)

</div>

<div class="enterprise-only">

* [Label Studio](install_enterprise)
* [Docker Compose](https://docs.docker.com/compose/install/)

</div>

### Start the model

1. First, decide which [model](#Example-models) you want to use and check for required parameters (click the link for each model to see a full parameter list). 

    Use [`label_studio_ml/default_configs/docker-compose.yml`](https://github.com/HumanSignal/label-studio-ml-backend/blob/master/label_studio_ml/default_configs/docker-compose.yml) for general configuration, and `docker-compose.yml` within the model directory for model-specific parameters. 

2. Then replace `{MODEL_NAME}` in the below command with the appropriate directory:

    ```bash
git clone https://github.com/HumanSignal/label-studio-ml-backend.git
cd label-studio-ml-backend/label_studio_ml/examples/{MODEL_NAME}
docker-compose up
```

The model should begin running at `http://localhost:9090`. You can verify this by clicking **Send Test Request** from the overflow menu next to the model or by using the following command: 

`curl http://localhost:9090/health`

!!! note
    `localhost` is a special domain name that loops back directly to your local environment. In the instance of Docker-hosted containers, this loops back to the container itself, and not the machine the container is hosted on. Docker provides a special domain as a workaround for this, docker.host.internal. If you're hosting Label Studio and your ML Backend inside of Docker, try using that domain instead of localhost. (`http://host.docker.internal:9090`)

If you see any errors, see [Troubleshooting ML Backends & Predictions](https://support.humansignal.com/hc/en-us/sections/23627938255117-ML-Backend-Predictions) in the HumanSignal support center. 

### Connect the model to Label Studio

After you [create a project](setup_project), open the project settings and select **Model**. 

Click **Connect Model** and complete the following fields:

| Field | Description                                                                            |
| -------- | -------------------------------------------------------------------------------------- |
| **Name**   | Enter a name for the model.                        |
| **Backend URL**  | Enter a URL for the model. <br /><br />If you are following the steps above, this would be `http://localhost:9090`.  |
| **Select authentication method**   | If a username and password are required to access the model, you can select **Basic Authentication** and enter them here.                                     |
| **Extra params**  | Enter any additional parameters you want to pass to the model.                                      |
| **Interactive preannotations**  | Enable this option to allow the model to assist with the labeling process by providing real-time predictions or suggestions as annotators work on tasks.  <br /><br />In other words, as you interact with data (for example, by drawing a region on an image, highlighting text, or asking an LLM a question), the ML backend receives this input and returns predictions based on it.  |

!!! info Tip
    You can also [add an ML backend using the API](/api/#operation/api_ml_create). You will need the project ID and the machine learning backend URL. 

## Example models

The following models are available in the [Label Studio ML backend repository](https://github.com/HumanSignal/label-studio-ml-backend/). 

Some of them work without any additional configuration. If the model has required parameters, you can set those parameters in `docker-compose.yml` within the model directory. 

| MODEL_NAME                                                                 | Description                                                                                                                | Required parameters |
|----------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------|---------------------|
| [segment_anything_model](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/segment_anything_model) | General-purpose interactive image segmentation [from Meta](https://segment-anything.com/)                                  | None                |
| [llm_interactive](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/llm_interactive)               | Prompt engineering, data collection and model evaluation workflows for LLM ([OpenAI](https://platform.openai.com/), Azure) | OPENAI_API_KEY      |
| [grounding_dino](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/grounding_dino)                 | Object detection with text prompts ([details](https://github.com/IDEA-Research/GroundingDINO))                             | None                |
| [tesseract](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/tesseract)                           | Optical Character Recognition (OCR) by drawing bounding boxes ([details](https://github.com/tesseract-ocr/tesseract))      | None                |
| [easyocr](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/easyocr)                               | Another OCR tool from [EasyOCR](https://github.com/JaidedAI/EasyOCR)                                                       | None                |
| [spacy](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/spacy)                                   | Named entity recognition model from [SpaCy](https://spacy.io/)                                                             | None                |
| [flair](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/flair)                                   | NLP models by [flair](https://flairnlp.github.io/)                                                                         | None                |
| [huggingface](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/huggingface)                       | NLP models by [Hugging Face](https://huggingface.co/)                                                                      | HF_TOKEN            |
| [nemo](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/nemo)                                     | Speech transcription models by [NVIDIA NeMo](https://github.com/NVIDIA/NeMo)                                               | None                |
| [mmetection](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/mmetection)                         | Object detection models by [OpenMMLab](https://github.com/open-mmlab/mmdetection)                                          | None                |
| [simple_text_classifier](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/simple_text_classifier) | Simple trainable text classification model powered by [scikit-learn](https://scikit-learn.org/stable/)                     | None                |
| [substring_matching](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/substring_matching)         | Select keyword to highlight all occurrences of the keyword in the text                                                     | None                |

## Model training

Training a model allows it to learn from submitted annotations and potentially improve its predictions for subsequent tasks. 

After you connect a model to Label Studio as a machine learning backend and annotate at least one task, you can start training the model. You can use automated or manual training. 

From the **Model** page under project settings, select one of the following:

* **Start model training on annotation submission**--Enable this option for automated training. When enabled, training is automatically initiated every time an annotation is submitted or updated. 
* **Start Training** (Available from the overflow menu next to the connected model)--Manually initiate training. Use this action if you want to control when the model training occurs, such as after a specific number of annotations have been collected or at certain intervals.

You can also initiate training programmatically using the following:

* From the API, specify the ID of the machine learning backend and run the following command: 
   ```
   curl -X POST http://localhost:8080/api/ml/{id}/train
   ```
  See [the Train API documentation](/api/#operation/api_ml_train_create) for more.
- [Trigger training with webhooks](ml_create#Trigger-training-with-webhooks).

In development mode, training logs appear in the web browser console. In production mode, you can find runtime logs in `my_backend/logs/uwsgi.log` and RQ training logs in `my_backend/logs/rq.log` on the server running the ML backend, which might be different from the Label Studio server. 

To see more detailed logs, start the ML backend server with the `--debug` option. 

## Pre-annotations/predictions

!!! note
    The terms "predictions" and pre-annotations" are used interchangeably. 


### Get predictions from a model

After you connect a model to Label Studio, you can see model predictions in the labeling interface if the model is pre-trained, or right after it finishes [training](#Model-training). 

* To manually add predictions, go to the Data Manager, select the tasks you want to get predictions for, and then select **Actions > Retrieve predictions**.
* To automatically pre-label data with predictions, go to the project settings and enable **Annotation > Use predictions to prelabel data**. 


!!! note
    For a large dataset, the HTTP request to retrieve predictions might be interrupted by a timeout. If you want to **get all predictions** for all tasks in a dataset from connected machine learning backends, make a [POST call to the predictions endpoint of the Label Studio API](/api/#operation/api_predictions_create) for each task to prompt the machine learning backend to create predictions for the tasks. 

If you want to retrieve predictions manually for a list of tasks **using only an ML backend**, make a POST request to the `/predict` URL of your ML backend with a payload of the tasks that you want to see predictions for, formatted like the following example: 

```json
{
  "tasks": [
    {"data": {"text":"some text"}}
  ]
}
```

### Interactive pre-annotations

ML-assisted labeling with interactive pre-annotations works with image segmentation and object detection tasks using rectangles, ellipses, polygons, brush masks, and keypoints, as well as with HTML and text named entity recognition tasks. Your ML backend must support the type of labeling that you're performing, recognize the input that you create, and be able to respond with the relevant output for a prediction.

Either enable the **Interactive preannotations** option when adding a model, or use the **Edit** action from the project settings page to enable/disable this option. 

#### Smart tools

For image labeling, you can update your labeling configuration to include the `smart="true"` option for the type of labeling you're performing. Smart tools appear by default if auto-annotation is enabled. If you only want the smart option to appear and don't want to perform manual labeling at all, use `smartOnly="true"`. 

This option is supported for Rectangle, Ellipse, Polygon, Keypoint, and Brush tags. See the [tag documentation](/tags). 
   
1. For your project, open **Settings > Labeling Interface**.
2. Click **Code** to view the XML labeling configuration.
3. For the relevant tag type that you want to use to generate predictions with your ML backend, add the `smart="true"` parameter. For example: 

   ```<Brush name="brush" toName="img" smart="true" showInline="true"/>```
4. Save your changes.
  
After you start labeling, enable **Auto-Annotation** to see and use the smart option to draw a shape, mask, or assign a keypoint. 
   
For image labeling, after you enable auto-annotation you can choose whether to **Auto accept annotation suggestions**. If you automatically accept annotation suggestions, regions show up automatically and are immediately created. If you don't automatically accept suggestions, the regions appear but you can reject or approve them manually, either individually or all at once.

<br/><img src="/images/release-130/predict-owl-region.gif" alt="" class="gif-border" width="800px" height="533px" />
   
### Delete predictions 

If you want to delete all predictions from Label Studio, you can do it using the Data Manager or the API:
- For a specific project, select the tasks that you want to delete predictions for and select **Delete predictions** from the drop-down menu.
- Using the API, run the following from the command line to delete the predictions for a specific project ID:
```
curl -H 'Authorization: Token <user-token-from-account-page>' -X POST \ 
 "<host>/api/dm/actions?id=delete_tasks_predictions&project=<id>"
```

### Choose which predictions to display to annotators

<div class="opensource-only">

You can choose which model or prediction set to display to annotators by default. This is available under the **Annotation > Pre-labeing** in the project settings. 

</div>

<div class="enterprise-only">

You can choose which model or prediction set to display to annotators by default. This is available under the **Annotation > Predictions** in the project settings. 

</div>

Use the drop-down menu to select which model or predictions to use in your labeling workflow. 




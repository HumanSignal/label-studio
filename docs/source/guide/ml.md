---
title: Integrate Label Studio into your machine learning pipeline
short: Machine learning integration
type: guide
order: 606
meta_title: Integrate Label Studio into your machine learning pipeline
meta_description: Connect Label Studio to machine learning frameworks using the Label Studio ML backend SDK to integrate your model development pipeline seamlessly with your data labeling workflow. 
---

Integrate your model development pipeline with your data labeling workflow by adding a machine learning (ML) backend to Label Studio. You can set up your favorite machine learning frameworks to do the following:
- **Pre-labeling** by letting models predict labels and then have annotators perform further manual refinements. 
- **Auto-labeling** by letting models create automatic annotations. 
- **Online Learning** by simultaneously updating your model while new annotations are created, letting you retrain your model on-the-fly. 
- [**Active Learning**](active_learning.html) by selecting example tasks that the model is uncertain how to label for your annotators to label manually. 

If you need to load static pre-annotated data into Label Studio, running an ML backend might be more than you need. Instead, you can [import pre-annotated data](predictions.html).

## How to set up machine learning with Label Studio

Use the Label Studio ML backend to integrate Label Studio with machine learning models. The Label Studio ML backend is an SDK that you can use to wrap your machine learning model code and turn it into a web server. You can then connect that server to a Label Studio instance to perform 2 tasks:
- Dynamically pre-annotate data based on model inference results
- Retrain or fine-tune a model based on recently annotated data

For example, for an image classification task, the model pre-selects an image class for data annotators to verify. For audio transcriptions, the model displays a transcription that data annotators can modify. 

At a high level, do the following: 
1. Set up an ML backend. You can either:
   1. [Start an example ML backend](#Quickstart-with-an-example-ML-backend) or 
   2. [Create your own machine learning backend](ml_create.html) and then [Start your custom ML backend](#Start-your-custom-ML-backend-with-Label-Studio).
2. [Connect Label Studio to the ML backend](#Add-an-ML-backend-to-Label-Studio).

## Quickstart with an example ML backend

Label Studio includes several example machine learning backends with popular machine learning models. See the [machine learning tutorials](ml_tutorials.html). Each example ML backend uses Docker Compose to start running the example ML backend server.

To start an example machine learning backend with Docker Compose, do the following:
1. Make sure port 9090 is available.
2. Clone the Label Studio Machine Learning Backend git repository. From the command line, run the following:
  ```bash
   git clone https://github.com/heartexlabs/label-studio-ml-backend  
   ```
3. Change to the directory with the Docker Compose configuration file. From the command line, run the following:
   ```bash
   cd label-studio-ml-backend/label_studio_ml/examples/simple_text_classifier
   ```
4. Start Docker Compose. From the command line, run the following:
    ```bash
    docker-compose up
    ```
The machine learning backend server starts becomes available at `http://localhost:9090`. You can now [add the machine learning backend to Label Studio](#Add-an-ML-backend-to-Label-Studio) and [set up your project](setup_project.html).

## Start your custom ML backend with Label Studio

After you [create your own machine learning backend](ml_create.html), you can start the ML backend server by following these instructions.

> Use a virtual environment with `venv`, `virtualenv` or `conda` Python environments to run your ML backend. You can use the same environment as Label Studio. See the [Python documentation about creating virtual environments](https://docs.python.org/3/tutorial/venv.html#creating-virtual-environments) for more.

1. Clone the Label Studio Machine Learning Backend git repository. From the command line, run the following:
  ```bash
   git clone https://github.com/heartexlabs/label-studio-ml-backend  
   ```
2. Set up the environment. From the command line, run the following:
   ```bash
   cd label-studio-ml-backend
   
   # Install label-studio-ml and its dependencies
   pip install -U -e .
   
   # Install the dependencies for the example or your custom ML backend
   pip install -r path/to/my_ml_backend/requirements.txt
   ```
3. Initialize your custom ML backend. From the command line, run the following:
   ```bash
   label-studio-ml init my_ml_backend \
     --script path/to/my_ml_backend.py
   ```
4. Start the ML backend server. From the command line, run the following:
   ```bash
   label-studio-ml start my_ml_backend
   ```
   The ML backend server becomes available at `http://localhost:9090`
5. Start Label Studio. From the command line, run the following:
    ```bash
    label-studio start 
    ```
    Label Studio starts at `http://localhost:8080`.

You can now [add the machine learning backend to Label Studio](#Add-an-ML-backend-to-Label-Studio) and [set up your project](setup_project.html).

## Add an ML backend to Label Studio 

After you start a machine learning backend server, add it to your Label Studio project.

### Add an ML backend using the Label Studio UI

1. In the Label Studio UI, open the project that you want to use with your ML backend.
2. Click **Settings > Machine Learning**.
3. Click **Add Model**. 
4. Type a **Title** for the model and provide the URL for the ML backend. For example, `http://localhost:9090`. 
5. (Optional) Type a description.
6. (Optional) Select **Use for interactive preannotation**. See [Get interactive pre-annotations](#Get-interactive-preannotations) for more. 
7. Click **Validate and Save**. 

If you see any errors, see [Troubleshoot machine learning](ml_troubleshooting.html).

### Add an ML backend using the API

Using the project ID and the URL for the machine learning backend, you can also [add an ML backend using the API](/api/#operation/api_ml_create).
   
## Train a model

After you [connect a model to Label Studio as a machine learning backend](#Add-an-ML-backend-to-Label-Studio) and annotate at least one task, you can start training the model. 

You can prompt your model to train in several ways: 
- Manually using the Label Studio UI. Click the **Start Training** button on the **Machine Learning** settings for your project.
- Manually using the API, cURL the API from the command line. Specify the ID of the machine learning backend and run the following command: 
   ```
   curl -X POST http://localhost:8080/api/ml/{id}/train
   ```
  See [the Train API documentation](/api/#operation/api_ml_train_create) for more.
- (Deprecated in version 1.4.1) Automatically after any annotations are submitted or updated. Enable the option `Start model training after annotations submit or update` on the **Machine Learning** settings for your project. This option will be removed in a future version of Label Studio because you can [trigger training with webhooks](ml_create.html#Trigger-training-with-webhooks).

In development mode, training logs appear in the web browser console. In production mode, you can find runtime logs in `my_backend/logs/uwsgi.log` and RQ training logs in `my_backend/logs/rq.log` on the server running the ML backend, which might be different from the Label Studio server. To see more detailed logs, start the ML backend server with the `--debug` option. 

## Get predictions from a model
After you [connect a model to Label Studio as a machine learning backend](#Add-an-ML-backend-to-Label-Studio), you can see model predictions in the labeling interface if the model is pre-trained, or right after it finishes training. 

If the model has not been trained yet, do the following to get predictions to appear:
1. Start labeling data in Label Studio. 
2. Return to the **Machine Learning** settings for your project and click **Start Training** to start training the model.
3. In the data manager for your project, select the tasks that you want to get predictions for and select **Retrieve predictions** using the drop-down actions menu. Label Studio sends the selected tasks to your ML backend. 
4. After retrieving the predictions, they appear in the task preview and Label stream modes for the selected tasks.  

You can also retrieve predictions automatically by loading tasks. To do this, enable `Retrieve predictions when loading a task automatically` on the **Machine Learning** settings for your project. When you scroll through tasks in the data manager for a project, the predictions for those tasks are automatically retrieved from the ML backend. Predictions also appear when labeling tasks in the Label stream workflow.

> Note: For a large dataset, the HTTP request to retrieve predictions might be interrupted by a timeout. If you want to **get all predictions** for all tasks in a dataset from connected machine learning backends, make a [POST call to the predictions endpoint of the Label Studio API](/api/#operation/api_predictions_create) for each task to prompt the machine learning backend to create predictions for the tasks. 

If you want to retrieve predictions manually for a list of tasks **using only an ML backend**, make a POST request to the `/predict` URL of your ML backend with a payload of the tasks that you want to see predictions for, formatted like the following example: 

```json
{
  "tasks": [
    {"data": {"text":"some text"}}
  ]
}
```

### Get interactive preannotations

ML-assisted labeling with interactive preannotations works with image segmentation and object detection tasks using rectangles, ellipses, polygons, brush masks, and keypoints, as well as with HTML and text named entity recognition tasks. Your ML backend must support the type of labeling that you're performing and recognize the input that you create and be able to respond with the relevant output for a prediction.

1. Set up your machine learning backend for ML-assisted labeling.
   1. For your project, open **Settings > Machine Learning**.
   2. Click **Add Model** or select **Edit** for an existing machine learning backend.
   3. Type a **Title** for the machine learning backend.
   4. Enter the **URL** for the running machine learning backend. For example, `http://example.com:9090`.
   5. Enable **Use for interactive preannotation**.
   6. Click **Validate and Save**. 
2. For image labeling, you can update your labeling configuration to include `smart="true"` option for the type of labeling you're performing. Smart tools appear by default if auto-annotation is enabled. <br>This option is supported for Rectangle, Ellipse, Polygon, Keypoint, and Brush tags. See the [tag documentation](/tags). If you only want the smart option to appear and don't want to perform manual labeling at all, use `smartOnly="true"`. 
   1. For your project, open **Settings > Labeling Interface**.
   2. Click **Code** to view the XML labeling configuration.
   3. For the relevant tag type that you want to use to generate predictions with your ML backend, add the `smart="true"` parameter. For example: 
      ```<Brush name="brush" toName="img" smart="true" showInline="true"/>```
   4. Save your changes.
3. After you start labeling, enable **Auto-Annotation** to see and use the smart option to draw a shape, mask, or assign a keypoint. 
4. For image labeling, after you enable auto-annotation you can choose whether to **Auto accept annotation suggestions**. If you automatically accept annotation suggestions, regions show up automatically and are immediately created. If you don't automatically accept suggestions, the regions appear but you can reject or approve them manually, either individually or all at once.

<br/><img src="/images/release-130/predict-owl-region.gif" alt="" class="gif-border" width="800px" height="533px" />
   
### Delete predictions 

If you want to delete all predictions from Label Studio, you can do it using the UI or the API:
- For a specific project, select the tasks that you want to delete predictions for and select **Delete predictions** from the drop-down menu.
- Using the API, run the following from the command line to delete the predictions for a specific project ID:
```
curl -H 'Authorization: Token <user-token-from-account-page>' -X POST \ 
 "<host>/api/dm/actions?id=delete_tasks_predictions&project=<id>"
```

### Choose which predictions to display to annotators

You can choose which model predictions to display to annotators by default. 

1. For a specific project, open the **Settings** and select **Machine Learning**.
2. Under **Model Version**, select the version of the model that you want to use to display predictions to annotators by default. Your changes save automatically. 

The model version can be specified in [imported pre-annotations](predictions.html), multiple versions of one connected ML backend, or multiple connected ML backends. 

When annotators start labeling, they'll see the predictions from that model version for each task, which they can then modify as needed. If there are no predictions for a task from the model version selected, no predictions display to the annotator even if another model version has predictions for the task. 

## About the Label Studio ML backend
The Label Studio machine learning server uses [uWSGI](https://uwsgi-docs.readthedocs.io/en/latest/) and [supervisord](http://supervisord.org/) and handles background training jobs with [RQ](https://python-rq.org/).
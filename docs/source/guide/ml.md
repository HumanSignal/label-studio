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

Integrate your model development pipeline with your data labeling workflow by adding a machine learning (ML) backend to Label Studio. You can set up your favorite machine learning frameworks to do the following:
- **Pre-labeling** by letting models predict labels and then have annotators perform further manual refinements. 
- **Auto-labeling** by letting models create automatic annotations. 
- **Online Learning** by simultaneously updating your model while new annotations are created, letting you retrain your model on-the-fly. 
- **Active Learning** by selecting example tasks that the model is uncertain how to label for your annotators to label manually.

For example, for an image classification task, the model pre-selects an image class for data annotators to verify. For audio transcriptions, the model displays a transcription that data annotators can modify. 

!!! note
    Use [Label Studio Enterprise to build an automated active learning loop](https://docs.humansignal.com/guide/active_learning.html) with a machine learning model backend. If you use the open source Community Edition of Label Studio, you can manually sort tasks and retrieve predictions to mimic an active learning process.


At a high level, you'll need to do the following: 

1. Set up an ML backend. You can either:
   - [Start an example ML backend](#Quickstart-with-an-example-ML-backend) or 
   - [Create your own machine learning backend](ml_create)
2. [Connect Label Studio to the ML backend](#Add-an-ML-backend-to-Label-Studio).

## Quickstart with an example ML backend

Label Studio includes several example machine learning backends with popular machine learning models. See the [machine learning tutorials](ml_tutorials.html). Each example ML backend uses Docker Compose to start running the example ML backend server.

To start an example machine learning backend with Docker Compose, complete the following steps:

1. Make sure port 9090 is available. For information changing ports, see [Modify the port](ml_create#Modify-the-port).
2. Clone the Label Studio Machine Learning Backend git repository:  
  ```bash
   git clone https://github.com/HumanSignal/label-studio-ml-backend.git 
   ```
1. Change to the directory with the Docker Compose configuration file:
   ```bash
   cd label-studio-ml-backend/label_studio_ml/examples/the_simplest_ml_backend
   ```
2. Start Docker Compose:
    ```bash
    docker-compose up
    ```

You can access the machine learning backend server at `http://localhost:9090`. You can also use this URL to add the machine learning backend to Label Studio (see below).

!!! note
    `localhost` is a special domain name that loops back directly to your local environment. In the instance of Docker-hosted containers, this loops back to the container itself, and not the computer the container is hosted on. Docker provides a special domain as a workaround for this, docker.host.internal. If you're hosting Label Studio and your ML Backend inside of Docker, try using that domain instead of localhost. (`http://host.docker.internal:9090`)

For information on creating a custom ML backend, see [Write your own ML backend](ml_create). 



## Add an ML backend to Label Studio 

After you start the machine learning backend server, add it to your Label Studio project:

1. From Label Studio, open the project that you want to use with your ML backend.
2. Select **Settings > Machine Learning**.
3. Click **Add Model**. 
4. Enter a title for the model and provide the URL for the ML backend. For example, `http://localhost:9090`. 
5. (Optional) Enter a description.
6. (Optional) Select **Allow version auto-update**. See [Version auto-update](#Enable-auto-update-for-a-model) for more.
7. (Optional) Select **Use for interactive preannotation**. See [Get interactive pre-annotations](#Get-interactive-preannotations) for more.
8. Click **Validate and Save**. 

If you see any errors, see [Troubleshoot machine learning](ml_troubleshooting.html).

!!! note
    You can also [add an ML backend using the API](/api/#operation/api_ml_create). You will need the project ID and the machine learning backend URL. 
   
## Train a model

After you connect a model to Label Studio as a machine learning backend and annotate at least one task, you can start training the model. 

You can prompt your model to train in several ways: 
- Manually using the Label Studio UI. Click **Start Training** on the **Machine Learning** settings for your project.
- Manually using the API. Specify the ID of the machine learning backend and run the following command: 
   ```
   curl -X POST http://localhost:8080/api/ml/{id}/train
   ```
  See [the Train API documentation](/api/#operation/api_ml_train_create) for more.
- [Trigger training with webhooks](ml_create.html#Trigger-training-with-webhooks).

In development mode, training logs appear in the web browser console. In production mode, you can find runtime logs in `my_backend/logs/uwsgi.log` and RQ training logs in `my_backend/logs/rq.log` on the server running the ML backend, which might be different from the Label Studio server. To see more detailed logs, start the ML backend server with the `--debug` option. 

## Get predictions from a model
After you connect a model to Label Studio as a machine learning backend, you can see model predictions in the labeling interface if the model is pre-trained, or right after it finishes training. 

If the model has not been trained yet, do the following to get predictions to appear:
1. Start labeling data in Label Studio. 
2. Return to the **Machine Learning** settings for your project and click **Start Training** to start training the model.
3. In the data manager for your project, select the tasks that you want to get predictions for and select **Retrieve predictions** using the drop-down actions menu. Label Studio sends the selected tasks to your ML backend. 
4. After retrieving the predictions, they appear in the task preview and Label stream modes for the selected tasks.  

You can also retrieve predictions automatically by loading tasks. To do this, enable `Retrieve predictions when loading a task automatically` on the **Machine Learning** settings for your project. When you scroll through tasks in the data manager for a project, the predictions for those tasks are automatically retrieved from the ML backend. Predictions also appear when labeling tasks in the Label stream workflow.

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
### Enable auto-update for a model
Enabling model auto-update allows automatic retraining of your model every time a new annotation is submitted. To enable auto-update, do the following:

Either enable the **Allow version auto-update** option when adding a model, or:
1. In the Label Studio UI, open the project that you want to use with your ML backend.
2. Select **Settings > Machine Learning**.
3. For the connected model you wish to enable, click **Edit** in the overflow menu.
4. Enable **Allow version auto-update**.
5. Click **Validate and Save**.

### Get interactive pre-annotations

ML-assisted labeling with interactive pre-annotations works with image segmentation and object detection tasks using rectangles, ellipses, polygons, brush masks, and keypoints, as well as with HTML and text named entity recognition tasks. Your ML backend must support the type of labeling that you're performing, recognize the input that you create, and be able to respond with the relevant output for a prediction.

Either enable the **Use for interactive preannotation** option when adding a model, or:

1. In the Label Studio UI, open the project that you want to use with your ML backend.
2. Select **Settings > Machine Learning**.
3. For the connected model you wish to enable, click **Edit** in the overflow menu.
4. Enable **Use for interactive preannotation**.
5. Click **Validate and Save**.

For image labeling, you can update your labeling configuration to include `smart="true"` option for the type of labeling you're performing. Smart tools appear by default if auto-annotation is enabled. If you only want the smart option to appear and don't want to perform manual labeling at all, use `smartOnly="true"`. 

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



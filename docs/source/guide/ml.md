---
title: Set up machine learning
short: Machine learning setup
type: guide
order: 606
meta_title: Set up machine learning with Label Studio
meta_description: Connect Label Studio to machine learning frameworks using the Label Studio ML backend SDK to integrate your model development pipeline seamlessly with your data labeling workflow. 
---

Set up machine learning with your labeling process by setting up a machine learning backend for Label Studio. 

With Label Studio, you can set up your favorite machine learning models to do the following:
- **Pre-labeling** by letting models predict labels and then perform further manual refinements. 
- **Auto-labeling** by letting models create automatic annotations. 
- **Online Learning** by simultaneously updating your model while new annotations are created, letting you retrain your model on-the-fly. 
- **Active Learning** by selecting example tasks that the model is uncertain how to label for your annotators to label. 

With these capabilities, you can use Label Studio as part of a production-ready prediction service. 

## How to set up machine learning with Label Studio?

Use the Label Studio ML backend to integrate Label Studio with machine learning models. The Label Studio ML backend is an SDK that you can use to wrap your machine learning code and turn it into a web server. You can then connect that server to a Label Studio instance to perform 2 tasks:
- Dynamically pre-annotate data based on model inference results
- Retrain or fine-tune a model based on recently annotated data
For example, for an image classification task, the model pre-selects an image class for data annotators to verify. For audio transcriptions, the model displays a transcription that data annotators can modify. If you need to load static pre-annotated data into Label Studio, running an ML backend might be more than you need. Instead, you can [import pre-annotated data](predictions.html).
  

To set up a Label Studio ML backend, perform the following steps:
1. Get your model code, either by writing one from scratch or using an existing model.
2. Wrap it with the [Label Studio SDK](ml_create.html).
3. Create a running server script.
4. Launch the script.
5. Connect Label Studio to the ML backend on the UI.
For an example, follow the [Quickstart](#Quickstart). For help with steps 1-3, see how to [create your own machine learning backend](ml_create.html).

## Quickstart

Get started with a machine learning (ML) backend with Label Studio. You need to start both the machine learning backend and Label Studio to start labeling. You can review examples in the [`label-studio-ml/examples` section of the Label Studio ML backend repository](https://github.com/heartexlabs/label-studio-ml-backend/tree/master/label_studio_ml/examples) or in the [machine learning tutorials](ml_tutorials.html).

Follow these steps to set up an example text classifier ML backend with Label Studio:

1. Clone the Label Studio Machine Learning Backend git repository.
  ```bash
   git clone https://github.com/heartexlabs/label-studio-ml-backend  
   ```
   
2. Set up the environment.
    
   It is highly recommended to use `venv`, `virtualenv` or `conda` python environments. You can use the same environment as Label Studio. [Read more in the Python documentation](https://docs.python.org/3/tutorial/venv.html#creating-virtual-environments) about creating virtual environments via `venv`.
   
   ```bash
   cd label-studio-ml-backend
   
   # Install label-studio-ml and its dependencies
   pip install -U -e .
   
   # Install example dependencies
   pip install -r label_studio_ml/examples/requirements.txt
   ```
   
3. Initialize an ML backend based on an example script:
   ```bash
   label-studio-ml init my_ml_backend \
     --script label_studio_ml/examples/simple_text_classifier.py
   ```
   This ML backend is an example provided by Label Studio. See [how to create your own ML backend](ml_create.html).
   
3. Start the ML backend server.
   ```bash
   label-studio-ml start my_ml_backend
   ```
   
4. Start Label Studio. Run the following:
```bash
label-studio start 
```

5. Create a project and import text data. Set up the labeling interface to use the **Text Classification** template. 

6. In the **Machine Learning** section of the project settings page, add the link `http://localhost:9090` to your machine learning model backend. 

<br>
<center><img src="/images/ml-backend-card.png"></center>

If you run into any issues, see [Troubleshoot machine learning](ml_troubleshooting.html)

   
## Train a model

After you connect a model to Label Studio as a machine learning backend, you can start training the model: 
- Manually using the Label Studio UI, click the **Start Training** button on the **Machine Learning** settings for your project.
- Automatically after any annotations are submitted or updated, enable the option `Start model training after annotations submit or update` on the **Machine Learning** settings for your project.
- Manually using the API, cURL the API from the command line, specifying the ID of the machine learning backend: 
   ```
   curl -X POST http://localhost:8080/api/ml/{id}/train
   ```
  See [the Train API documentation](/api/#operation/api_ml_train_create) for more.

You must have at least one task annotated before you can start training. 

In development mode, training logs appear in the web browser console. In production mode, you can find runtime logs in `my_backend/logs/uwsgi.log` and RQ training logs in `my_backend/logs/rq.log` on the server running the ML backend, which might be different from the Label Studio server. To see more detailed logs, start the ML backend server with the `--debug` option. 

## Get predictions from a model
After you connect a model to Label Studio as a machine learning backend, you can see model predictions in the labeling interface if the model is pre-trained, or right after it finishes training. 

If the model has not been trained yet, do the following to get predictions to appear:
1. Start labeling data in Label Studio. 
2. Return to the **Machine Learning** settings for your project and click **Start Training** to start training the model.
3. In the data manager for your project, select the tasks that you want to get predictions for and select **Retrieve predictions** using the drop-down actions menu. Label Studio sends the selected tasks to your ML backend. 
4. After retrieving the predictions, they appear in the task preview and Label stream modes for the selected tasks.  

You can also retrieve predictions automatically by loading tasks. To do this, enable `Retrieve predictions when loading a task automatically` on the **Machine Learning** settings for your project. When you scroll through tasks in the data manager for a project, the predictions for those tasks are automatically retrieved from the ML backend. Predictions also appear when labeling tasks in the Label stream workflow.

> Note: For a large dataset, the HTTP request to retrieve predictions might be interrupted by a timeout. If you want to **get all predictions** for all tasks in a dataset from connected machine learning backends, make a [POST call to the predictions endpoint of the Label Studio API](/api/#operation/api_predictions_create) to prompt the machine learning backend to create predictions for the tasks. 

If you want to retrieve predictions manually for a list of tasks **using only an ML backend**, make a GET request to the `/predict` URL of your ML backend with a payload of the tasks that you want to see predictions for, formatted like the following example: 

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
   
## Set up a machine learning backend with Docker Compose
Label Studio includes everything you need to set up a production-ready ML backend server powered by Docker. 

The Label Studio machine learning server uses [uWSGI](https://uwsgi-docs.readthedocs.io/en/latest/) and [supervisord](http://supervisord.org/) and handles background training jobs with [RQ](https://python-rq.org/).

### Prerequisites
Perform these prerequisites to make sure your server starts successfully. 
1. Specify all requirements in a `my-ml-backend/requirements.txt` file. For example, to specify scikit-learn as a requirement for your model, do the following:
    ```requirements.txt
    scikit-learn
    ```
2. Make sure ports 9090 and 6379 are available and do not have services running on them. To use different ports, update the default ports in `my-ml-backend/docker-compose.yml`, created after you start the machine learning backend.

### Start with Docker Compose

1. Start the machine learning backend with an example model or your [custom machine learning backend](mlbackend.html).
    ```bash
    label-studio-ml init my-ml-backend --script label_studio-ml/examples/simple_text_classifier.py
    ```
    You see configurations in the `my-ml-backend/` directory that you need to build and run a Docker image using Docker Compose.

2. From the `my-ml-backend/` directory, start Docker Compose.
    ```bash
    docker-compose up
    ```
    The machine learning backend server starts listening on port 9090.

3. Connect the machine learning backend to Label Studio on the **Machine Learning** settings for your project in Label Studio UI.

If you run into any issues, see [Troubleshoot machine learning](ml_troubleshooting.html)


## Active Learning
The process of creating annotated training data for supervised machine learning models is often expensive and time-consuming. Active Learning is a branch of machine learning that seeks to **minimize the total amount of data required for labeling by strategically sampling observations** that provide new insight into the problem. In particular, Active Learning algorithms aim to select diverse and informative data for annotation, rather than random observations, from a pool of unlabeled data using **prediction scores**. For more theory read [our article on Towards data science](https://towardsdatascience.com/learn-faster-with-smarter-data-labeling-15d0272614c4).

You can select a task ordering like `Predictions score` on Data manager and the sampling strategy will fit the active learning scenario. Label Studio will send a train signal to ML Backend automatically on each annotation submit/update. You can enable these train signals on the **machine learning** settings page for your project. 

* If you need to retrieve and save predictions for all tasks, check recommendations for [retrieving predictions from a model](ml.html#Get-predictions-from-a-model).
* If you want to delete all predictions after your model is retrained, see how to [delete predictions](ml.html#Delete-predictions). 
  
<br>
<img src="/images/ml-backend-active-learning.png" style="border:1px #eee solid">

---
title: Set up machine learning with your labeling process
type: guide
order: 606
meta_title: Machine Learning SDK
meta_description: Label Studio Documentation for connecting Label Studio to machine learning frameworks using the Label Studio machine learning SDK for machine learning and data science projects.
---

Set up machine learning with your labeling process by setting up a machine learning backend for Label Studio. 

With Label Studio, you can set up your favorite machine learning models to do the following:
- **Pre-labeling** by letting models predict labels and then perform further manual refinements. 
- **Auto-labeling** by letting models create automatic annotations. 
- **Online Learning** by simultaneously updating your model while new annotations are created, letting you retrain your model on-the-fly. 
- **Active Learning** by selecting example tasks that the model is uncertain how to label for your annotators to label. 

With these capabilities, you can use Label Studio as part of a production-ready **Prediction Service**. 

## Quickstart

Get started with a machine learning (ML) backend with Label Studio. You need to start both the machine learning backend and Label Studio to start labeling. You can review examples in the [`label-studio-ml/examples` section of the repository](https://github.com/heartexlabs/label-studio-ml/examples).

Follow these steps to set up an example text classifier ML backend with Label Studio:

0. Clone the Label Studio Machine Learning Backend git repository.
   ```bash
   git clone https://github.com/heartexlabs/label-studio-ml-backend 
   ```
   
1. Set up the environment.
   ```bash
   cd label-studio-ml-backend
   pip install -e .
   cd label_studio_ml/examples
   pip install -r requirements.txt
   ```
   
2. Create a new ML backend using the example simple text classifier included in the repository. 
   ```bash
   label-studio-ml init my_ml_backend --script label_studio-ml/examples/simple_text_classifier.py
   ```
   
3. Start the ML backend server.
   ```bash
   label-studio-ml start my_ml_backend
   ```
   
4. Start Label Studio and connect your project to the running ML backend using the Label Studio UI. 


## Tutorials

For other example machine learning model setups with Label Studio, see the following tutorials:
- [Create a simple ML backend](/tutorials/dummy_model.html)
- [Text classification with Scikit-Learn](/tutorials/sklearn-text-classifier.html)
- [Transfer learning for images with PyTorch](/tutorials/pytorch-image-transfer-learning.html)
- [Image Object Detector](/tutorials/object-detector.html)
- [Chatbot response generation with HuggingFace's GPT2 model](/tutorials/gpt.html)
- [Automatic Speech Recognition with Nvidia's NeMo](/tutorials/nemo_asr.html)

## Getting predictions from a machine learning model

After connecting a model as a machine learning backend, you see model predictions in the labeling interface and on the Tasks page that you use to manage your data.

For example, for an image classification task, the model pre-selects an image class for data labelers to verify. 

You can also get a prediction for specific data using the API. For example, to get a prediction for task data of `{"text":"some text"}` from a Label Studio installation accessible at `http://localhost:8080`, run the following cURL command: 

   ```
    curl -X POST -d '{"text":"some text"}' -H "Content-Type: application/json" http://localhost:8080/api/models/predictions
   ```

   
### Train a model with Label Studio 

After you connect a model to Label Studio as a machine learning backend, you can start model training from the UI or using the API. 

- On the Label Studio UI, click the **Start Training** button on the `/model` page.
- cURL the API from the command line: 
   ```
   curl -X POST http://localhost:8080/api/models/train
   ```

In development mode, training logs appear in the web browser console. 
In production mode, you can find runtime logs in `my_backend/logs/uwsgi.log` and RQ training logs in `my_backend/logs/rq.log`. 

   
## Set up a machine learning backend for Label Studio with Docker Compose
Label Studio includes everything you need to set up a production-ready ML backend server powered by Docker. 

The Label Studio machine learning server uses [uWSGI](https://uwsgi-docs.readthedocs.io/en/latest/) and [supervisord](http://supervisord.org/) and handles background training jobs with [RQ](https://python-rq.org/).

### Prerequisites
Perform these prerequisites to make sure your server starts successfully. 
1. Specify all requirements in a `my-ml-backend/requirements.txt` file. For example, to specify scikit-learn as a requirement for your model, do the following:
    ```requirements.txt
    scikit-learn
    ```
2. Make sure ports 9090 and 6379 are available and do not have services running on them. To use different ports, update the default ports in `my-ml-backend/docker-compose.yml`, created after you start the machine learning backend.

### Start a machine learning backend with Docker Compose

1. Start the machine learning backend with an example model, or your custom machine learning backend.
    ```bash
    label-studio-ml init my-ml-backend --script label_studio-ml/examples/simple_text_classifier.py
    ```
    You see configurations in the `my-ml-backend/` directory that you need to build and run a Docker image using Docker Compose.

2. From the `my-ml-backend/` directory, start Docker Compose.
    ```bash
    docker-compose up
    ```
    The machine learning backend server starts listening on port 9090.

3. Connect the machine learning backend to Label Studio on the **Model** page in Label Studio UI, or use the following command on the command line:
    ```bash
    label-studio start text_classification_project --init --template text_classification --ml-backends http://localhost:9090
    ```

## Active Learning

The process of creating annotated training data for supervised machine learning models is often expensive and time-consuming. Active Learning is a branch of machine learning that seeks to **minimize the total amount of data required for labeling by strategically sampling observations** that provide new insight into the problem. In particular, Active Learning algorithms aim to select diverse and informative data for annotation, rather than random observations, from a pool of unlabeled data using **prediction scores**. 

Depending on score types you can select a sampling strategy: 
* prediction-score-min (min is the best score) 
 
See more about active learning sampling in [Set up task sampling for your project](start.html#Set-up-task-sampling-for-your-project). 

## Troubleshooting

When you encounter any error, there are several hints to get more insights. You can investigate most problems using the server console log. The machine learning backend runs as a separate server from Label Studio, so make sure you check the correct server console logs while troubleshooting.

> Note: When you start an ML backend using Docker Compose, the logs are located in:
> - main process / inference logs: logs/uwsgi.log
> - training logs: logs/rq.log

### I launched the ML backend, but it appears as **Disconnected** after adding it in the Label Studio UI

Your ML backend server might not have started properly. 

1. First, try to do a health check by running the following:<br/> `curl -X GET http://localhost:9090/health`
2. If the health check doesn't respond, or you see errors, check the server logs. 
3. If you used Docker Compose to start the ML backend, check for requirements missing from the `requirements.txt` file used to set up the environment inside Docker.

### The ML backend seems to be connected, but after I click "Start Training", I see "Error. Click here for details." message

Check for the traceback after you click on the error message. Some common errors are an insufficient amount of annotations made or memory issues.
If you can't resolve them by yourself, <a href="https://join.slack.com/t/label-studio/shared_invite/zt-cr8b7ygm-6L45z7biEBw4HXa5A2b5pw">contact us on Slack</a>.

### My predictions are wrong or I can't see the model prediction results on the labeling page

Most likely, the format of the predictions you're trying to view are incorrect. The ML backend predictions format follows the same structure as [predictions in imported preannotations](predictions.html).







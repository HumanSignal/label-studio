---
title: Set up machine learning with Label Studio
type: guide
order: 606
meta_title: Machine Learning Integration
meta_description: Label Studio Documentation for connecting Label Studio to machine learning frameworks using the Label Studio machine learning SDK for machine learning and data science projects.
---

Set up machine learning with your labeling process by setting up a machine learning backend for Label Studio. 

With Label Studio, you can set up your favorite machine learning models to do the following:
- **Pre-labeling** by letting models predict labels and then perform further manual refinements. 
- **Auto-labeling** by letting models create automatic annotations. 
- **Online Learning** by simultaneously updating your model while new annotations are created, letting you retrain your model on-the-fly. 
- **Active Learning** by selecting example tasks that the model is uncertain how to label for your annotators to label. 

With these capabilities, you can use Label Studio as part of a production-ready **Prediction Service**. 

## What is the Label Studio ML backend?

The Label Studio ML backend is an SDK that you can use to wrap your machine learning code and turn it into a web server. You can then connect that server to a Label Studio instance to perform 2 tasks:
- Dynamically pre-annotate data based on model inference results
- Retrain or fine-tune a model based on recently annotated data

The overall steps of setting up a Label Studio ML backend are as follows:
1. Get your model code.
2. Wrap it with the [Label Studio SDK](mlbackend.html).
3. Create a running server script
4. Launch the script
5. Connect Label Studio to ML backend on the UI
Follow the [Quickstart](#Quickstart) for an example. For assistance with steps 1-3, see how to [create your own machine learning backend](mlbackend.html).

If you need to load static pre-annotated data into Label Studio, running an ML backend might be more than you need. Instead, you can [import pre-annotated data](predictions.html).

## Quickstart

Get started with a machine learning (ML) backend with Label Studio. You need to start both the machine learning backend and Label Studio to start labeling. You can review examples in the [`label-studio-ml/examples` section of the repository](https://github.com/heartexlabs/label-studio-ml-backend/tree/master/label_studio_ml/examples).

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
   label-studio-ml init my_ml_backend --script label_studio_ml/examples/simple_text_classifier.py
   ```
   This ML backend is an example provided by Label Studio. See [how to create your own ML backend](mlbackend.html).
   
3. Start the ML backend server.
   ```bash
   label-studio start text_classification_project --init --ml-backends http://localhost:9090
   ```
   
4. Start Label Studio.
   
5. In the project settings, set up the labeling interface to use the **Text Classification** template. 

6. In the **Machine Learning** section of the project settings page, add the link to your machine learning model backend. 

## Get predictions from a machine learning model
After you connect a model to Label Studio as a machine learning backend, you can see model predictions in the labeling interface if the model is pre-trained. 

If the model has not been trained yet, do the following to get predictions to appear:
1. Start labeling data in Label Studio. 
2. Return to the machine learning settings for your project and **Start Training** the model.
3. After training starts, predictions appear in the labeling interface. 

Predictions only appear while labeling tasks. For example, for an image classification task, the model pre-selects an image class for data annotators to verify. For audio transcriptions, the model displays a transcription that data annotators can modify.

If you want to see predictions on the list of tasks and when previewing tasks, make a GET request to the `/predict` URL of your ML backend with a payload of the tasks that you want to see predictions for, formatted like the following example: `{"tasks": [{"data": {"text":"some text"}}]}`.
   
## Train a model with Label Studio 

After you connect a model to Label Studio as a machine learning backend, you can start model training from the UI or using the API. 

- On the Label Studio UI, click the **Start Training** button on the **Machine Learning** settings for your project.
- cURL the API from the command line, specifying the ID of your project: 
   ```
   curl -X POST http://localhost:8080/api/ml/{id}/train
   ```
You must have some annotated tasks before you can start training.  

In development mode, training logs appear in the web browser console. 
In production mode, you can find runtime logs in `my_backend/logs/uwsgi.log` and RQ training logs in `my_backend/logs/rq.log` on the server running the ML backend, which might be different from the Label Studio server. To see more detailed logs, start the ML backend server with the `--debug` option. 
   
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

3. Connect the machine learning backend to Label Studio on the **Machine Learning** settings for your project in Label Studio UI, or use the following command on the command line:
    ```bash
    label-studio start --ml-backends http://localhost:9090
    ```

## Active Learning
The process of creating annotated training data for supervised machine learning models is often expensive and time-consuming. Active Learning is a branch of machine learning that seeks to **minimize the total amount of data required for labeling by strategically sampling observations** that provide new insight into the problem. In particular, Active Learning algorithms aim to select diverse and informative data for annotation, rather than random observations, from a pool of unlabeled data using **prediction scores**. 

You can select a sampling strategy like `prediction-score-min`, where min is the best score. See more about active learning sampling in [Set up task sampling for your project](guide/start.html#Set-up-task-sampling-for-your-project). You can also sort and manage the labeling order on an ad hoc basis by predictions. See [Label and annotate data in Label Studio](labeling.html).

## Troubleshooting

If you encounter any errors, review these troubleshooting steps and possible causes. 

### Troubleshoot by reviewing the ML server logs
You can investigate most problems using the server console log. The machine learning backend runs as a separate server from Label Studio, so make sure you check the correct server console logs while troubleshooting. To see more detailed logs, start the ML backend server with the `--debug` option. 

If you're running an ML backend: 
- Production training logs are located in `my_backend/logs/rq.log`
- Production runtime logs are located in `my_backend/logs/uwsgi.log`
In development mode, training logs appear in the web browser console. 

If you're running an ML backend using Docker Compose:
- Training logs are located in `logs/rq.log`
- Main process and inference logs are located in `logs/uwsgi.log`

### I launched the ML backend, but it appears as **Disconnected** after adding it in the Label Studio UI

Your ML backend server might not have started properly. 

1. Check whether the ML backend server is running. Run the following health check:<br/> `curl -X GET http://localhost:9090/health`
2. If the health check doesn't respond, or you see errors, check the server logs.
3. If you used Docker Compose to start the ML backend, check for requirements missing from the `requirements.txt` file used to set up the environment inside Docker.

### The ML backend seems to be connected, but after I click "Start Training", I see "Error. Click here for details." message

Click the error message to review the traceback. Common errors that you might see include:
- Insufficient number of annotations completed for training to begin.
- Memory issues on the server. 
If you can't resolve the traceback issues by yourself, <a href="https://join.slack.com/t/label-studio/shared_invite/zt-cr8b7ygm-6L45z7biEBw4HXa5A2b5pw">contact us on Slack</a>.

### My predictions are wrong or I don't see the model prediction results on the labeling page

Your ML backend might be producing predictions in the wrong format. 

- Check to see whether the ML backend predictions format follows the same structure as [predictions in imported pre-annotations](predictions.html).
- Confirm that your project's label configuration matches the output produced by your ML backend. For example, use the Choices tag to create a class of predictions for text. See more [Label Studio tags](/tags.html). 

### The model backend fails to start or run properly
If you see errors about missing packages in the terminal after starting your ML backend server, or in the logs, you might need to specify additional packages in the `requirements.txt` file for your ML backend.

### ML backend is unable to access tasks
Because the ML backend and Label Studio are different services, the assets (images, audio, etc.) that you label must be hosted and be accessible with URLs by the machine learning backend, otherwise it might fail to create predictions.

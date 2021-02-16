---
title: Machine learning backend
type: guide
order: 906
---

You can easily connect your favorite machine learning framework with Label Studio Machine Learning SDK. 

That gives you the opportunities to use:
- **Pre-labeling**: Use model predictions for pre-labeling (e.g. make use of on-the-fly model predictions for creating rough image segmentations for further manual refinements)
- **Autolabeling**: Create automatic annotations
- **Online Learning**: Simultaneously update (retrain) your model while new annotations are coming
- **Active Learning**: Perform labeling in active learning mode - select examples model is uncertain about
- **Prediction Service**: Instantly create running production-ready prediction service


## Tutorials

- [Create the simplest ML backend](/tutorials/dummy_model.html)
- [Text classification with Scikit-Learn](/tutorials/sklearn-text-classifier.html)
- [Transfer learning for images with PyTorch](/tutorials/pytorch-image-transfer-learning.html)
- [Image Object Detector](/tutorials/object-detector.html)
- [Chatbot response generation with HuggingFace's GPT2 model](/tutorials/gpt.html)
- [Automatic Speech Recognition with Nvidia's NeMo](/tutorials/nemo_asr.html)

#### Create ML backend

Check examples in [`label-studio/ml/examples`](https://github.com/heartexlabs/label-studio/tree/master/label_studio/ml/examples) directory.

## Quickstart

Here is a quick example tutorial on how to run the ML backend with a simple text classifier:

0. Clone repo
   ```bash
   git clone https://github.com/heartexlabs/label-studio  
   ```
   
1. Setup environment
   ```bash
   cd label-studio
   pip install -e .
   cd label_studio/ml/examples
   pip install -r requirements.txt
   ```
   
2. Create new ML backend
   ```bash
   label-studio-ml init my_ml_backend --script label_studio/ml/examples/simple_text_classifier.py
   ```
   
3. Start ML backend server
   ```bash
   label-studio-ml start my_ml_backend
   ```
   
4. Run Label Studio connecting it to the running ML backend:
    ```bash
    label-studio start text_classification_project --init --template text_sentiment --ml-backends http://localhost:9090
    ```
    To confirm that the model was properly connected go to `/model` page in the Label Studio webapp.

### Getting predictions

   You should see model predictions in the labeling interface and Tasks page (/tasks). For example in an image classification task: the model will pre-select an image class for you to verify.
   
   Also you can obtain a prediction via Label Studio Backend working on `http://localhost:8080`:
    
   ```
    curl -X POST -d '{"text":"some text"}' -H "Content-Type: application/json" http://localhost:8080/api/models/predictions
   ```

   where `{"text":"some text"}` is your task data. 
   
### Model training

   Model training can be triggered manually by pushing the Start Training button on the `/model` page, or by using an API call:
   ```
   curl -X POST http://localhost:8080/api/models/train
   ```
   In development mode, training logs show up in the console. In production mode, runtime logs are available in    
   `my_backend/logs/uwsgi.log` and RQ training logs in `my_backend/logs/rq.log`
   
## Start with docker compose
Label Studio ML scripts include everything you need to create a production ready ML backend server, powered by docker. It uses [uWSGI](https://uwsgi-docs.readthedocs.io/en/latest/) + [supervisord](http://supervisord.org/) stack, and handles background training jobs using [RQ](https://python-rq.org/).
After running this command:

```bash
label-studio-ml init my-ml-backend --script label_studio/ml/examples/simple_text_classifier.py
```

you'll see configs in `my-ml-backend/` directory needed to build and run docker image using docker-compose. 

Some preliminaries:

1. Ensure all requirements are specified in `my-ml-backend/requirements.txt` file, e.g. place

    ```requirements.txt
    scikit-learn
    ```
   
2. There are no services currently running on ports 9090, 6379 (otherwise change default ports in `my-ml-backend/docker-compose.yml`)

Then from `my-ml-backend/` directory run
```bash
docker-compose up
```

The server starts listening on port 9090, and you can connect it to Label Studio by specifying `--ml-backends http://localhost:9090` or via UI on the **Model** page.

## Active Learning

The process of creating annotated training data for supervised machine learning models is often expensive and time-consuming. Active Learning is a branch of machine learning that **seeks to minimize the total amount of data required for labeling by strategically sampling observations** that provide new insight into the problem. In particular, Active Learning algorithms seek to select diverse and informative data for annotation (rather than random observations) from a pool of unlabeled data using **prediction scores**. 

Depending on score types you can select a sampling strategy 
* prediction-score-min (min is the best score) 
* prediction-score-max (max is the best score)
 
Read more about active learning sampling [on the task page](https://labelstud.io/guide/tasks.html#Sampling). 
 

## Troubleshooting

When you encounter any error, there are several hints to get more insights. 
Most of the problems could be easily investigated from the server console log. 
Note that since you run ML backend as a separate server, you have to check its logs (not Label Studio server's ones!)

> Note: When you start ML backend using docker-compose, the logs are located in:
> - main process / inference logs: logs/uwsgi.log
> - training logs: logs/rq.log

**I've launched ML backend, but after adding it in Label Studio's UI it results in a _Disconnected_ state.**

Perhaps your ML backend server didn't start properly. Try to do healthcheck via `curl -X GET http://localhost:9090/health`. 
If it doesn't respond or you see any errors, check server logs. When you're using docker-compose for starting ML backend, one common cause of errors is missed `requirements.txt` to set up the environment inside docker.

**ML backend seems to be connected, but after I press "Start Training", I see "Error. Click here for details." message.**

Check for the traceback after you click on the error message. Some common errors are an insufficient amount of annotations made or memory issues.
If you can't resolve them by yourself, <a href="https://join.slack.com/t/label-studio/shared_invite/zt-cr8b7ygm-6L45z7biEBw4HXa5A2b5pw">write us on Slack</a>.

**My predictions are wrong / I can't see the model prediction result on the labeling page**

ML backend predictions format follows the same structure as [predictions in imported preannotations](/guide/tasks.html#How-to-import-preannotations)

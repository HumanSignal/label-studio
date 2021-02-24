---
title: Set up machine learning with your labeling process
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

See the examples in [`label-studio/ml/examples`](https://github.com/heartexlabs/label-studio/tree/master/label_studio/ml/examples) directory.

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
    label-studio start text_classification_project --init --template text_classification --ml-backends http://localhost:9090
    ```

5. On the Label Studio UI, open the `/model` page and validate that the model was successfully connected.

### Getting predictions

After connecting a model as a machine learning backend, you see model predictions in the labeling interface and on the Tasks page that you use to manage your data.

For example, for an image classification task, the model pre-selects an image class for data labelers to verify. 

You can also get a prediction for specific data using the API. For example, to get a prediction for task data of `{"text":"some text"}` and a Label Studio installation accessible at `http://localhost:8080`, run the following cURL command: 

   ```
    curl -X POST -d '{"text":"some text"}' -H "Content-Type: application/json" http://localhost:8080/api/models/predictions
   ```

   
### Train a model with Label Studio 

You can start model training manually from the UI or using the API. 

- On the Label Studio UI, click the **Start Training** button on the `/model` page.
- cURL the API from the command line: 
   ```
   curl -X POST http://localhost:8080/api/models/train
   ```

In development mode, training logs appear in the web browser console. 
In production mode, you can find runtime logs in `my_backend/logs/uwsgi.log` and RQ training logs in `my_backend/logs/rq.log`. 
<!--what do these particular modes represent? add more information here-->

   
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

## How to make pre-annotations & pre-labeling & predictions
You can import pre-annotated tasks into LS. Pre-annotations will be automatically shown on Labeling page. Prepare your tasks with `predictions` field which is very similar to `completions` and then import your tasks to LS. [Read more](tasks.html#Basic-format) about task format and predictions. The same format of predictions is used for the ML backend output. 
<br>

<center><img src="../images/completions-predictions-scheme.png" style="width: 100%; max-width: 481px; opacity: 0.9"></center>

> Check completion format on Setup page or on Tasks page at `</>` (Show task data) button. Then make `result` field in your prediction is similar to the completion. 

> You need to use different ids within any task elements, completions, predictions and thier `result` items. It's our LSF requirement.

Let's use the following labeling config: 

```xml
<View>
  <Choices name="choice" toName="image" showInLine="true">
    <Choice value="Boeing" background="blue"/>
    <Choice value="Airbus" background="green" />
  </Choices>

  <RectangleLabels name="label" toName="image">
    <Label value="Airplane" background="green"/>
    <Label value="Car" background="blue"/>
  </RectangleLabels>

  <Image name="image" value="$image"/>
</View>
```

After the project setup is finished you can import this task (just copy this right into the input field on the Import page):  

```json
{
  "data": {
    "image": "http://localhost:8080/static/samples/sample.jpg" 
  },

  "predictions": [{
    "result": [
      {
        "id": "result1",
        "type": "rectanglelabels",        
        "from_name": "label", "to_name": "image",
        "original_width": 600, "original_height": 403,
        "image_rotation": 0,
        "value": {
          "rotation": 0,          
          "x": 4.98, "y": 12.82,
          "width": 32.52, "height": 44.91,
          "rectanglelabels": ["Airplane"]
        }
      },
      {
        "id": "result2",
        "type": "rectanglelabels",        
        "from_name": "label", "to_name": "image",
        "original_width": 600, "original_height": 403,
        "image_rotation": 0,
        "value": {
          "rotation": 0,          
          "x": 75.47, "y": 82.33,
          "width": 5.74, "height": 7.40,
          "rectanglelabels": ["Car"]
        }
      },
      {
        "id": "result3",
        "type": "choices",
        "from_name": "choice", "to_name": "image",
        "value": {
          "choices": ["Airbus"]
        }
      }
    ]
  }]
}
```

In this example there are 3 results inside of 1 prediction: 
 * `result1` - the first bounding box
 * `result2` - the second bounding box
 * `result3` - choice selection 
 
And the result will look as the following: 

<center><img src="../images/predictions-loaded.jpg" style="width: 100%; max-width: 700px"></center>

## How to display labels on bounding boxes, polygons and other regions
<center>
  <img src='../images/lsf-settings.png'>
</center>

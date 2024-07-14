---
title: Write your own ML backend
short: Write your own ML backend
type: guide
tier: all
order: 254
order_enterprise: 254
meta_title: Write your own ML backend
meta_description: Set up your machine learning model to output and consume predictions in your data science and data labeling projects. 
section: "Machine Learning"

---

Use the Label Studio ML backend to integrate Label Studio with machine learning models. The Label Studio ML backend is an SDK that you can use to wrap your machine learning model code and turn it into a web server. The machine learning server uses [uWSGI](https://uwsgi-docs.readthedocs.io/en/latest/) and [supervisord](http://supervisord.org/), and handles background training jobs with [RQ](https://python-rq.org/).

Follow the steps below to wrap custom machine learning model code with the Label Studio ML SDK, or see [our library of example ML backends](ml_tutorials.html) to integrate with popular machine learning frameworks and tools such as [Huggingface's Transformers](https://huggingface.co/docs/transformers/index), [OpenAI](https://openai.com/), [Langchain](https://www.langchain.com/) and others. 

For information on using one of Label Studio's example backends, see [Set up an example ML backend](ml#Set-up-an-example-ML-backend)


## 1. Install the ML backend repo

Download and install `label-studio-ml-backend` from the repository:

```bash
git clone https://github.com/HumanSignal/label-studio-ml-backend.git
cd label-studio-ml-backend/
pip install -e .
```

## 2. Create an empty ML backend

```bash
label-studio-ml create my_ml_backend
```

This creates the following directory structure, which you can modify to implement your own inference logic: 

```
my_ml_backend/
├── Dockerfile
├── .dockerignore
├── docker-compose.yml
├── model.py
├── _wsgi.py
├── README.md
├── requirements-base.txt
├── requirements-test.txt
├── requirements.txt
└── test_api.py
```

Where:

* `Dockerfile`, `docker-compose.yml` and `.dockerignore` are used to run the ML backend with Docker. 
* `model.py` is the main file where you can implement your own training and inference logic. 
* `_wsgi.py` is a helper file that is used to run the ML backend with Docker (you don't need to modify this). 
* `README.md` must contain instructions on how to run the ML backend. 
* `requirements.txt` is where you put your Python dependencies.
* `requirements_base.txt` and `requirements_test.txt` are basic dependencies (you don't need to modify this)
* `test_api.py` is where you put your model tests


## 3. Implement prediction logic

In your model directory, locate the `model.py` file (for example, `my_ml_backend/model.py`).

The `model.py` file contains a class declaration inherited from `LabelStudioMLBase`. This class provides wrappers for the API methods that are used by Label Studio to communicate with the ML backend. You can override the methods to implement your own logic:

```python
def predict(self, tasks, context, **kwargs):
    """Make predictions for the tasks."""
    return predictions
```

The `predict` method is used to make predictions for the tasks. It uses the following:

- `tasks`: [Label Studio tasks in JSON format](task_format)
- `context`: [Label Studio context in JSON format](#Support-interactive-pre-annotations-in-your-ML-backend) - for an interactive labeling scenario
- `predictions`: [Predictions array in JSON format](export#Raw-JSON-format-of-completed-tasks)

Once you implement the `predict` method, you can see predictions from the connected ML backend in Label Studio.

### Support interactive pre-annotations in your ML backend

If you want to support interactive pre-annotations in your machine learning backend, write an inference call using the `predict()` method. For an example that does this for text labeling projects, see [this code example for substring matching](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/interactive_substring_matching).

Complete the following steps:

1. Define an inference call with the `predict()` method as outlined above. The `predict()` method takes task data and context data:
  - The `tasks` parameter contains details about the task being pre-annotated. See [Label Studio tasks in JSON format](task_format).
  - The `context` parameter contains details about annotation actions performed in Label Studio, such as a text string highlighted sent in [Label Studio annotation results format](export#Label-Studio-JSON-format-of-annotated-tasks).
  
    `context` has the following properties. 
    - `annotation_id`: The annotation ID.
    - `draft_id`: The draft annotation ID.
    - `user_id`: The user ID.
    - `result`: This is the annotation result, but it includes an `is_positive: true` flag that can be changed by the user. For example, by pressing the **Alt** key and using keypoints to interact with the image in the UI. 
  
2. With the task and context data, construct a prediction using the data received from Label Studio. 
3. Return a result in the [Label Studio predictions format](predictions.html#Format-pre-annotations-for-Label-Studio), which varies depending on the type of labeling being performed.

Refer to the code example linked above for more details about how this might be performed for a NER labeling project. 

For more information about enabling pre-annotations, see [Interactive pre-annotations](ml#Interactive-pre-annotations).


## 4. Implement training logic (optional)

You can also implement the `fit` method to train your model. The `fit` method is typically used to train the model on the labeled data, although it can be used for any arbitrary operations that require data persistence (for example, storing labeled data in database, saving model weights, keeping LLM prompts history, etc).

By default, the `fit` method is called at any data action in Label Studio, like creating a new task or updating annotations. You can modify this behavior in using [Webhooks](webhooks).

To implement the `fit` method, you need to override the `fit` method in your `model.py` file:

```python
def fit(self, event, data, **kwargs):
    """Train the model on the labeled data."""
    old_model = self.get('old_model')
    # write your logic to update the model
    self.set('new_model', new_model)
```

with:

- `event`: The event type. This can be `'ANNOTATION_CREATED'`, `'ANNOTATION_UPDATED'`, etc.
- `data`: The payload received from the event (see the [Webhook event reference](webhook_reference)). 

Additionally, there are two helper methods that you can use to store and retrieve data from the ML backend:

- `self.set(key, value)` - Store data in the ML backend
- `self.get(key)` - Retrieve data from the ML backend

Both methods can be used elsewhere in the ML backend code, for example, in the `predict` method to get the new model weights.

### Trigger training with webhooks

Starting in version 1.4.1 of Label Studio, when you add an ML backend to your project, Label Studio creates a webhook to your ML backend to send an event every time an annotation is created or updated.

By default, the payload of the webhook event does not contain the annotation itself. You can either [modify the webhook event](webhooks) sent by Label Studio to send the full payload, or retrieve the annotation using the Label Studio API using the [get annotation by its ID endpoint](/api#operation/api_annotations_read), [SDK](sdk.html) using the [get task by ID method](https://labelstud.io/sdk/project.html#label_studio_sdk.project.Project.get_task), or by retrieving it from [target storage that you set up](storage) to store annotations.

See the [annotation webhook event reference](webhook_reference#Annotation-Created) for more details about the webhook event.


### Other methods and parameters

Other methods and parameters are available within the `LabelStudioMLBase` class:

- `self.label_interface` - Returns the Label Studio Label Interface object that contains all information about the labeling task.
- `self.model_version` - Returns the current model version.

## 4. Ensure the ML backend can access Label Studio data

If your data is stored in a cloud, local directory, or has been imported into Label Studio, you will need to set the `LABEL_STUDIO_URL` and `LABEL_STUDIO_API_KEY` environment variables. 

For more information, see [Allow the ML backend to access Label Studio data](ml#Allow-the-ML-backend-to-access-Label-Studio-data). 

## 5. Run the ML backend server

To run with Docker Compose: 

   ```bash
   docker-compose up
```

The ML backend server is available at `http://localhost:9090`. You can use this URL when [connecting the ML backend to Label Studio](ml#Connect-the-model-to-Label-Studio).

!!! note
    `localhost` is a special domain name that loops back directly to your local environment. In the instance of Docker-hosted containers, this loops back to the container itself, and not the machine the container is hosted on. Docker provides a special domain as a workaround for this, docker.host.internal. If you're hosting Label Studio and your ML Backend inside of Docker, try using that domain instead of localhost. (`http://host.docker.internal:9090`)


### Run without Docker

To run without docker (for example, for debugging purposes), you can use the following command:

```bash
pip install -r my_ml_backend
label-studio-ml start my_ml_backend
```

### Modify the host and port

To modify the host and port, use the following command line parameters:

```bash
label-studio-ml start my_ml_backend -p 9091 --host 0.0.0.0
```

### Test your ML backend

Modify the `my_ml_backend/test_api.py` to ensure that your ML backend works as expected.

## 6. Connect the ML backend to Label Studio

You can use the API or **Settings > Model**. For more information, see [Connect the model to Label Studio](ml#Connect-the-model-to-Label-Studio). 

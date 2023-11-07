---
title: Write your own ML backend
short: Write your own ML backend
type: guide
tier: all
order: 360
order_enterprise: 310
meta_title: Machine Learning SDK
meta_description: Set up your machine learning model to output and consume predictions in your data science and data labeling projects. 
section: "Machine learning"

---

Use the Label Studio ML backend to integrate Label Studio with machine learning models. The Label Studio ML backend is an SDK that you can use to wrap your machine learning model code and turn it into a web server. The machine learning server uses [uWSGI](https://uwsgi-docs.readthedocs.io/en/latest/) and [supervisord](http://supervisord.org/), and handles background training jobs with [RQ](https://python-rq.org/).

There are several use cases for the ML backend:

- Pre-annotate data with a model
- Use active learning to select the most relevant data for labeling
- Interactive (AI-assisted) labeling
- Model fine-tuning based on recently annotated data

Follow the steps below to wrap custom machine learning model code with the Label Studio ML SDK, or see [example ML backend tutorials](ml_tutorials.html) to integrate with popular machine learning frameworks such as PyTorch, GPT2, and others. 

The [ML backend repository](https://github.com/HumanSignal/label-studio-ml-backend/tree/master) also includes several predefined examples that you can use and modify:


```bash
cd label_studio_ml/examples/<SOME-MODEL>
docker-compose up
```

For more information about ML backend integration, see [Integrate Label Studio into your machine learning pipeline](ml).

## Create an ML backend service

1. Clone the Label Studio Machine Learning Backend git repository:

   ```bash
   git clone https://github.com/HumanSignal/label-studio-ml-backend.git 
   ```
2. Set up the environment:

   ```bash
   cd label-studio-ml-backend/
   
   pip install -U -e .
   
   ```
3. Create a new backend directory:

   ```bash
   label-studio-ml create my_ml_backend
   ```

   This creates the following file structure:

   ```
      my_ml_backend/
      ├── Dockerfile
      ├── docker-compose.yml
      ├── model.py
      ├── _wsgi.py
      ├── README.md
      └── requirements.txt
   ```

   Where:
      * `Dockefile` and `docker-compose.yml` are used to run the ML backend with Docker. 
      * `model.py` is the main file where you can implement your own training and inference logic. 
      * `_wsgi.py` is a helper file that is used to run the ML backend with Docker (you don't need to modify this). 
      * `README.md` has instructions on how to run the ML backend. 
      * `requirements.txt` is a file with Python dependencies.

4. Run the ML backend server:

   ```bash
   docker-compose up
   ```

   The ML backend server is available at `http://localhost:9090`. You can use this URL when connecting the ML backend to Label Studio.
5. Start Label Studio:

    ```bash
    label-studio start 
    ```

    Label Studio starts at `http://localhost:8080`.

6. [Add the ML backend to Label Studio](ml#Add-an-ML-backend-to-Label-Studio). 


Before you can begin using your custom ML backend, you will need to [implement inference logic](#Implement-prediction-logic). This allows you to get predictions from your model on-the-fly while annotating. 

You can modify an existing `predict()` method in the example ML backend scripts to make them work for your specific use case, or write your own code to override the `predict()` method.

The `predict()` method takes [JSON-formatted Label Studio tasks](tasks#Basic-Label-Studio-JSON-format) and returns predictions in the [format accepted by Label Studio](predictions).

<div class="enterprise-only">

You can also include and customize prediction scores that you can use for an [active learning loop](active_learning).

</div>

#### Run without Docker

To run without docker (for example, for debugging purposes), you can use the following command:

```bash
pip install -r my_ml_backend
label-studio-ml start my_ml_backend
```

#### Modify the port

To modify the port, use the `-p` parameter:
```bash
label-studio-ml start my_ml_backend -p 9091
```

## Implement prediction logic

In your model directory, locate the `model.py` file (for example, `my_ml_backend/model.py`).

The `model.py` file contains a class declaration inherited from `LabelStudioMLBase`. This class provides wrappers for the API methods that are used by Label Studio to communicate with the ML backend. You can override the methods to implement your own logic:

```python
def predict(self, tasks, context, **kwargs):
    """Make predictions for the tasks."""
    return predictions
```

The `predict()` method makes predictions for tasks and uses the following:
- `tasks`: [Label Studio tasks in JSON format](task_format).
- `context`: Label Studio context in JSON format. This is used with an [interactive labeling scenario](#Support-interactive-pre-annotations-in-your-ML-backend). 
- `predictions`: [Predictions array in JSON format](export#Label-Studio-JSON-format-of-annotated-tasks).

Once you implement the `predict()` method, you can see predictions from the connected ML backend in Label Studio.

For another example of the `predict()` method, see [model.py](https://github.com/HumanSignal/label-studio-ml-backend/blob/master/label_studio_ml/examples/the_simplest_backend/model.py#L22).

### Support interactive pre-annotations in your ML backend

If you want to support interactive pre-annotations in your machine learning backend, write an inference call using the `predict()` method. For an example that does this for text labeling projects, see [this code example for substring matching](https://github.com/heartexlabs/label-studio-ml-backend/tree/master/label_studio_ml/examples/substring_matching).

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

For more information about enabling pre-annotations, see [Get interactive pre-annotations](ml#Get-interactive-pre-annotations).

## Implement training logic

You can also implement the `fit()` method to train your model. The `fit` method is typically used to train the model on the labeled data, although it can be used for any arbitrary operations that require data persistence (for example, storing labeled data in database, saving model weights, keeping LLM prompts history, etc).

By default, the `fit` method is called at any data action in Label Studio, like creating a new task or updating annotations. You can modify this behavior in the project settings under [**Webhooks**](webhooks#Add-a-webhook-in-Label-Studio-UI).

To implement the `fit` method, you need to override the `fit` method in your `model.py` file:

```python
def fit(self, event, data, **kwargs):
    """Train the model on the labeled data."""
    old_model = self.get('old_model')
    # write your logic to update the model
    self.set('new_model', new_model)
```
Where:

- `event`: The event type can be `'ANNOTATION_CREATED'`, `'ANNOTATION_UPDATED'`, etc.
- `data` The payload received from the event. See the [Webhook event reference](webhook_reference). 

Additionally, there are two helper methods that you can use to store and retrieve data from the ML backend:

- `self.set(key, value)` - Store data in the ML backend.
- `self.get(key)` - Retrieve data from the ML backend. 

Both methods can also be used elsewhere in the ML backend code, for example, in the `predict` method to get the new model weights.

### Other methods and parameters
Other methods and parameters available within the `LabelStudioMLBase` class include:

- `self.label_config` - returns the [Label Studio labeling config](https://labelstud.io/guide/setup.html) as XML string.
- `self.parsed_label_config` - returns the [Label Studio labeling config](https://labelstud.io/guide/setup.html) as JSON.
- `self.model_version` - returns the current model version.


### Trigger training with webhooks

Starting in version 1.4.1 of Label Studio, when you add an ML backend to your project, Label Studio creates a webhook to your ML backend to send an event every time an annotation is created or updated.

By default, the payload of the webhook event does not contain the annotation itself. You can either [modify the webhook event](webhooks.html) sent by Label Studio to send the full payload, or retrieve the annotation using the Label Studio API using the [get annotation by its ID endpoint](/api#operation/api_annotations_read), [SDK](sdk.html) using the [get task by ID method](https://labelstud.io/sdk/project.html#label_studio_sdk.project.Project.get_task), or by retrieving it from [target storage that you set up](storage.html) to store annotations.

See the [annotation webhook event reference](webhook_reference.html#Annotation-Created) for more details about the webhook event.

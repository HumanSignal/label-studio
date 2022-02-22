---
title: Write your own ML backend
type: guide
order: 607
meta_title: Machine Learning SDK
meta_description: Set up your machine learning model to output and consume predictions in your data science and data labeling projects. 
---

Set up a machine learning model as a backend to Label Studio so that you can dynamically output and consume predictions as labeling occurs. You can follow this tutorial to wrap custom machine learning model code with the Label Studio ML SDK, or refer to [example ML backend tutorials](ml_tutorials.html) to integrate with popular machine learning frameworks such as PyTorch, GPT2, and others. 

This example tutorial outlines how to wrap a simple text classifier based on the [scikit-learn](https://scikit-learn.org/) framework with the Label Studio ML SDK in Python. Perform the following steps:
1. Review and follow [the prerequisites](#Prerequisites).
2. [Declare and initialize a class](#Declare-and-initialize-a-class).
3. [Make predictions with your ML backend](#Make-predictions-with-your-ML-backend).
4. [Train a model with your ML backend](#Train-a-model-with-your-ML-backend).
5. [Specify requirements for your ML backend](#Specify-requirements-for-your-ML-backend)
6. [Start running your ML backend](#Start-running-your-ML-backend).

If you want to create an ML backend that you can use for dynamic ML-assisted labeling with interactive pre-annotations, see [Support interactive preannotations in your ML backend](#Support-interactive-preannotations-in-your-ML-backend).

## Prerequisites 
Before you start integrating your custom model code with the Label Studio ML SDK to use it as an ML backend with Label Studio, determine the following:
1. The expected inputs and outputs for your model. In other words, the type of labeling that your model supports in Label Studio, which informs the [Label Studio labeling config](setup.html#Set-up-the-labeling-interface-for-your-project). For example, text classification labels of "Dog", "Cat", or "Opossum" could be possible inputs and outputs. 
2. Whether you want to create an ML backend that predicts labels, is trained by annotated tasks, or both. 
3. If creating an ML backend that predicts labels, determine the [prediction format](predictions.html) that your predictions must be outputted as.
4. The required packages and dependencies necessary to run your machine learning model.

## Declare and initialize a class

Start by creating a class declaration. You can create a Label Studio-compatible ML backend server in one command by inheriting it from `LabelStudioMLBase`. 
```python
from label_studio_ml.model import LabelStudioMLBase

class MyModel(LabelStudioMLBase):
```

Then, define loaders and initializers in the `__init__` method. 

```python
def __init__(self, **kwargs):
    # don't forget to initialize base class...
    super(MyModel, self).__init__(**kwargs)
    self.model = self.load_my_model()
```

After you define the loaders, you can define two methods for your model: [an inference call for making predictions with the model](#Make-predictions-with-your-ML-backend), and [a training call](#Train-a-model-with-your-ML-backend), for training the model. 


### Variables available from `LabelStudioMLBase`

The inherited `LabelStudioMLBase` class provides special variables that you can use:

| variable                   | contains          | details                                                                                                                                                                                                                                                                                         |
|----------------------------|-------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `self.label_config`        | string            | Raw labeling configuration.                                                                                                                                                                                                                                                                     |
| `self.parsed_label_config` | Python dictionary | Provides a structured Label Studio labeling configuration for a project. You might want to use this variable to align your model input or output with the Label Studio labeling configuration, for example for [creating pre-annotations](predictions.html). See below for more format details. |
| `self.train_output`        | Python dictionary | Contains the results of the previous model training runs, which is the same as the output of the `fit()` method in your code defined in the [training call section](#Train-a-model-with-your-ML-backend). Use this variable to load the model for active learning updates and fine-tuning.      |


The `self.parsed_label_config` variable returns a labeling configuration in the following form:
```python
    {
        "<ControlTag>.name": {
            "type": "ControlTag",
            "to_name": ["<ObjectTag1>.name", "<ObjectTag2>.name"],
            "inputs: [
                {"type": "ObjectTag1", "value": "<ObjectTag1>.value"},
                {"type": "ObjectTag2", "value": "<ObjectTag2>.value"}
            ],
            "labels": ["Label1", "Label2", "Label3"] // taken from "alias" if exists or "value"
        }
    }
```
For example, for a labeling config like follows:
```xml
<View>
  <Labels name="ner" toName="textdata">
    <Label value="PER" background="red"/>
    <Label value="ORG" background="darkorange"/>
    <Label value="LOC" background="orange"/>
    <Label value="MISC" background="green"/>
  </Labels>

  <Text name="textdata" value="$sample"/>
</View>
```

The `parsed_label_config` looks like the following:
```python
{
    "ner": {
        "type": "labels",
        "to_name": ["textdata"],
        "inputs": [
            {"type": "Text", "value": "sample"}
        ],
        "labels": {"PER", "ORG", "LOC", "MISC"}
    }
}
```
If you use an alias for the [Label tag](/tags/label.html), the `labels` dictionary contains the label aliases. Otherwise, it lists the label values.

## Make predictions with your ML backend

Create an ML backend with an inference call to get predictions from your model on-the-fly while annotating. 

You can modify an existing predict method in the example ML backend scripts to make them work for your specific use case, or write your own code to override the `predict(tasks, **kwargs)` method.

The `predict()` method takes [JSON-formatted Label Studio tasks](tasks.html#Basic-Label-Studio-JSON-format) and returns predictions in the [format accepted by Label Studio](predictions.html).

You can also include and customize prediction scores that you can use for an [active learning loop](active_learning.html).

### Example inference call 

This example defines an inference call that pulls the labeling configuration schema and then outputs the predictions from your model in that format so that Label Studio can understand and display the predictions in the Label Studio UI. This example uses a labeling configuration that uses the [`Choices` tag](/tags/choices.html). 

```python
def predict(self, tasks, **kwargs):
    predictions = []
    # Get annotation tag first, and extract from_name/to_name keys from the labeling config to make predictions
    from_name, schema = list(self.parsed_label_config.items())[0]
    to_name = schema['to_name'][0]
    for task in tasks:
        # for each task, return classification results in the form of "choices" pre-annotations
        predictions.append({
            'result': [{
                'from_name': from_name,
                'to_name': to_name,
                'type': 'choices',
                'value': {'choices': ['My Label']},
                'score': 0.42  # per-region score, visible in the editor only
            }],
            # optionally you can include prediction scores that you can use to sort the tasks and do active learning
            'score': 0.987,
            'model_version': 'delorean-2015.10.25'
        })
    return predictions
```

### Support interactive preannotations in your ML backend

If you want to support interactive preannotations in your machine learning backend, you need to write an inference call using the `predict()` method. For an example that does this for text labeling projects, you can refer to [this code example for substring matching](https://github.com/heartexlabs/label-studio-ml-backend/tree/master/label_studio_ml/examples/substring_matching).

Do the following in your code:
- Define an inference call with the **predict** method as outlined in the [inference section of this guide](ml_create.html#Example-inference-call).
- The `predict()` method takes task data and context data:
  - the `tasks` parameter contains details about the task being pre-annotated. 
  - the `kwargs['context']` parameter contains details about annotation actions performed in Label Studio, such as a text string highlighted sent in [Label Studio annotation results format](/export.html#Raw-JSON-format-of-completed-labeled-tasks).
- With the task and context data, construct a prediction using the data received from Label Studio. 
- Return a result in the [Label Studio predictions format](predictions.html#Format-pre-annotations-for-Label-Studio), which varies depending on the type of labeling being performed.

Refer to the code example for more details about how this might be performed for a NER labeling project. 

## Train a model with your ML backend 

If you want to train a model, use the training call to update your model based on new annotations. You can perform training as part of an active learning with predictions, or you can create an ML backend that trains or retrains a model based on annotations. You don't need to use this call in your code if you just want to use an ML backend for predictions. 

Write your own code to override the `fit()` method, which takes [JSON-formatted Label Studio annotations](/export.html#Raw-JSON-format-of-completed-labeled-tasks) and returns an arbitrary JSON dictionary where information about the created model can be stored. 

> Note: The `completions` field is deprecated as of Label Studio 1.0.x. In version 1.5.0 it will be removed. Instead, use the SDK or the API to retrieve annotation and task data using annotation and task IDs. See [trigger training with webhooks](#Trigger-training-with-webhooks) for more details.

### Trigger training with webhooks

Starting in version 1.4.1 of Label Studio, when you add an ML backend to your project, Label Studio creates a webhook to your ML backend to send an event every time an annotation is created or updated.

By default, the payload of the webhook event does not contain the annotation itself. You can either [modify the webhook event](webhooks.html) sent by Label Studio to send the full payload, or retrieve the annotation using the [Label Studio API](/api) using the [get annotation by its ID endpoint](/api#operation/api_annotations_read), [SDK](sdk.html) using the [get task by ID method](/sdk/project.html#label_studio_sdk.project.Project.get_task), or by retrieving it from [target storage that you set up](storage.html) to store annotations.

See the [annotation webhook event reference](webhook_reference.html#Annotation-Created) for more details about the webhook event.

### Example training call

This example defines a training call with the `fit()` method and stores the model training results in a `checkpoints` directory that you can reference to consistently retrain your model, such as with an [active learning loop](active_learning.html). 

The `fit()` method expects the data and event keys included in the webhook event payload to retrieve the project ID and annotation event type.

```python
def fit(self, tasks, workdir=None, **kwargs):
    # Retrieve the annotation ID from the payload of the webhook event
    # Use the ID to retrieve annotation data using the SDK or the API
    # Do some computations and get your model
    return {'checkpoints': 'my/model/checkpoints'}
    ## JSON dictionary with trained model artifacts that you can use later in code with self.train_output
```

You can set up your `fit()` method to start training immediately when an event is received, or define your own logic to define when to begin training. For example, you can check how much data the model needs to be labeled, then start training your model after every 100, 200, 300, or other number of annotated tasks accordingly. You can use the `self.model` variable with this function if you want to start training from the previous model checkpoint.

## Specify requirements for your ML backend 

You must specify all requirements needed by your custom ML backend in a `my-ml-backend/requirements.txt` file. 

For example, to specify scikit-learn as a requirement for your model, do the following:
```requirements.txt
scikit-learn
```

## Start running your ML backend

After you wrap your model code with the class, define the loaders, and define the methods, you're ready to run your model as an ML backend with Label Studio. See how to [Start your custom ML backend with Label Studio](ml.html#Start-your-custom-ML-backend-with-Label-Studio).


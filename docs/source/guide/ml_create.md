---
title: Write your own ML backend
type: guide
order: 607
meta_title: Machine Learning SDK
meta_description: Label Studio Documentation for setting up your machine learning model to output and consume predictions in your machine learning and data science data labeling projects. 
---

Set up a machine learning model as a backend to Label Studio so that you can dynamically output and consume predictions as labeling occurs. You can follow this tutorial to wrap custom machine learning model code with the Label Studio ML SDK, or refer to [example ML backend tutorials](ml_tutorials.html) to integrate with popular machine learning frameworks such as PyTorch, GPT2, and others. 

## Prerequisites 
Before you start integrating your custom model code with the Label Studio ML SDK to use it as an ML backend with Label Studio, determine the following:
1. The expected inputs and outputs for your model. In other words, the type of labeling that your model supports in Label Studio, which informs the [Label Studio labeling config](setup.html#Set-up-the-labeling-interface-for-your-project). For example, text classification labels of "Dog", "Cat", or "Opossum" could be possible inputs and outputs. 
2. The [prediction format](predictions.html) returned by your ML backend server.
3. The required packages and dependencies necessary to run your machine learning model. 

## Create a machine learning backend 
This example tutorial outlines how to wrap a simple text classifier based on the [scikit-learn](https://scikit-learn.org/) framework with the Label Studio ML SDK.

Start by creating a class declaration. You can create a Label Studio-compatible ML backend server in one command by inheriting it from `LabelStudioMLBase`. 
```python
from label_studio_ml.model import LabelStudioMLBase

class MyModel(LabelStudioMLBase):
```

Then, define loaders & initializers in the `__init__` method. 

```python
def __init__(self, **kwargs):
    # don't forget to initialize base class...
    super(MyModel, self).__init__(**kwargs)
    self.model = self.load_my_model()
```

There are special variables provided by the inherited class:
- `self.parsed_label_config` is a Python dict that provides a Label Studio project config structure. See [ref for details](). Use might want to use this to align your model input/output with Label Studio labeling configuration;
- `self.label_config` is a raw labeling config string;
- `self.train_output` is a Python dict with the results of the previous model training runs (the output of the `fit()` method described bellow) Use this if you want to load the model for the next updates for active learning and model fine-tuning.

After you define the loaders, you can define two methods for your model: an inference call and a training call. 

## Inference call

Use an inference call to get pre-annotations from your model on-the-fly. You must update the existing predict method in the example ML backend scripts to make them work for your specific use case. 

Write your own code to override the `predict(tasks, **kwargs)` method, which takes [JSON-formatted Label Studio tasks](tasks.html#Basic-Label-Studio-JSON-format) and returns predictions in the [format accepted by Label Studio](predictions.html).

**Example**

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
                'value': {'choices': ['My Label']}
            }],
            # optionally you can include prediction scores that you can use to sort the tasks and do active learning
            'score': 0.987
        })
    return predictions
```


## Training call
Use the training call to update your model with new annotations. You don't need to use this call in your code, for example if you just want to pre-annotate tasks without retraining the model. If you do want to retrain the model based on annotations from Label Studio, use this method. 

Write your own code to override the `fit(completions, **kwargs)` method, which takes [JSON-formatted Label Studio annotations](https://labelstud.io/guide/export.html#Raw-JSON-format-of-completed-labeled-tasks) and returns an arbitrary dict where some information about the created model can be stored.

> Note: The `completions` field is deprecated as of Label Studio 1.0.x and will be replaced with `annotations` in a future release of this SDK.  

**Example**
```python
def fit(self, completions, workdir=None, **kwargs):
    # ... do some heavy computations, get your model and store checkpoints and resources
    return {'checkpoints': 'my/model/checkpoints'}  # <-- you can retrieve this dict as self.train_output in the subsequent calls
```

After you wrap your model code with the class, define the loaders, and define the methods, you're ready to run your model as an ML backend with Label Studio. See the [Quickstart](ml.html#Quickstart). 


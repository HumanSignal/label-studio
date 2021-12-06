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
5. [Start running your ML backend](#Start-running-your-ML-backend).

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

The inherited class provides special variables that you can use:
- `self.parsed_label_config` is a Python dict that provides a Label Studio project config structure. See the [Tags documentation](/tags) and [Template documentation](/templates) for some examples of labeling configurations. You might want to use this variable to align your model input or output with the Label Studio labeling configuration.
- `self.label_config` is a raw labeling configuration string.
- `self.train_output` is a Python dict that contains the results of the previous model training runs, which is the same as the output of the `fit()` method in your code, defined in the [training call section](ml_create.html#Training-call). Use this variable to load the model for active learning updates and fine-tuning.

After you define the loaders, you can define two methods for your model: an inference call for making predictions with the model, and a training call, for training the model. 

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
                'value': {'choices': ['My Label']}
            }],
            # optionally you can include prediction scores that you can use to sort the tasks and do active learning
            'score': 0.987
        })
    return predictions
```

## Train a model with your ML backend 

If you want to train a model, use the training call to update your model based on new annotations. You can perform training as part of an active learning with predictions, or you can create an ML backend that trains or retrains a model based on annotations. You don't need to use this call in your code if you just want to use an ML backend for predictions. 

Write your own code to override the `fit(completions, **kwargs)` method, which takes [JSON-formatted Label Studio annotations](https://labelstud.io/guide/export.html#Raw-JSON-format-of-completed-labeled-tasks) and returns an arbitrary JSON dictionary where information about the created model can be stored.

> Note: The `completions` field is deprecated as of Label Studio 1.0.x and will be replaced with `annotations` in a future release of this SDK.  

### Example training call

This example defines a training call with the `fit()` method and stores the model training results in a checkpoints directory that you can reference to consistently retrain your model, for example as part of an [active learning loop](active_learning.html). 

```python
def fit(self, completions, workdir=None, **kwargs):
    # ... do some heavy computations, get your model and store checkpoints and resources
    return {'checkpoints': 'my/model/checkpoints'}  # <-- you can retrieve this dict as self.train_output in the subsequent calls
```

You can use the `self.model` variable with this function if you want to start training from the previous model checkpoint. 

## Start running your ML backend

After you wrap your model code with the class, define the loaders, and define the methods, you're ready to run your model as an ML backend with Label Studio. See the [Quickstart](ml.html#Quickstart).

## Support interactive preannotations in your ML backend

If you want to support interactive preannotations in your machine learning backend, refer to [this code example for substring matching](https://github.com/heartexlabs/label-studio-ml-backend/tree/master/label_studio_ml/examples/substring_matching).

Do the following in your code:
- Define an inference call with the **predict** method as outlined in the [inference section of this guide](ml_create.html#Inference-call).
- Within that predict method, take the task data in the `tasks` parameter, containing details about the task that is being preannotated, and the context details in `kwargs['context']`, containing details about actions performed in Label Studio. 
- With the task and context data, construct a prediction from the data received from Label Studio. 
- Return a result in the Label Studio predictions format.

Refer to the code example for more details. 




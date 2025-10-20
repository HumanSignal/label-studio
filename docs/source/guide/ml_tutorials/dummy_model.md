---
title: Create the simplest Machine Learning backend
short: Create a simple ML backend
type: guide
hide_menu: true
tier: all
order: 10
meta_title: Integrating with Machine Learning Backend Tutorial
meta_description: Label Studio tutorial for creating and integrating your Machine Learning backend with Label Studio.
section: "Machine learning"
parent: "ml_tutorials"
parent_enterprise: "ml_tutorials"
parent_page_extension: "html"
---


This tutorial explains the basics of using a Machine Learning (ML) backend with Label Studio. For the sake of simplicity, this tutorial relies on a _dummy model_ that just produces random predictions.
This model is compatible with any classification task, such as those projects where the `<Choices>` tag is used.

For example, let's consider this labeling config: 
```
<View>
  <Image name="image" value="$image"/>
  <Choices name="choice" toName="image" showInLine="true">
    <Choice value="Boeing" background="blue"/>
    <Choice value="Airbus" background="green" />
  </Choices>
</View>
```

### Create dummy model script

If you create an ML backend using [Label Studio's ML SDK](/guide/ml_create.html), make sure your ML backend script does the following:

- Inherit the created model class from `label_studio_ml.LabelStudioMLBase`
- Override the 2 methods:
    - `predict()`, which takes [input tasks](/guide/tasks.html#Basic-Label-Studio-JSON-format) and outputs [predictions](/guide/predictions.html) in the Label Studio JSON format.
    - `fit()`, which receives [annotations](/guide/export.html#Label-Studio-JSON-format-of-annotated-tasks) iterable and returns a dictionary with created links and resources. This dictionary is used later to load models with the `self.train_output` field.

Create a file `model.py` with the following content:

```python
from label_studio_ml.model import LabelStudioMLBase


class DummyModel(LabelStudioMLBase):

    def __init__(self, **kwargs):
        # don't forget to call base class constructor
        super(DummyModel, self).__init__(**kwargs)
    
        # you can preinitialize variables with keys needed to extract info from tasks and annotations and form predictions
        from_name, schema = list(self.parsed_label_config.items())[0]
        self.from_name = from_name
        self.to_name = schema['to_name'][0]
        self.labels = schema['labels']

    def predict(self, tasks, **kwargs):
        """ This is where inference happens: model returns 
            the list of predictions based on input list of tasks 
        """
        predictions = []
        for task in tasks:
            predictions.append({
                'score': 0.987,  # prediction overall score, visible in the data manager columns
                'model_version': 'delorean-20151021',  # all predictions will be differentiated by model version
                'result': [{
                    'from_name': self.from_name,
                    'to_name': self.to_name,
                    'type': 'choices',
                    'score': 0.5,  # per-region score, visible in the editor 
                    'value': {
                        'choices': [self.labels[0]]
                    }
                }]
            })
        return predictions

    def fit(self, annotations, **kwargs):
        """ This is where training happens: train your model given list of annotations, 
            then returns dict with created links and resources
        """
        return {'path/to/created/model': 'my/model.bin'}
```

### Create ML backend configs & scripts

Label Studio can automatically create all necessary configs and scripts needed to run ML backend from your newly created model.

Call your ML backend `my_backend` and from the command line, initialize the ML backend directory `./my_backend`:

```bash
label-studio-ml init my_backend
```

The last command takes your script `./model.py` and creates an `./my_backend` directory at the same level, copying the configs and scripts needed to launch the ML backend in either development or production modes.

!!! note
    You can specify different location for your model script, for example: `label-studio-ml init my_backend --script /path/to/my/script.py`

### Launch ML backend server

#### Development mode

In development mode, training and inference are done in a single process, therefore the server doesn't respond to incoming prediction requests while the model trains.

To launch ML backend server in a Flask development mode, run the following from the command line:

```bash
label-studio-ml start my_backend
```

The server started on `http://localhost:9090` and outputs logs in console.

#### Production mode

Production mode is powered by a Redis server and RQ jobs that take care of background training processes. This means that you can start training your model and continue making requests for predictions from the current model state. 
After the model finishes the training process, the new model version updates automatically.

For production mode, please make sure you have Docker and docker-compose installed on your system. Then run the following from the command line:

```bash
cd my_backend/
docker-compose up
```

You can explore runtime logs in `my_backend/logs/uwsgi.log` and RQ training logs in `my_backend/logs/rq.log`

### Using ML backend with Label Studio

Initialize and start a new Label Studio project connecting to the running ML backend:

```bash
label-studio start my_project --init --ml-backends http://localhost:9090
```

#### Getting predictions

You should see model predictions in a labeling interface. See [Set up machine learning with Label Studio](/guide/ml.html).

#### Model training

Trigger model training manually by pressing the `Start training` button the Machine Learning page of the project settings, or using an API call:

```bash
curl -X POST http://localhost:8080/api/models/train
```

---
title:
type: blog
order: 10
meta_title: Integrating with Machine Learning Backend Tutorial
meta_description: Label Studio tutorial for creating and integrating your Machine Learning backend with Label Studio.
---

## Create the simplest Machine Learning backend

It explains the basics of Machine Learning (ML) backend usage within Label Studio. For the sake of simplicity, a _dummy model_ is served and actually does nothing but produces the random predictions.
It is compatible with any classication task, i.e. where `<Choices>` tag is used.

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

If you create ML backend by using Label Studio's ML SDK, you have to follow the rules:

- created model class should be inherited from `label_studio.ml.LabelStudioMLBase`
- 2 methods should be overrided:
    - `predict()` takes [input tasks](/guide/tasks.html#Basic-format) and outputs [predictions](/guide/export.html#predictions) in a Label Studio format
    - `fit()` receives [completions](/guide/export.html#Basic-format) iterable and returns dictionary with created links and resources. This dictionary will be later used for model loading via `self.train_output` field.

Create a file `model.py` with the following content:

```python
from label_studio_ml.model import LabelStudioMLBase


class DummyModel(LabelStudioMLBase):

    def __init__(self, **kwargs):
        # don't forget to call base class constructor
        super(DummyModel, self).__init__(**kwargs)
    
        # you can preinitialize variables with keys needed to extract info from tasks and completions and form predictions
        from_name, schema = list(self.parsed_label_config.items())[0]
        self.from_name = from_name
        self.to_name = schema['to_name'][0]
        self.labels = schema['labels']

    def predict(self, tasks, **kwargs):
        """This is where inference happens: model returns the list of predictions based on input list of tasks"""
        results = []
        for task in tasks:
            results.append({
                'result': [{
                    'from_name': self.from_name,
                    'to_name': self.to_name,
                    'type': 'choices',
                    'value': {
                        'choices': [self.labels[0]]
                    }
                }],
                'score': 0.987
            })
        return results

    def fit(self, completions, **kwargs):
        """This is where training happens: train your model given list of completions, then returns dict with created links and resources"""
        return {'path/to/created/model': 'my/model.bin'}
```

### Create ML backend configs & scripts

Label Studio can automatically create all necessary configs and scripts needed to run ML backend from your newly created model.

Let's call ML backend `my_backend` and initialize ML backend directory `./my_backend`:

```bash
label-studio-ml init my_backend
```

The last command takes your script `./model.py` then creates `./my_backend` directory at the same level and copies configs and scripts needed for launching ML backend either in development or production modes.

> Note: You can specify different location for your model script, e.g. `label-studio-ml init my_backend --script /path/to/my/script.py`

### Launch ML backend server

#### Development mode

In a development mode, training and inference are done in a single process, therefore the server doesn't respond to incoming predictions requests while the model trains.

In order to launch ML backend server in a Flask development mode, run

```bash
label-studio-ml start my_backend
```

The server started on `http://localhost:9090` and outputs logs in console.

#### Production mode

Production mode is powered by Redis server and RQ jobs that take care of backround training processes. It means that you can start training your model and continue making requests for predictions from current model state. 
Once the model training process is finished, the new model version updates automatically.

For production mode, please make sure you have docker and docker-compose installed on your system. Then execute:

```bash
cd my_backend/
docker-compose up
```

Now you can explore runtime logs in `my_backend/logs/uwsgi.log` and RQ training logs in `my_backend/logs/rq.log`

### Using ML backend with Label Studio

Initialize and start new Label Studio project connecting to the running ML backend:

```bash
label-studio start my_project --init --ml-backends http://localhost:9090
```

#### Getting predictions

You should see model predictions in a labeling interface.

#### Model training

Model training is triggered manually by pushing `Start training` button on [/model](http://localhost:8080/model) page, or by using an API call:

```bash
curl -X POST http://localhost:8080/api/models/train
```

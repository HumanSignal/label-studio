---
title: Text classification with Scikit-Learn
type: guide
hide_menu: true
tier: all
order: 20
meta_title: Text Classification with Scikit-Learn Tutorial
meta_description: Label Studio tutorial for text classification using Scikit-Learn and Label Studio.
section: "Machine learning"
parent: "ml_tutorials"
parent_enterprise: "ml_tutorials"
parent_page_extension: "html"
---


This tutorial explains the basics of using a Machine Learning (ML) backend with Label Studio using a simple text classification model powered by the [scikit-learn](https://scikit-learn.org/stable/) library.

Follow this tutorial with a text classification project, where the labeling interface uses the `<Choices>` control tag with the `<Text>` object tag. The following is an example label config that you can use:

```xml
<View>
  <Text name="news" value="$text"/>
  <Choices name="topic" toName="news">
    <Choice value="Politics"/>
    <Choice value="Technology"/>
    <Choice value="Sport"/>
    <Choice value="Weather"/>
  </Choices>
</View>
```

### Create a model script


If you create an ML backend using [Label Studio's ML SDK](/guide/ml_create.html), make sure your ML backend script does the following:

- Inherit the created model class from `label_studio_ml.LabelStudioMLBase`
- Override the 2 methods:
    - `predict()`, which takes [input tasks](/guide/tasks.html#Basic-Label-Studio-JSON-format) and outputs [predictions](/guide/predictions.html) in the Label Studio JSON format.
    - `fit()`, which receives [annotations](/guide/export.html#Label-Studio-JSON-format-of-annotated-tasks) iterable and returns a dictionary with created links and resources. This dictionary is used later to load models with the `self.train_output` field.


Create a file `model.py` with the following content:

```python
import pickle
import os
import numpy as np

from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import make_pipeline

from label_studio_ml.model import LabelStudioMLBase


class SimpleTextClassifier(LabelStudioMLBase):

    def __init__(self, **kwargs):
        # don't forget to initialize base class...
        super(SimpleTextClassifier, self).__init__(**kwargs)

        # then collect all keys from config which will be used to extract data from task and to form prediction
        # Parsed label config contains only one output of <Choices> type
        assert len(self.parsed_label_config) == 1
        self.from_name, self.info = list(self.parsed_label_config.items())[0]
        assert self.info['type'] == 'Choices'

        # the model has only one textual input
        assert len(self.info['to_name']) == 1
        assert len(self.info['inputs']) == 1
        assert self.info['inputs'][0]['type'] == 'Text'
        self.to_name = self.info['to_name'][0]
        self.value = self.info['inputs'][0]['value']

        if not self.train_output:
            # If there is no trainings, define cold-started the simple TF-IDF text classifier
            self.reset_model()
            # This is an array of <Choice> labels
            self.labels = self.info['labels']
            # make some dummy initialization
            self.model.fit(X=self.labels, y=list(range(len(self.labels))))
            print('Initialized with from_name={from_name}, to_name={to_name}, labels={labels}'.format(
                from_name=self.from_name, to_name=self.to_name, labels=str(self.labels)
            ))
        else:
            # otherwise load the model from the latest training results
            self.model_file = self.train_output['model_file']
            with open(self.model_file, mode='rb') as f:
                self.model = pickle.load(f)
            # and use the labels from training outputs
            self.labels = self.train_output['labels']
            print('Loaded from train output with from_name={from_name}, to_name={to_name}, labels={labels}'.format(
                from_name=self.from_name, to_name=self.to_name, labels=str(self.labels)
            ))

    def reset_model(self):
        self.model = make_pipeline(TfidfVectorizer(ngram_range=(1, 3)), LogisticRegression(C=10, verbose=True))

    def predict(self, tasks, **kwargs):
        # collect input texts
        input_texts = []
        for task in tasks:
            input_texts.append(task['data'][self.value])

        # get model predictions
        probabilities = self.model.predict_proba(input_texts)
        predicted_label_indices = np.argmax(probabilities, axis=1)
        predicted_scores = probabilities[np.arange(len(predicted_label_indices)), predicted_label_indices]
        predictions = []
        for idx, score in zip(predicted_label_indices, predicted_scores):
            predicted_label = self.labels[idx]
            # prediction result for the single task
            result = [{
                'from_name': self.from_name,
                'to_name': self.to_name,
                'type': 'choices',
                'value': {'choices': [predicted_label]}
            }]

            # expand predictions with their scores for all tasks
            predictions.append({'result': result, 'score': score})

        return predictions

    def fit(self, completions, workdir=None, **kwargs):
        input_texts = []
        output_labels, output_labels_idx = [], []
        label2idx = {l: i for i, l in enumerate(self.labels)}

        for completion in completions:
            # get input text from task data
            print(completion)
            if completion['annotations'][0].get('skipped') or completion['annotations'][0].get('was_cancelled'):
                continue

            input_text = completion['data'][self.value]
            input_texts.append(input_text)

            # get an annotation
            output_label = completion['annotations'][0]['result'][0]['value']['choices'][0]
            output_labels.append(output_label)
            output_label_idx = label2idx[output_label]
            output_labels_idx.append(output_label_idx)

        new_labels = set(output_labels)
        if len(new_labels) != len(self.labels):
            self.labels = list(sorted(new_labels))
            print('Label set has been changed:' + str(self.labels))
            label2idx = {l: i for i, l in enumerate(self.labels)}
            output_labels_idx = [label2idx[label] for label in output_labels]

        # train the model
        self.reset_model()
        self.model.fit(input_texts, output_labels_idx)

        # save output resources
        model_file = os.path.join(workdir, 'model.pkl')
        with open(model_file, mode='wb') as fout:
            pickle.dump(self.model, fout)

        train_output = {
            'labels': self.labels,
            'model_file': model_file
        }
        return train_output
```

### Create ML backend configs & scripts

Label Studio can automatically create all necessary configs and scripts needed to run ML backend from your newly created model.

Call your ML backend `my_backend` and from the command line, initialize the ML backend directory `./my_backend`:

```bash
label-studio-ml init my_backend
```

The last command takes your script `./model.py` and creates an `./my_backend` directory at the same level, copying the configs and scripts needed to launch the ML backend in either development or production modes.

!!! note
    You can specify different location for your model script, for example: `label-studio-ml init my_backend --script /path/to/my/script.py`.

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

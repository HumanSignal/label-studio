
## Text classification with Scikit-Learn

It explains the basics of Machine Learning (ML) backend usage within Label Studio. 
We'll take a simple text classification model powered by [scikit-learn](https://scikit-learn.org/stable/) library.
It is compatible with text classication task, i.e. where `<Choices>` control tag is used with `<Text>` object tag. The example of a label config:

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

If you create ML backend by using Label Studio's ML SDK, you have to follow the rules:

- created model class should be inherited from `label_studio.ml.LabelStudioMLBase`
- 2 methods should be overrided:
    - `predict()` takes [input tasks](/guide/tasks.html#Basic-format) and outputs [predictions](/guide/export.html#predictions) in a Label Studio format
    - `fit()` receives [completions](/guide/export.html#Basic-format) iterable and returns dictionary with created links and resources. This dictionary will be later used for model loading via `self.train_output` field.

Create a file `model.py` with the following content:

```python
import pickle
import os
import numpy as np

from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import make_pipeline

from label_studio.ml import LabelStudioMLBase


# This is a main declaration of a machine learning model class
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
            self.model = make_pipeline(TfidfVectorizer(), LogisticRegression())
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
        output_labels = []
        label2idx = {l: i for i, l in enumerate(self.labels)}
        for completion in completions:
            # get input text from task data
            input_text = completion['data'][self.value]

            # get an annotation
            output_label = completion['completions'][0]['result'][0]['value']['choices'][0]
            output_label_idx = label2idx[output_label]
            input_texts.append(input_text)
            output_labels.append(output_label_idx)

        # train the model
        self.model.fit(input_texts, output_labels)

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

Let's call ML backend `my_backend` and initialize ML backend directory `./my_backend`:

```bash
label-studio-ml init my_backend
```

The last command takes your script `./model.py` then creates `./my_backend` directory at the same level and copies configs and scripts needed for launching ML backend either in development or production modes.

> Note: You can specify different location for your model script, e.g. `label-studio init my_backend --script /path/to/my/script.py`

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

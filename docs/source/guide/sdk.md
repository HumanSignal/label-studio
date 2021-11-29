---
title: Python SDK Tutorial for Label Studio
short: Python SDK Tutorial 
type: guide
order: 675
meta_title: Label Studio Python SDK Tutorial
meta_description: Tutorial documentation for the Label Studio Python SDK that covers how and why to use the SDK to easily include data labeling project creation and annotated task parsing in your data pipeline python scripts for data science and machine learning projects. 
---

You can use the Label Studio Python SDK to make annotating data a more integrated part of your data science and machine learning pipelines. This software development kit (SDK) lets you call the Label Studio API directly from scripts using predefined classes and methods. 

With the Label Studio Python SDK, you can perform the following tasks in a Python script:
- [Authenticate to the Label Studio API](#Start-using-the-Label-Studio-Python-SDK)
- [Create a Label Studio project](#Create-a-project-with-the-Label-Studio-Python-SDK), including setting up a labeling configuration. 
- [Import tasks](#Import-tasks-with-the-Label-Studio-Python-SDK).
- [Manage pre-annotated tasks and model predictions](#Add-predictions-to-existing-tasks-with-the-Label-Studio-Python-SDK).
- [Connect to a cloud storage provider](https://github.com/heartexlabs/label-studio-sdk/blob/master/examples/annotate_data_from_gcs/annotate_data_from_gcs.ipynb), such as Amazon S3, Microsoft Azure, or Google Cloud Services (GCS), to retrieve unlabeled tasks and store annotated tasks.
- [Modify project settings](/sdk/project.html#label_studio_sdk.project.Project.set_params), such as task sampling or the model version used to display predictions. 

See the [full SDK reference documentation for all available modules](/sdk/index.html), or review the available [API endpoints](/api) for any tasks that the SDK does not cover. 

## Start using the Label Studio Python SDK

1. Install the SDK:
   `pip install label-studio-sdk`
2. In your Python script, do the following:
   1. Import the SDK.
   2. Define your API key and Label Studio URL (API key is available at _Account_ page).
   3. Connect to the API.
```python
# Define the URL where Label Studio is accessible and the API key for your user account
LABEL_STUDIO_URL = 'http://localhost:8080'
API_KEY = 'd6f8a2622d39e9d89ff0dfef1a80ad877f4ee9e3'

# Import the SDK and the client module
from label_studio_sdk import Client

# Connect to the Label Studio API and check the connection
ls = Client(url=LABEL_STUDIO_URL, api_key=API_KEY)
ls.check_connection()
```

## Create a project with the Label Studio Python SDK

Create a project in Label Studio using the SDK. Specify the project title and the labeling configuration. Choose your labeling configuration based on the type of labeling that you wish to perform. See the available [templates for Label Studio projects](/templates), or set a blank configuration with `<View></View>`. 

For example, create an audio transcription project in your Python code:
```python
project = ls.start_project(
    title='Audio Transcription Project',
    label_config='''
    <View>
        <Header value="Listen to the audio" />
        <Audio name="audio" value="$audio" />
        <Header value="Write the transcription" />
        <TextArea name="transcription" toName="audio"
            rows="4" editable="true" maxSubmissions="1" />
    </View>
    '''
)
```

For more about what you can do with the project module of the SDK, see the [project module SDK reference](/sdk/project.html). 

## Import tasks with the Label Studio Python SDK

You can import tasks from your script using the Label Studio Python SDK. 

For a specific project, you can import tasks in [Label Studio JSON format](tasks.html#Basic-Label-Studio-JSON-format) or [connect to cloud storage providers](https://github.com/heartexlabs/label-studio-sdk/blob/master/examples/annotate_data_from_gcs/annotate_data_from_gcs.ipynb) and import image, audio, or video files directly. 

```python
project.import_tasks(
    [
        {'image': 'https://data.heartex.net/open-images/train_0/mini/0045dd96bf73936c.jpg'},
        {'image': 'https://data.heartex.net/open-images/train_0/mini/0083d02f6ad18b38.jpg'}
    ]
)
```

You can also import predictions:
- [Add predictions to an existing task](#Add-predictions-to-existing-tasks-with-the-Label-Studio-Python-SDK)
- [Import pre-annotated tasks](#Import-pre-annotated-tasks-into-Label-Studio)

### Add predictions to existing tasks with the Label Studio Python SDK

You can add predictions to existing tasks in Label Studio in your Python script. 

For an existing simple image classification project, you can do the following to add predictions of "Dog" for image tasks that you retrieve:
```python
task_ids = project.get_tasks_ids()
project.create_prediction(task_ids[0], result='Dog', score=0.9)
```

For complex cases, such as object detection with bounding boxes, you can specify structured results:
```python
project.create_prediction(task_ids[1], result={"x": 10, "y": 20, "width": 30, "height": 40, "label": ["Dog"]}, score=0.9)
```

For another example, see the [Jupyter notebook example of importing pre-annotated data](https://github.com/heartexlabs/label-studio-sdk/blob/master/examples/import_preannotations/import_preannotations.ipynb).

### Import pre-annotated tasks into Label Studio

You can also import predictions together with tasks as pre-annotated tasks. The SDK offers several ways that you can import pre-annotations into Label Studio.

One way is to import tasks in a simple JSON format, where one key in the JSON identifies the data object being labeled, and the other is the key containing the prediction. 

In this example, import predictions for an image classification task:
```python
project.import_tasks(
    [{'image': f'https://data.heartex.net/open-images/train_0/mini/0045dd96bf73936c.jpg', 'pet': 'Dog'},
    {'image': f'https://data.heartex.net/open-images/train_0/mini/0083d02f6ad18b38.jpg', 'pet': 'Cat'}],
    preannotated_from_fields=['pet']
)
```
The image is specified in the `image` key using a public URL, and the prediction is referenced in an arbitrary `pet` key, which is then specified in the `preannotated_from_fields()` method.  

For more examples, see the [Jupyter notebook example of importing pre-annotated data](https://github.com/heartexlabs/label-studio-sdk/blob/master/examples/import_preannotations/import_preannotations.ipynb).

## Prepare and manage data with filters

You can also use the SDK to control how tasks appear in the data manager to annotators or reviewers. You can create custom filters and ordering for the tasks based on parameters that you specify with the SDK. This lets you have more granular control over which tasks in your dataset get labeled or reviewed, and in which order.

### Prepare unlabeled data with filters

For example, you can create a filter to prepare tasks to be annotated. For example, if you want annotators to focus on tasks in the first 1000 tasks in a dataset that contain the word "possum" in the field "text" in the task data, do the following: 
```python
from label_studio_sdk.data_manager import Filters, Column, Type, Operator

Filters.create(Filters.AND, [
    Filters.item(
        Column.id,
        Operator.GREATER_OR_EQUAL,
        Type.Number,
        Filters.value(1)
    ),
        Filters.item(
        Column.id,
        Operator.LESS_OR_EQUAL,
        Type.Number,
        Filters.value(1000)
    ),
    Filters.item(
        Column.data(text),
        Operator.CONTAINS,
        Type.String,
        Filters.value("possum")
    )
])
```

### Manage annotations with filters 

For example, to create a filter that displays only tasks with an ID greater than 42 or that were annotated between November 1, 2021, and now, do the following:
```python
from label_studio_sdk.data_manager import Filters, Column, Type, Operator

Filters.create(Filters.OR, [
    Filters.item(
        Column.id,
        Operator.GREATER,
        Type.Number,
        Filters.value(42)
    ),
    Filters.item(
        Column.completed_at,
        Operator.IN,
        Type.Datetime,
        Filters.value(
            datetime(2021, 11, 1),
            datetime.now()
        )
    )
])
```
You can use this example filter to prepare completed tasks for review in Label Studio Enterprise.

---
title: Get data into Label Studio
type: guide
order: 102
---

Get data into Label Studio by importing files, referencing URLs, or syncing with cloud or database storage. 

## How to import data into Label Studio

How you import data can depend on where your data is stored.

- If your data is stored in a cloud storage bucket, see [Sync data from cloud or database storage](storage.html).
- If your data is stored in a Redis database, see [Sync data from cloud or database storage](storage.html).
- If your data is stored at internet-accessible URLs, [import it from the Label Studio UI](#Import-data-from-the-Label-Studio-UI).
- If your data is stored locally in a directory, [import it from the command line](#Import-data-from-the-command-line).
- If your data is stored locally as individual files, [import it from the Label Studio UI](#Import-data-from-the-Label-Studio-UI) or [import it from the command line](#Import-data-from-the-command-line). 

### Import data from the Label Studio UI

To import data from the Label Studio UI, do the following:
1. Start Label Studio from the command line.
2. On the Label Studio UI, open the import page available at [http://localhost:8080/import](http://localhost:8080/import).
3. Import your data from files or URLs. 

### Import data from the command line

To import data from the command line, do the following:

1. Start Label Studio and use command line arguments to specify the path to the data and format of the data. <br/>For example: <br/>`label-studio init --input-path my_tasks.json --input-format json`
2. Open the Label Studio UI and confirm that your data was properly imported. 

You can use the `--input-path` argument to specify a file or directory with the data that you want to label. By default, Label Studio expects JSON-formatted tasks using the [Basic Label Studio JSON format](tasks.html#Basic-Label-Studio-JSON-format). You can specify other data formats using the `--input-format` argument. For examples, see [Types of data you can import into Label Studio](#Types-of-data-you-can-import-into-Label-Studio) on this page.

### Import data using the API

Import your data using the Label Studio server API. See the [API documentation](api.html).


## Types of data you can import into Label Studio

You can import many different types of data, including text, timeseries, audio, and image data. The file types supported depend on the type of data. 

| Data type | Supported file types |
| --- | --- |
| Audio | .aiff, .au, .flac, .m4a, .mp3, .ogg, .wav |
| HTML | .html, .htm, .xml |
| Images | .bmp, .gif, .jpg, .png, .svg, .tiff, .webp |
| Structured data | .csv, .tsv, .json |
| Text | .txt |
| Time series | .csv, .tsv |

If you don't see a supported data or file type that you want to import, reach out in the [Label Studio Slack community](https://join.slack.com/t/label-studio/shared_invite/zt-cr8b7ygm-6L45z7biEBw4HXa5A2b5pw). 

## How to format your data to import it

Label Studio treats different file types different ways. 

### Basic Label Studio JSON format

One way to import data into Label Studio is using a JSON-formatted list of tasks. The `data` key of the JSON file references each task as an entry in a JSON dictionary. If there is no `data` key, Label Studio interprets the entire JSON file as one task. 

In the `data` JSON dictionary, use key-value pairs that correspond to the source key expected by the object tag in the [label config](/guide/setup.html#Customize-the-labeling-interface-for-your-project) that you set up for your dataset. 

Depending on the type of object tag, Label Studio interprets field values differently:
- `<Text value="$key">`: `value` is interpreted as plain text.
- `<HyperText value="$key">`: `value` is interpreted as HTML markup.
- `<HyperText value="$key" encoding="base64">`: `value` is interpreted as a base64 encoded HTML markup.
- `<Audio value="$key">`: `value` is interpreted as a valid URL to an audio file.
- `<AudioPlus value="$key">`: `value` is interpreted as a valid URL to an audio file with CORS policy enabled on the server side.
- `<Image value="$key">`: `value` is interpreted as a valid URL to an image file
- `<TimeSeries value="$key">`: `value` is interpreted as a valid URL to a CSV/TSV file if `valueType="url"`, otherwise it is interpreted as a JSON dictionary with column arrays: `"value": {"first_column": [...], ...}` if `valueType="json"`. 
    
You can add other, optional keys to the JSON file.

| JSON key | Description |
| --- | --- | 
| id | Optional. Integer to use as the task ID. |
| completions | Optional. List of annotations exported from Label Studio. [Label Studio's completion format](/guide/export.html#completions) allows you to import annotation results in order to use them in subsequent labeling tasks. |
| predictions | Optional. List of model prediction results, where each result is saved using [Label Studio's prediction format](/guide/export.html#predictions). Import predictions for automatic task pre-labeling and active learning. See [Import predicted labels into Label Studio](#Import-predicted-labels-into-Label-Studio) |

#### Example JSON format

For an example text classification project, you can set up a label config like the following:
```html
<View>
  <Text name="message" value="$my_text"/>
  <Choices name="sentiment_class" toName="message">
    <Choice value="Positive"/>
    <Choice value="Neutral"/>
    <Choice value="Negative"/>
  </Choices>
</View>

```

You can then import tasks to label that match the following JSON format:

```yaml
[{
  # "data" must contain the "my_text" field defined by labeling config,
  # and can optionally include other fields
  "data": {
    "my_text": "Opossums are great",
    "ref_id": 456,
    "meta_info": {
      "timestamp": "2020-03-09 18:15:28.212882",
      "location": "North Pole"
    } 
  },

  # completions are the list of annotation results matching the labeling config schema
  "completions": [{
    "result": [{
      "from_name": "sentiment_class",
      "to_name": "message",
      "type": "choices",
      "value": {
        "choices": ["Positive"]
      }
    }]
  }],

  # "predictions" are pretty similar to "completions" 
  # except that they also include some ML-related fields like a prediction "score"
  "predictions": [{
    "result": [{
      "from_name": "sentiment_class",
      "to_name": "message",
      "type": "choices",
      "value": {
        "choices": ["Neutral"]
      }
    }],
  # score is used for active learning sampling mode
    "score": 0.95
  }]
}]
```


### Import JSON tasks

Import JSON-formatted tasks from one file from the command line: 
```bash
label-studio init --input-path=my_tasks.json
```

In this example, `tasks.json` contains tasks in a [Basic Label Studio JSON format](tasks.html#Basic-Label-Studio-JSON-format).

### Import a directory with JSON files

Import JSON-formatted tasks stored in multiple files in one directory from the command line:
```bash
label-studio init --input-path=dir/with/json/files --input-format=json-dir
```

In this example, import tasks from several JSON files stored in one directory, `files`. Each JSON file in this case must match the [Basic Label Studio JSON format](tasks.html#Basic-Label-Studio-JSON-format). If you add more files to this directory after Label Studio starts, you must restart Label Studio to import the tasks in the additional files.

### Import CSV or TSV data

When you import a CSV / TSV formatted text file, Label Studio interprets the column names are as task data keys that correspond to the labeling config you set up: 
```csv
my_text,optional_field
this is a first task,123
this is a second task,456
```

> Note: You can only import CSV / TSV files on the Label Studio UI.

> Note: If your labeling config has a TimeSeries tag, Label Studio interprets the CSV/TSV as time series data when you import it. This CSV/TSV is hosted as a resource file and Label Studio automatically creates a task with a link to the uploaded CSV/TSV.

### Plain text

Import data as plain text. Label Studio interprets each line in a plain text file as a separate data labeling task. 

```bash
label-studio init my-project --input-path=my_tasks.txt --input-format=text --label-config=config.xml
```

You might use plain text for labeling tasks if you have only one stream of input data, and only one [object tag](/tags) specified in your label config. 

```text
this is a first task
this is a second task
```

### Directory with plain text files

Import data stored in multiple plain text files. You can split your input data into several plain text files, and specify the directory path. Then Label Studio scans each file line-by-line, creating one task per line.

```bash
label-studio init my-project --input-path=dir/with/text/files --input-format=text-dir --label-config=config.xml
```

### Directory with image files

Import tasks from a local directory containing multiple image files. Each file creates one labeling task. Label Studio creates a URL for each task, pointing to your local directory as follows: 
```
http://<host:port>/data/filename?d=<path/to/the/local/directory>
```

The supported image file formats are: `.png` `.jpg` `.jpeg` `.tiff` `.bmp` `.gif`

Run the following command to start Label Studio and import image files from a local directory:
```bash
label-studio init my-project --input-path=dir/with/images --input-format=image-dir --label-config=config.xml --allow-serving-local-files
```

> WARNING: the `--allow-serving-local-files` argument is intended for use only with locally-running instances of Label Studio. Avoid using it for remote servers unless you are sure what you're doing.


### Directory with audio files

Import tasks from a local directory containing multiple audio files. Each file creates one labeling task. Label Studio creates a URL for each task, pointing to your local directory as follows: 

```
http://<host:port>/data/filename?d=<path/to/the/local/directory>
```

The supported audio file formats are: `.wav` `.aiff` `.mp3` `.au` `.flac`

Run the following command to start Label Studio and import audio files from a local directory:

```bash
label-studio init my-project --input-path=my/audios/dir --input-format=audio-dir --label-config=config.xml --allow-serving-local-files
```

> WARNING: the `--allow-serving-local-files` argument is intended for use only with locally-running instances of Label Studio. Avoid using it for remote servers unless you are sure what you're doing.


## Set up task sampling for your project 
<!--move to project setup page-->

When you start Label Studio, you can define the way of how your imported tasks are exposed to annotators by setting up task sampling. To enable task sampling, specify one of the sampling option with the `--sampling=<option>` command line argument when you start Label Studio. <!--is there a way to do this from the UI?--> 

The following table lists the available sampling options: 

| Option | Description |
| --- | --- | 
| sequential | Default. Tasks are shown to annotators in ascending order by the `id` field. |
| uniform | Tasks are sampled with equal probabilities. |
| prediction-score-min | Tasks with the minimum average prediction score are shown to annotators. To use this option, you must also include predictions data in the task data that you import into Label Studio. |
| prediction-score-max | Tasks with the maximum average prediction score are shown to annotators. To use this option, you must also include predictions data in the task data that you import into Label Studio. |


## Import predicted labels into Label Studio 

Import predicted labels, pre-annotated tasks, or pre-labeled tasks into Label Studio. Label Studio automatically displays the pre-labels that you import on the Labeling page for each task. 

To import predicted labels into Label Studio, set up your tasks with the `predictions` JSON key and use the [Basic Label Studio JSON format](tasks.html#Basic-Label-Studio-JSON-format). The Label Studio ML backend also outputs tasks in this format. 

> You must use different IDs for each task elements, completions, predictions and their `result` items. 

### Example of importing predicted labels

For example, import predicted labels for tasks to determine whether an item in an image is an airplane or a car. 

Use the following labeling configuration: 
```xml
<View>
  <Choices name="choice" toName="image" showInLine="true">
    <Choice value="Boeing" background="blue"/>
    <Choice value="Airbus" background="green" />
  </Choices>

  <RectangleLabels name="label" toName="image">
    <Label value="Airplane" background="green"/>
    <Label value="Car" background="blue"/>
  </RectangleLabels>

  <Image name="image" value="$image"/>
</View>
```

After you set up an example project, import this task into Label Studio. Save it as a file first, for example, `example_prediction_task.json`.

```json
{
  "data": {
    "image": "http://localhost:8080/static/samples/sample.jpg" 
  },

  "predictions": [{
    "result": [
      {
        "id": "result1",
        "type": "rectanglelabels",        
        "from_name": "label", "to_name": "image",
        "original_width": 600, "original_height": 403,
        "image_rotation": 0,
        "value": {
          "rotation": 0,          
          "x": 4.98, "y": 12.82,
          "width": 32.52, "height": 44.91,
          "rectanglelabels": ["Airplane"]
        }
      },
      {
        "id": "result2",
        "type": "rectanglelabels",        
        "from_name": "label", "to_name": "image",
        "original_width": 600, "original_height": 403,
        "image_rotation": 0,
        "value": {
          "rotation": 0,          
          "x": 75.47, "y": 82.33,
          "width": 5.74, "height": 7.40,
          "rectanglelabels": ["Car"]
        }
      },
      {
        "id": "result3",
        "type": "choices",
        "from_name": "choice", "to_name": "image",
        "value": {
          "choices": ["Airbus"]
        }
      }
    ]
  }]
}
```

In this example there are 3 results inside of 1 prediction: 
- `result1` - the first bounding box
- `result2` - the second bounding box
- `result3` - choice selection 
 
In the Label Studio UI, the imported prediction for this task looks like the following: 
<center><img src="../images/predictions-loaded.jpg" style="width: 100%; max-width: 700px"></center>



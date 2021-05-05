---
title: Get data into Label Studio
type: guide
order: 300
meta_title: Import Data
meta_description: Label Studio Documentation for importing and uploading data labeling tasks for machine learning or data science projects. 
---

Get data into Label Studio by importing files, referencing URLs, or syncing with cloud or database storage. 

- If your data is stored in a cloud storage bucket, see [Sync data from cloud or database storage](storage.html).
- If your data is stored in a Redis database, see [Sync data from cloud or database storage](storage.html).
- If your data is stored at internet-accessible URLs, in files, or directories, [import it from the Label Studio UI](#Import-data-from-the-Label-Studio-UI).
- If your data is stored locally, [import it into Label Studio](#Import-data-from-a-local-directory).
- If your data contains predictions or pre-annotations, see [Import pre-annotated data into Label Studio](predictions.html).

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

If you want to import multiple types of data to label at the same time, for example, images with captions or audio recordings with transcripts, you must use the [basic Label Studio JSON format](#Basic-Label-Studio-JSON-format). 

You can also use a CSV file or a JSON list of tasks to point to URLs with the data, rather than directly importing the data if you need to import thousands of files.


### Basic Label Studio JSON format

One way to import data into Label Studio is using a JSON-formatted list of tasks. The `data` key of the JSON file references each task as an entry in a JSON dictionary. If there is no `data` key, Label Studio interprets the entire JSON file as one task. 

In the `data` JSON dictionary, use key-value pairs that correspond to the source key expected by the object tag in the [label config](setup.html#Customize-the-labeling-interface-for-your-project) that you set up for your dataset. 

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
| annotations | Optional. List of annotations exported from Label Studio. [Label Studio's annotation format](export.html#Raw-JSON-format-of-completed-tasks) allows you to import annotation results in order to use them in subsequent labeling tasks. |
| predictions | Optional. List of model prediction results, where each result is saved using [Label Studio's prediction format](export.html#Raw-JSON-format-of-completed-tasks). Import predictions for automatic task pre-labeling and active learning. See [Import predicted labels into Label Studio](predictions.html) |

### Example JSON format

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

  # annotations are the list of annotation results matching the labeling config schema
  "annotations": [{
    "result": [{
      "from_name": "sentiment_class",
      "to_name": "message",
      "type": "choices",
      "value": {
        "choices": ["Positive"]
      }
    }]
  }],

  # "predictions" are pretty similar to "annotations" 
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

> Note: For versions of Label Studio earlier than 1.0.0, use the following JSON format example. 

If you're using a version of Label Studio earlier than version 1.0.0, import tasks that match the following JSON format: 

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


### Import CSV or TSV data

When you import a CSV / TSV formatted text file, Label Studio interprets the column names are as task data keys that correspond to the labeling config you set up: 
```csv
my_text,optional_field
this is a first task,123
this is a second task,456
```

> Note: If your labeling config has a TimeSeries tag, Label Studio interprets the CSV/TSV as time series data when you import it. This CSV/TSV is hosted as a resource file and Label Studio automatically creates a task with a link to the uploaded CSV/TSV.

### Plain text

Import data as plain text. Label Studio interprets each line in a plain text file as a separate data labeling task. 

You might use plain text for labeling tasks if you have only one stream of input data, and only one [object tag](/tags) specified in your label config. 

```text
this is a first task
this is a second task
```

If you want to import entire plain text files without each line becoming a new labeling task, customize the labeling configuration to specify `valueType="url"` in the Text tag. See the [Text tag documentation](/tags/text.html)

## Import data from a local directory

To import data from a local directory, you have two options:
- Run a web server to generate URLs for the files, then upload a file that references the URLs to Label Studio. 
- Add the file directory as a source or target [local storage](storage.html#Local-storage) connection in the Label Studio UI.

### Run a web server to generate URLs to local files
To run a web server to generate URLs for the files, you can refer to this provided [helper shell script in the Label Studio repository](https://github.com/heartexlabs/label-studio/blob/master/scripts/serve_local_files.sh) or write your own script. 
Use that script to do the following:
1. On the machine with the file directory that you want Label Studio to import, call the helper script and specify a regex pattern to match the files that you want to import. In this example, the script identifies files with the JPG file extension:
   ```bash
   ./script/serve_local_files.sh <directory/with/files> *.jpg
   ```
   The script collects the links to the files provided by that HTTP server and saves them to a `files.txt` file with one URL per line. 
3. Import the file with URLs into Label Studio using the Label Studio UI. 

If your labeling configuration supports HyperText or multiple data types, use the Label Studio JSON format to specify the local file locations instead of a `txt` file. See [an example of this format](storage.html#Tasks-with-local-storage-file-references).

### Add the file directory as source storage in the Label Studio UI
If you're running Label Studio on Docker and want to add local file storage, you need to mount the file directory and set up environment variables. See [Run Label Studio on Docker and use local storage](start.html#Run-Label-Studio-on-Docker-and-use-local-storage).

## Import data from the Label Studio UI

To import data from the Label Studio UI, do the following:
1. On the Label Studio UI, open a specific project.
2. Click **Import** to open the import page available at [http://localhost:8080/import](http://localhost:8080/import).
3. Import your data from files or URLs. 

Data that you import is project-specific. 

### Import data using the API

Import your data using the Label Studio server API. See the [API documentation](api.html).

### Import data from the command line

In versions of Label Studio earlier than 1.0.0, you can import data from a local directory using the command line. 

To import data from the command line, do the following:

1. Start Label Studio and use command line arguments to specify the path to the data and format of the data. <br/>For example: <br/>`label-studio init --input-path my_tasks.json --input-format json`
2. Open the Label Studio UI and confirm that your data was properly imported. 

You can use the `--input-path` argument to specify a file or directory with the data that you want to label. You can specify other data formats using the `--input-format` argument. For example run the following command to start Label Studio and import audio files from a local directory:

```bash
label-studio init my-project --input-path=my/audios/dir --input-format=audio-dir --label-config=config.xml --allow-serving-local-files
```

> WARNING: the `--allow-serving-local-files` argument is intended for use only with locally-running instances of Label Studio. Avoid using it for remote servers unless you are sure what you're doing.

By default, Label Studio expects JSON-formatted tasks using the [Basic Label Studio JSON format](tasks.html#Basic-Label-Studio-JSON-format). 

If you add more files to a local directory after Label Studio starts, you must restart Label Studio to import the tasks in the additional files.



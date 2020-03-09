---
title: Import tasks
type: guide
order: 101
---

## Basic format

Label Studio gets JSON-formatted list of _tasks_ as input. Each _task_ is a dictionary-like structure, with some specific keys reserved for internal use:

* **data** - task body represented as a dictionary `{"my_key": my_value}`. It is possible to store any number of key-value pairs within task data, but there should be _source keys_ defined by [label config](/guide/setup.html#Labeling-config) (i.e. what is defined by object tag's attribute `value="$my_key"`).
    Depending on the object tag type, field values are interpreted differently:
    - `<Text value="$my_key">`: `my_value` is taken as plain text
    - `<HyperText value="$my_key">`: `my_value` is a HTML markup
    - `<HyperText value="$my_key" encoding="base64">`: `my_value` is a base64 encoded HTML markup
    - `<Audio value="$my_key">`: `my_value` is taken as a valid URL to audio file
    - `<AudioPlus value="$my_key">`: `my_value` is taken as a valid URL to an audio file with CORS policy enabled on the server side
    - `<Image value="$my_key">`: `my_value` is a valid URL to an image file
* (optional) **id** - integer task ID
* (optional) **completions** - list of output annotation results, where each result saved in [Label Studio's completion format](/completions.html#Completion-format). You can import annotation results in order to use them in consequent labeling task.
* (optional) **predictions** - list of model prediction results, where each result saved in [Label Studio's prediction format](/completions.html#Prediction-format). Importing predictions is useful for automatic task prelabeling & active learning.

> Note: in case when `"data"` field is missed in imported task object, the whole task body is interpreted as `task["data"]`, i.e. `[{"my_key": "my_value"}]` will be internally converted to `[{"data": {"my_key": "my_value"}}]`


#### Example
Here is an example of tasks list consists of one element, for text classification labeling project with the following label config:
```xml
<Image name="message" value="$my_text"/>
<Choices name="sentiment_class" toName="message">
    <Choice value="Positive"/>
    <Choice value="Neutral"/>
    <Choice value="Negative"/>
</Choices>
```

```yaml
[{
  # "id" is a reserved field, avoid using it when importing tasks
  "id": 123,

  # "data" requires to contain "my_text" field defined by labeling config,
  # and can optionally include other fields
  "data": {
    "my_text": "Opossum is great",
    "ref_id": 456,
    "meta_info": {
      "timestamp": "2020-03-09 18:15:28.212882",
      "location": "North Pole"
    } 
  },

  # completions are the list of annotation results matched labeling config schema
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
  # except that they also include some ML related fields like prediction "score"
  "predictions": [{
    "result": [{
      "from_name": "sentiment_class",
      "to_name": "message",
      "type": "choices",
      "value": {
        "choices": ["Neutral"]
      }
    }],
    "score": 0.95
  }]
}]
```

## Import formats

There are few possible ways to import data files to your labeling project:

 - Start Label Studio without specifying input path and then import through the web interfaces available at [http://127.0.0.1:8200/import](here)

 - Initialize Label Studio project by directly specifying the paths, e.g. `label-studio init --input-path my_tasks.json --input-format json`

The `--input-path` argument points to a file or a directory where your labeling tasks reside. By default it expects [JSON-formatted tasks](config.html#JSON-file),
but you can also specify all other formats listed bellow by using `--input-format` option.

### JSON

```bash
label-studio init --input-path=my_tasks.json
```

`tasks.json` contains tasks in a [basic Label Studio JSON format](tasks.html#Basic-format)

### Directory with JSON files

```bash
label-studio init --input-path=dir/with/json/files --input-format=json-dir
```

Instead of putting all tasks into one file, you can split your input data into several _tasks.json_, and specify the directory path. Each JSON file contains tasks in a [basic Label Studio JSON format](tasks.html#Basic-format).

### CSV / TSV

> Note: Currently CSV / TSV files could be imported only in UI.

When CSV / TSV formatted text file is used, column names are interpreted as task data keys: 
```csv
my_text,optional_field
this is a first task,123
this is a second task,456
```

### Plain text

```bash
label-studio init --input-path=my_tasks.txt --input-format=text --label-config=config.xml
```

In a common scenario, you may use only one input data stream (or in other words only one [object tag](/tags) specified in label config). In this case, you don't need to use JSON format, but simply write down your values in a plain text file, line by line, e.g.

```text
this is a first task
this is a second task
```

### Directory with plain text files

```bash
label-studio init --input-path=dir/with/text/files --input-format=text-dir --label-config=config.xml
```

You can split your input data into several plain text files, and specify the directory path. Then Label Studio scans each file line-by-line, creating one task per line. Each plain text file is formatted the same as above.

### Directory with image files

```bash
label-studio init --input-path=dir/with/images --input-format=image-dir --label-config=config.xml
```

You can point to a local directory, which is scanned recursively for image files. Each file is used to create one task.
Since Label Studio works only with URLs, a web link is created for each task, pointing to your local directory as follows:

```
http://<host:port>/static/filename?d=<path/to/the/local/directory>
```

Supported formats are `.png, .jpg, .jpeg, .tiff, .bmp, .gif`

### Directory with audio files

```bash
label-studio init --input-path=my/audios/dir --input-format=audio-dir --label-config=config.xml
```

You can point to a local directory, which is scanned recursively for audio files. Each file is used to create one task.
Since Label Studio works only with URLs, a web link is created for each task, pointing to your local directory as follows:

```
http://<host:port>/static/filename?d=<path/to/the/local/directory>
```

Supported formats are `.wav, .aiff, .mp3, .au, .flac`


## Import using API

Use API to import tasks in [Label Studio basic format](tasks.html#Basic-format) if for some reason you can't access neither to local filesystem nor Web UI (e.g. if you are creating a data stream)

```bash
curl -X POST -H Content-Type:application/json http://localhost:8200/api/import \
--data "[{\"my_key\": \"my_value_1\"}, {\"my_key\": \"my_value_2\"}]"
```

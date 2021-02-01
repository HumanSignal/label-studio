---
title: Tasks
type: guide
order: 102
---

## Basic format

Label Studio expects the JSON-formatted list of _tasks_ as input. Each _task_ is a dictionary-like structure, with some specific keys reserved for internal use:

* **data** - task body is represented as a dictionary `{"key": "value"}`. It is possible to store any number of key-value pairs within task data, but there should be _source keys_ defined by [label config](/guide/setup.html#Labeling-config) (i.e. what is defined by object tag's attribute `value="$key"`).
    Depending on the object tag type, field values are interpreted differently:
    - `<Text value="$key">`: `value` is taken as plain text
    - `<HyperText value="$key">`: `value` is a HTML markup
    - `<HyperText value="$key" encoding="base64">`: `value` is a base64 encoded HTML markup
    - `<Audio value="$key">`: `value` is taken as a valid URL to audio file
    - `<AudioPlus value="$key">`: `value` is taken as a valid URL to an audio file with CORS policy enabled on the server side
    - `<Image value="$key">`: `value` is a valid URL to an image file
    - `<TimeSeries value="$key">`: `value` is a valid URL to an CSV/TSV file if `valueType="url"` otherwise it should be JSON dict with column-arrays `"value": {"first_column": [...], ...}` if `valueType="json"`
* (optional) **id** - integer task ID
* (optional) **completions** - list of output annotation results, where each result is saved using [Label Studio's completion format](/guide/export.html#completions). You can import annotation results in order to use them in consequent labeling task.
* (optional) **predictions** - list of model prediction results, where each result is saved using [Label Studio's prediction format](/guide/export.html#predictions). Importing predictions is useful for automatic task prelabeling & active learning & exploration.

> Note: in case `"data"` field is missing in imported task object, the whole task body is interpreted as `task["data"]`, i.e. `[{"my_key": "my_value"}]` will be internally converted to `[{"data": {"my_key": "my_value"}}]`


#### Example

Here is an example of a config and tasks list composed of one element, for text classification project:

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

```yaml
[{
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
  # score is used for active learning sampling mode
    "score": 0.95
  }]
}]
```

## Import formats

There are a few possible ways to import data files to your labeling project:

 - Start Label Studio without specifying input path and then import through the web interfaces available at [http://localhost:8080/import](http://localhost:8080/import)

 - Initialize Label Studio project and directly specify the paths, e.g. `label-studio init --input-path my_tasks.json --input-format json`

The `--input-path` argument points to a file or a directory where your labeling tasks reside. By default it expects [JSON-formatted tasks](tasks.html#JSON), but you can also specify all other formats listed bellow by using `--input-format` option.

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

> Note: that if you add more files into the directory then you need to restart Label Studio server.

### CSV / TSV

When CSV / TSV formatted text file is used, column names are interpreted as task data keys: 
```csv
my_text,optional_field
this is a first task,123
this is a second task,456
```

> Note: Currently CSV / TSV files could be imported only in UI.

> Note: If your config has one TimeSeries instance then CSV/TSV will be interpreted as time series data while import. This CSV/TSV will be hosted as a resource file. The LS will create a task automatically with a proper link to the uploaded CSV/TSV.

### Plain text

```bash
label-studio init my-project --input-path=my_tasks.txt --input-format=text --label-config=config.xml
```

In a typical scenario, you may use only one input data stream (or in other words only one [object tag](/tags) specified in label config). In this case, you don't need to use JSON format, but simply write down your values in a plain text file, line by line, e.g.

```text
this is a first task
this is a second task
```

### Directory with plain text files

```bash
label-studio init my-project --input-path=dir/with/text/files --input-format=text-dir --label-config=config.xml
```

You can split your input data into several plain text files, and specify the directory path. Then Label Studio scans each file line-by-line, creating one task per line. Each plain text file is formatted the same as above.

### Directory with image files

```bash
label-studio init my-project --input-path=dir/with/images --input-format=image-dir --label-config=config.xml --allow-serving-local-files
```

> WARNING: "--allow-serving-local-files" is intended to use only for locally running instances: avoid using it for remote servers unless you are sure what you're doing.

You can point to a local directory, which is scanned recursively for image files. Each file is used to create one task. Since Label Studio works only with URLs, a web link is created for each task, pointing to your local directory as follows:

```
http://<host:port>/data/filename?d=<path/to/the/local/directory>
```

Supported formats are: `.png` `.jpg` `.jpeg` `.tiff` `.bmp` `.gif`

### Directory with audio files

```bash
label-studio init my-project --input-path=my/audios/dir --input-format=audio-dir --label-config=config.xml --allow-serving-local-files
```

> WARNING: "--allow-serving-local-files" is intended to use only for locally running instances: avoid using it for remote servers unless you are sure what you're doing.

You can point to a local directory, which is scanned recursively for audio files. Each file is used to create one task. Since Label Studio works only with URLs, a web link is created for each task, pointing to your local directory as follows:

```
http://<host:port>/data/filename?d=<path/to/the/local/directory>
```

Supported formats are: `.wav` `.aiff` `.mp3` `.au` `.flac`

### Upload resource files on Import page

For label configs with one data key (e.g.: one input image) Label Studio supports a file uploading via GUI, just drag & drop your files (or select them from file dialog) on "Import" page. This option is suitable for limited file number.     


## Import using API

Import your data using server API. Check [API page](api.html) for more details.


## Sampling

You can define the way of how your imported tasks are exposed to annotators. Several options are available. To enable one of them, specify `--sampling=<option>` as command line option.

#### sequential

Tasks are ordered ascending by their `"id"` fields. This is default mode.

#### uniform

Tasks are sampled with equal probabilities.

#### prediction-score-min

Task with minimum average prediction score is taken. When this option is set, `task["predictions"]` list should be presented along with `"score"` field within each prediction.

#### prediction-score-max

Task with maximum average prediction score is taken. When this option is set, `task["predictions"]` list should be presented along with `"score"` field within each prediction.

---
title: Import data
type: guide
order: 101
---

## Images

### Local storage

Assume you have a folder `path/to/my/images` with images on your local machine. To annotate them, simply run:

```bash
label-studio start my-project --init --input-path=path/to/my/images --input-format=image-dir --allow-serving-local-files --template image_bbox 
```

### Remote storage

Assume you have a list of image URLs. First place them in a single file `images.txt`:

```txt
https://my.domain.com/image1.jpg
https://my.domain.com/image2.jpg
https://my.domain.com/image3.jpg
```

Open the Label Studio app. On the **Setup** page, choose any of Audio annotation projects. Go to the **Import** page. Drag-n-drop `images.txt` or select it via import dialog.

### Cloud storage

Assume you have GCP or S3 bucket you want to connect to stream your images from there. Read more [here](/guide/storage.html) how to connect common cloud storages.


## Text files

Create file `texts.json`: 

```json
[
{"text":  "1st text"},
{"text":  "2nd text"},
{"text":  "3rd text"}
]
```

Then import that file via Label Studio UI on **Import** page.


## Audios

### Local storage

Assume you have a folder `path/to/my/audios` with audio files on your local machine. To annotate them, simply run:

```bash
label-studio start my-project --init --input-path=path/to/my/audios --input-format=audio-dir --allow-serving-local-files --template audio_transcribe
```

### Remote storage

Assume you have a list of audio URLs. First place them in a single file `audios.txt`:

```txt
https://my.domain.com/audio1.jpg
https://my.domain.com/audio2.jpg
https://my.domain.com/audio3.jpg
```

Open the Label Studio app. On the **Setup** page, choose any of Audio annotation projects. Go to the **Import** page. Drag-n-drop `audios.txt` or select it via import dialog.

### Cloud storage

Assume you have GCP or S3 bucket you want to connect to stream your images from there. Read more [here](/guide/storage.html) how to connect common cloud storages.



## Time Series

### Local storage

Assume you have a folder `path/to/my/timeseries` on your local machine, containing multiple `.csv` files (one [CSV formatted file](/templates/time_series.html) per each time series excerpt). 

To annotate all of them, run Label Studio app and choose any of Time Series annotation projects on **Setup** page.

Make sure that label config attributes match existed column names and formats in your CSV files (read more [here](/templates/time_series.html)).

Drag-n-drop or select all your CSV files via UI import dialog on **Import** page.

### Remote storage

Assume you have a list of time series data stored in a separate CSV files on a remote host. First place them in a single file `time-series.txt`:

```txt
https://my.domain.com/time-series1.csv
https://my.domain.com/time-series2.csv
https://my.domain.com/time-series3.csv
```

Open the Label Studio app. 

On the **Setup** page, choose any of Time Series annotation projects. 

Make sure that label config attributes match existed column names and formats in your CSV files (read more [here](/templates/time_series.html)).

Go to the **Import** page. Drag-n-drop `time-series.txt` or select it via import dialog.

### Cloud storage

Assume you have GCP or S3 bucket you want to connect to stream your images from there. Read more [here](/guide/storage.html) how to connect common cloud storages.


## How to import preannotations

Besides raw data like images, texts, audios or time series, you can also import _preannotations_ - prebuilt annotations typically coming from machine learning model predictions.
To do this, you need to create import data using the [Label Studio input JSON format](#Basic-format).

For example, if you're going to use image annotation with bounding boxes (e.g. by selecting `--template image_bbox`), here how the `input.json` file with a single image looks like:

```yaml
# here only one task is presented - you can expand the list
[{
  "data": {
    # "image_url" follows label config's attribute <Image value="$image_url" ...
    "image_url": "https://my.domain.com/image1.jpg",
  },
  # "predictions" contain list of different preannotations for the current task
  "predictions": [{
    # "result" contains list of bounding boxes
    "result": [{
        # "from_name" follows label config's attribute <RectangleLabels name="label" ...
        "from_name": "label",
        # "to_name" follows label config's attribute <Image name="image" ...
        "to_name": "image",
        "type": "rectanglelabels",
        "original_width": 600,
        "original_height": 403,
        "image_rotation": 0,
        "value": {
            # Bounding box data - values are in percentages of image width/height!
            "x": 16.09,
            "y": 27.71,
            "width": 33.90,
            "height": 42.28,
            "rotation": 0,
            "rectanglelabels": [
                "Airplane"
            ]
        },
        # "score" per one bounding box is used to sort them in UI
        "score": 0.87
    }],
    # overall score could be used to make active-learning style data sampling
    "score": 0.95
  }]
}]
```

For the wide range of different data types / formats, please address [Label Studio input JSON format section.](#Basic-format)

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
  # score is used for active learning sampling mode
    "score": 0.95
  }]
}]
```

## Other supported formats

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


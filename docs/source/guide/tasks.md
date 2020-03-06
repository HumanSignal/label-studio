---
title: Import tasks
type: guide
order: 101
---

There are two possible ways to import data to your labeling project:

 - Start Label Studio without specifying input path and then import through the web interfaces available at [http://127.0.0.1:8200/import](here)

 - Initialize Label Studio project by directly specifying the paths, e.g. `label-studio init --input-path my_tasks.json --input-format json`

The `--input-path` argument points to a file or a directory where your labeling tasks reside. By default it expects [JSON-formatted tasks](config.html#JSON-file),
but you can also specify all other formats listed bellow by using `--input-format` option. 


## from JSON

```bash
label-studio init --input-path=my_tasks.json
```

The most common format for input tasks is single JSON-formatted file _tasks.json_ with tasks are expected to be a list of objects like:
```json
[
  {"my_key": "my_value_1"},
  {"my_key": "my_value_2"}
]
```
`"my_key"` is specified by `value` attribute from some [object tag from label config](/tags/text.html), e.g. `<Text value="$my_key"/>`. Any other fields are optional within task.
Depending on the object tag type, field values are interpreted differently:

- `<Text>`: value is taken as plain text
- `<Audio>`: value is taken as a valid URL to audio file
- `<AudioPlus>`: value is taken as a valid URL to an audio file with CORS policy enabled on the server side
- `<Image>`: is a valid URL to an image file

### Predefined completions and predictions

In case you want to import predefined completions and/or predictions for labeling (e.g. after being exported from another Label Studio's project in [JSON format](#Export-data)),
use the following high level task structure
```json
{
  "data": {"my_key": "my_value_1"},
  "completions": [...],
  "predictions": [...]
}
```
where `"completions"` and `"predictions"` are taken from [raw completion format](completions.html#Completion-fields)

## from directory with JSON files

```bash
label-studio init --input-path=dir/with/json/files --input-format=json-dir
```

Instead of putting all tasks into one file, you can split your input data into several _tasks.json_, and specify the directory path. Each JSON file is formatted the same as above.

## from CSV, TSV

When CSV/TSV formatted text file is used, column names are interpreted in the same manner as keys in JSON formatted file, i.e.
```csv
my_key
my_value_1
my_value_2
```
Here `"my_key"` is specified by `value` attribute from some [object tag from label config](/tags/text.html), e.g. `<Text value="$my_key"/>`.

## from plain text

```bash
label-studio init --input-path=my_tasks.txt --input-format=text
```

In a common scenario, you may use only one input data stream (or in other words only one [object tag](/tags) specified in label config). In this case, you don't need to use JSON format, but simply write down your values in a plain text file, line by line, e.g.

```text
my_value_1
my_value_2
...
```
Values interpretation is the same as in [single JSON file](tasks.html#from-JSON) case


## from directory with text files

```bash
label-studio init --input-path=dir/with/text/files --input-format=text-dir
```

You can split your input data into several plain text files, and specify the directory path. Each plain text file is formatted the same as above.

## from directory with image files

```bash
label-studio init --input-path=dir/with/images --input-format=image-dir
```

You can point to a local directory, which is scanned recursively for image files. Each file is used to create one task. 

Supported formats are `.png, .jpg, .jpeg, .tiff, .bmp, .gif`

## from directory with audio files

```bash
label-studio init --input-path=my/audios/dir --input-format=audio-dir
```

You can point to a local directory, which is scanned recursively for image files. Each file is used to create one task. 

Supported formats are `.wav, .aiff, .mp3, .au, .flac`

## from API

Use API to import tasks in [JSON format](tasks.html#from-JSON) if for some reason you can't access neither to local filesystem nor Web UI (e.g. if you are creating a data stream)

```bash
curl -X POST -H Content-Type:application/json http://localhost:8200/api/import \
--data "[{\"my_key\": \"my_value_1\"}, {\"my_key\": \"my_value_2\"}]"
```

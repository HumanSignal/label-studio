---
title: Configuration
type: guide
order: 505
---

## Import data

You can import the data directly through the web interfaces available [http://127.0.0.1:8200/import](here) or alternatively by directly specifying the paths in your project folder. Edit server configuration file under [`"input_path"` option](config.md#input_path)

Supported file formats are:

### JSON file

The most common format for input tasks is single JSON-formatted file _tasks.json_ with tasks are expected to be list of objects like:
```json
[
  {"my_key": "my_value_1"},
  {"my_key": "my_value_2"}
]
```
`"my_key"` is specified by `value` attribute from some [object tag from label config](/config.md), e.g. `<Text value="$my_key"/>`. Any other fields are optional within task.
Depending on object tag type, field values are interpreted differently:

- `<Text>`: value is taken as plain text
- `<Audio>`: value is taken as a valid URL to audio file
- `<AudioPlus>`: value is taken as a valid URL to audio file with CORS policy enabled on server side
- `<Image>`: is a valid URL to image file


### Directory with JSON files

Instead of putting all tasks into one file, you can split your input data into several _tasks.json_, and specify directory path. 
Each JSON file is formatted the same as above.


### CSV, TSV

When CSV/TSV formatted text file is used, column names are interpreted in the same manner as keys in JSON formatted file.


### Plain text file
In a common scenario you may use only one input data stream (or in other words only one [object tag](config) specified in label config).
In this case you don't need to use JSON format, but simply write down your values in plain text file, line by line, e.g.

```text
my_value_1
my_value_2
...
```
Values interpretation is the same as in [single JSON file](config#single-json-file) case


### Directory with text files

You can split your input data into several plain text files, and specify directory path.
Each plain text file is formatted the same as above.


### Directory with image files

You can point to local directory, which is scanned recursively for image files. 
Each file is used to create one task. 

Supported formats are `.png, .jpg, .jpeg, .tiff, .bmp, .gif`


### Directory with audio files

You can point to local directory, which is scanned recursively for image files. 
Each file is used to create one task. 

Supported formats are `.wav, .aiff, .mp3, .au, .flac`
   
## Export data

The output data is stored in _completions_ - JSON formatted files, one per each completed task saved in project directory in `completions` folder or in the [`"output_dir"` option](config.md#output_dir)

The example structure of _completion_ is the following:

```json
{
    "completions": [
        {
            "id": "1001",
            "lead_time": 15.053,
            "result": [
                {
                    "from_name": "tag",
                    "id": "Dx_aB91ISN",
                    "source": "$image",
                    "to_name": "img",
                    "type": "rectanglelabels",
                    "value": {
                        "height": 10.458911419423693,
                        "rectanglelabels": [
                            "Moonwalker"
                        ],
                        "rotation": 0,
                        "width": 12.4,
                        "x": 50.8,
                        "y": 5.869797225186766
                    }
                }
            ]
        }
    ],
    "data": {
        "image": "https://htx-misc.s3.amazonaws.com/opensource/label-studio/examples/images/nick-owuor-astro-nic-visuals-wDifg5xc9Z4-unsplash.jpg"
    },
    "id": 1,
    "predictions": [
        {
            "created_ago": "3 hours",
            "model_version": "model 1",
            "result": [
                {
                    "from_name": "tag",
                    "id": "t5sp3TyXPo",
                    "source": "$image",
                    "to_name": "img",
                    "type": "rectanglelabels",
                    "value": {
                        "height": 11.612284069097889,
                        "rectanglelabels": [
                            "Moonwalker"
                        ],
                        "rotation": 0,
                        "width": 39.6,
                        "x": 13.2,
                        "y": 34.702495201535505
                    }
                }
            ]
        },
        {
            "created_ago": "4 hours",
            "model_version": "model 2",
            "result": [
                {
                    "from_name": "tag",
                    "id": "t5sp3TyXPo",
                    "source": "$image",
                    "to_name": "img",
                    "type": "rectanglelabels",
                    "value": {
                        "height": 33.61228406909789,
                        "rectanglelabels": [
                            "Moonwalker"
                        ],
                        "rotation": 0,
                        "width": 39.6,
                        "x": 13.2,
                        "y": 54.702495201535505
                    }
                }
            ]
        }
    ],
    "task_path": "../examples/image_bbox/tasks.json"
}
```

For popular machine learning libraries, there is a converter code to transform Label Studio format into ML library format. [Learn More](/guide/converters.html)  about it.

### completions

That's where list of labeling results per one task are stored.

#### id
Unique completion identifier

#### lead_time
Time in seconds spent to create this completion

#### result

Completion result data

##### id

Unique completion result identifier

##### from_name

Name of the tag that was used to label region ([control tags](?))

##### to_name

Name of the object tag that provided the region to be labeled ([object tags](?))

##### type

Type of the labeling/tag

#### value

Tag specific value that includes the labeling result details. Exact structure of value depends on chosen labeling tag. 
[Explore each tags]() for more details.


### data

Data copied from [input task](/config#Input-data)

### id

Task identifier

### predictions

Machine learning predictions (aka _prelabeling results_)

### task_path

Path to local file from where current task was taken

## Server config

Whether you start Label Studio via `label-studio` executable or `server.py` script directly, it reads server configuration settings from _config.json_ file located inside the project directory.
You can modify this file, or create your own and pass it to Label Studio.

```bash
python server.py -c your_config.json
```

### label_config 

**label_config** configures UI for the Label tool.

```json
"label_config": "../examples/chatbot/config.xml"
```

### input_path

**input_path** for tasks: it can be a file or a directory. In the case of the directory, it reads all the files and creates a list of tasks.

```json
"input_path": "./input/tasks.json"
```

### output_dir

**output_dir** is used to store completions (labeling results) in JSON format. output_dir will be created automatically. Each task is mapped to a corresponding completion JSON file.

```json
"output_dir": "./output"
```

Example: task a.json and b.json consist of 3 tasks and there will be 6 completion files in output_dir: 

```text
input/a.json = [{"text": "0"}, {"text": "1"}, {"text": "2"}]
input/b.json = [{"text": "3"}, {"text": "4"}, {"text": "5"}]

output/0.json = {"completions": [{"result": [...]}], "task": {"text": "0"}}  # a.json
output/1.json = {"completions": [{"result": [...]}], "task": {"text": "1"}}  # a.json
output/2.json = {"completions": [{"result": [...]}], "task": {"text": "2"}}  # a.json
output/3.json = {"completions": [{"result": [...]}], "task": {"text": "3"}}  # b.json
output/4.json = {"completions": [{"result": [...]}], "task": {"text": "4"}}  # b.json
output/5.json = {"completions": [{"result": [...]}], "task": {"text": "5"}}  # b.json
```

### instruction

**instruction** Shows the instruction to a person who makes labeling

```json
"instruction": "Type something to label experts!"
```

### build_path

**build_path** points to the directory with JS, CSS and other media from the app

```json
  "editor": {
    "build_path": "../build/static",
    "debug": false,
    "interfaces": [
      "basic",
      "panel",
      "submit",
      "submit:load",
      "side-column",
      "submit:skip",
      "submit:check-empty",
      "predictions:hide"
    ],
  }
```

### title

**title** name of your service for the web

```json
  "title": "Label Studio",
```

### port 

Server port
```json
"port": 8200
```

### debug

Running web server in debug mode.

```json
  "debug": true,
```

### ml_backend

Specify settings to integrate machine learning backend.

##### url
URL where ML backend serves, e.g. `"http://localhost:9090"`

##### model_name
Model name that is used to identify and store trained model.


### logger

* Python logger settings are concentrated in "logger" dict.

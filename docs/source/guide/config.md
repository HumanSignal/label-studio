---
title: Configuration
type: guide
order: 505
---

## Input data

Input should be JSON formatted. All the files that you want to label are expected to be hosted somewhere and provided as an URL in the JSON. The example backend server can process other formats, like CSV, but internally it converts any format into the JSON representation.

For an example, take a look at any of the `tasks.json` files in the `examples/` sub-directories.


## Output data

The output is JSON. The overall structure is the following:

```json
{
  "completions": [{ 
    "results": {
      "id": "yrSY-dipPI",
      "from_name": "sentiment",
      "to_name": "my_text",
      "type": "choices",
      "value": {
        "choices": ["Neutral"]
      }
    }
  }],
  "data": { "here are your task fields": "" }
}
```

A completion is an object with five mandatory fields:

- **id** unique id of the labeled region
- **from_name** name of the tag that was used to label region
- **to_name** name of the tag that provided the region to be labeled
- **type** type of the labeling/tag
- **value** tag specific value that includes the labeling result details

For popular machine learning libraries, there is a converter code to transform Label Studio format into ML library format. [Learn More](/guide/converters.html)  about it.

## Label config

UI configuration is based on XML-like tags, which internally are mapped into the associated React classes. Tags can be divided into three categories:

- Visual tags used for visual only elements
(non-interactive), examples: **View**, **Header**. 
- Control tags used to label the objects, examples: **Labels**, **Choices**, **Rating**, **TextArea**. 
- Object tags used to show elements that can be labeled: **Image**, **Text**, **Audio**, **AudioPlus**.

<a class="button" href="/tags/">Explore Tags</a>


## Server config

Whether you start Label Studio via `label-studio` executable or `server.py` script, it reads server configuration settings from _config.json_ file.
You can modify this file, or right your own and start Label Studio with

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
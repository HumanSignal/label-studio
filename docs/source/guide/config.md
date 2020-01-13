---
title: Configuration
type: guide
order: 505
---

Whether you start Label Studio via `label-studio` executable or `server.py` script directly, it reads server configuration settings from _config.json_ file located inside the project directory.
You can modify this file, or create your own and pass it to Label Studio.

```bash
python server.py -c your_config.json
```

## Server options

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
Model name that is used to identify and store a trained model.


### logger

* Python logger settings are concentrated in "logger" dict.

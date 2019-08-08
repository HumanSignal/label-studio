# Backend

## Getting Started

This is an example of the backend that can be used with the React frontend
part. By default, the backend uses label tool scripts from ../build.  

## Linux & Ubuntu guide

1 Install python and virtualenv. We recommend to use python 3.6, but probably python 2 solution will work too.  
```
apt install python3.6
pip3 install virtualenv
```

2 Setup python virtual environment 
```
virtualenv -p python3 env3
source env3/bin/activate
```

3 Install requirements 
```
pip install -r requirements.txt
```

4 Run service
```bash
python server.py
```

5 Go to http://localhost:8200


# Backend Config

By default service.py uses config.json. But you may call it with your own config: 
```
python service.py -c <your_config.json>
``` 

## Options

* Label_config is the most important key, it implements task logic and view for Label tool.
```
"label_config": "../examples/chatbot/config.xml"
```
 
* input_path for tasks: it can be a file or a directory. 
In case of directory all tasks will be merged together.
```
"input_path": "./input/tasks.json",
```

* output_dir is used to store completions (labeling results) in json format. 
output_dir will be created automatically. Each task is mapped to corresponding completion json file.

```
"output_dir": "./output",
``` 
 
Example: task a.json and b.json consist of 3 tasks and there will be 6 completion files in output_dir: 
```
input/a.json = [{"text": "0"}, {"text": "1"}, {"text": "2"}]
input/b.json = [{"text": "3"}, {"text": "4"}, {"text": "5"}]

output/0.json = {"completions": [{"result": [...]}], "task": {"text": "0"}}  # a.json
output/1.json = {"completions": [{"result": [...]}], "task": {"text": "1"}}  # a.json
output/2.json = {"completions": [{"result": [...]}], "task": {"text": "2"}}  # a.json
output/3.json = {"completions": [{"result": [...]}], "task": {"text": "3"}}  # b.json
output/4.json = {"completions": [{"result": [...]}], "task": {"text": "4"}}  # b.json
output/5.json = {"completions": [{"result": [...]}], "task": {"text": "5"}}  # b.json
```

* Show instruction to person who makes labelling
```
"instruction": "Type something to label experts!",
```

* Label tool (we call it Editor) section, 
build_path - this points to the directory with js, css and other media from Editor (React app).    
```
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
  },  
```


* Name of your service for web
```
  "title": "Label Studio",
```

* Web server settings
```
  "port": 8200,
  "debug": true,
```

* Python logger settings are concentrated in "logger" dict.   

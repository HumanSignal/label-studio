# Backend

## Getting Started

This is an example of the backend that can be used with the frontend
part.

## Linux & Ubuntu guide

1 Install python and virtualenv 
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
python service.py
```

4 Go to http://localhost:8200


# Backend Config

By default service.py uses config.json. But you may call it with your own config: 
```
service.py local_config.json
``` 

## Options

* Name of your service for web
```
  "title": "Label Studio",
```

* Service system settings
```
  "port": 8200,
  "debug": true,
```

* Label_config is the most important key, it implements task logic and view in Label tool.
```
"label_config": "../examples/chatbot/config.xml"
```
 
* input_path for tasks: it can be a file or a directory. 
In case of directory all tasks will be merged together.
```
"input_path": "./input/tasks.json",
```

* output_dir is used to store completions (results of labeling) in json format. 
output_dir will be created automatically. Each task is mapped to corresponding completion json file. 
In the end of file name we add task counter integer. 
Example: task a.json consists of 3 tasks and there will be 3 completion files for it in output_dir: 
```
input/a.json = [{"text": "1"}, {"text": "2"}, {"text": "3"}]
input/b.json = [{"text": "4"}, {"text": "5"}, {"text": "6"}]

output/a-1.json = {"result": [...]}
output/a-2.json = {"result": [...]}
output/a-3.json = {"result": [...]}
output/b-4.json = {"result": [...]}
output/b-5.json = {"result": [...]}
output/b-6.json = {"result": [...]}
```   

```
"output_dir": "./output",
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

* Python logger settings 
```
"logger": { ... python logger settings ...}
}
```

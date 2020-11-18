import json
from types import SimpleNamespace
from flask import Flask, make_response, g
from label_studio.blueprint import (blueprint as label_studio_blueprint,
                                    LabelStudioConfig, set_external_hostname, project_get_or_create)

app = Flask('my-ml-platform',  static_url_path='')
app.secret_key = 'some-secret-key'
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
app.config['WTF_CSRF_ENABLED'] = False
app.url_map.strict_slashes = False
app.register_blueprint(label_studio_blueprint, url_prefix='/label-studio')

# Warning: you need to call command below in the same directory where this file is placed:
# > label-studio init my_project

# check label_studio.utils.argparser to know all options: *_parser.add_argument(option_name, ...)
input_args = {'project_name': 'my_project', 'command': 'start', 'root_dir': '.'}
set_external_hostname('http://localhost:5000/label-studio')
app.label_studio = LabelStudioConfig(input_args=SimpleNamespace(**input_args))


@app.route('/')
def index():
    # get label studio project instance
    project = project_get_or_create()
    # get all tasks with completions from target storage and print them (target_storage ~ BaseStorage)
    tasks_with_completions = [task for task in project.target_storage.items()]
    output = json.dumps(tasks_with_completions, indent=2)
    return make_response('Welcome to our ML platform with '
                         '<a href="/label-studio">Label Studio Project "' + project.name + '"</a>' +
                         '<br><br>Task data from project: '
                         '<pre style="width:500px">' + output + '</pre>', 200)


if __name__ == '__main__':
    app.run(debug=True)

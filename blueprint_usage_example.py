""" This is an example about how Label Studio could be included into your flask app as blueprint

    1. You need to initialize LS project in the same directory where this file is placed:
        > label-studio init my_project

    2. Run this demo flask app within Label Studio python environment:
        > python blueprint_usage_example.py

    3. Go to http://localhost:5000/
"""
import json
from types import SimpleNamespace
from flask import Flask, make_response, g
from label_studio.blueprint import (blueprint as label_studio_blueprint, data_manager_blueprint, data_import_blueprint,
                                    LabelStudioConfig, set_external_hostname, project_get_or_create,
                                    app_before_request_callback, app_after_request_callback)

app = Flask('my-ml-platform',  static_url_path='')
app.secret_key = 'some-secret-key'
app.config['WTF_CSRF_ENABLED'] = False
app.url_map.strict_slashes = False  # it's very important to disable this option
app.register_blueprint(label_studio_blueprint, url_prefix='/label-studio/')
app.register_blueprint(data_manager_blueprint, url_prefix='/label-studio/')
app.register_blueprint(data_import_blueprint, url_prefix='/label-studio/')
app.before_request(app_before_request_callback)
app.after_request(app_after_request_callback)

# check label_studio.utils.argparser to know all options: *_parser.add_argument(option_name, ...)
input_args = {'project_name': 'my_project', 'command': 'start', 'root_dir': '.', 'force': False}
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
                         '<a href="/label-studio/">Label Studio Project "' + project.name + '"</a>' +
                         '<br><br>Task data from project: '
                         '<pre style="width:500px">' + output + '</pre>', 200)


if __name__ == '__main__':
    app.run(debug=True)

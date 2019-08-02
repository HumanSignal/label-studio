#!/usr/bin/env python
import os
import sys
import flask
import json  # it MUST be included after flask!
import argparse

from flask import request, jsonify, make_response, Response
from utils import exception_treatment, answer, log_config, log, config_line_stripped

import db

# init
parser = argparse.ArgumentParser()
parser.add_argument("-c", "--config", help="config filename", default="config.json")
parser.add_argument("-l", "--label-config", help="label config filename")
parser.add_argument("-p", "--port", type=int, help="server port")
parser.add_argument("-i", "--input-path", help="path with data")
parser.add_argument("-o", "--output-path", help="output path")
args = parser.parse_args()


c = json.load(open(args.config))
vargs = vars(args)
for k in vargs:
    if vargs.get(k) is not None:
        print(k)
        print(vargs.get(k))
        c[k] = vargs.get(k)


print(c)
        
app = flask.Flask(__name__, static_url_path='')
app.secret_key = 'A0Zrdqwf1AQWj12ajkhgFN]dddd/,?RfDWQQT'
db.init(c)


@app.before_first_request
def app_init():
    pass


@app.route('/static/editor/<path:path>')
def send_editor(path):
    """ Static serving
    """
    return flask.send_from_directory(c['editor']['build_path'], path)


@app.route('/static/<path:path>')
def send_static(path):
    """ Static serving
    """
    return flask.send_from_directory('static', path)


@app.route('/logs')
def send_log():
    """ Log access via web
    """
    logfile = log_config['handlers']['file']['filename']
    return Response(open(logfile).read(), mimetype='text/plain')


@app.route('/')
def index():
    """ Main page: index.html
    """
    global c

    # load config at each page reload
    # c = json.load(open(config_path))

    # find editor files to include in html
    editor_dir = c['editor']['build_path']
    editor_js_dir = os.path.join(editor_dir, 'js')
    editor_js = ['/static/editor/js/' + f for f in os.listdir(editor_js_dir) if f.endswith('.js')]
    editor_css_dir = os.path.join(editor_dir, 'css')
    editor_css = ['/static/editor/css/' + f for f in os.listdir(editor_css_dir) if f.endswith('.css')]

    # load editor config from XML
    label_config_line = config_line_stripped(open(c['label_config']).read())
    return flask.render_template('index.html', config=c, label_config_line=label_config_line,
                                 editor_css=editor_css, editor_js=editor_js)


@app.route('/tasks')
def tasks_page():
    """ Tasks and completions page: tasks.html
    """
    global c

    editor_dir = c['editor']['build_path']
    editor_css_dir = os.path.join(editor_dir, 'css')
    editor_css = ['/static/editor/css/' + f for f in os.listdir(editor_css_dir) if f.endswith('.css')]

    label_config = open(c['label_config']).read()  # load editor config from XML
    return flask.render_template('tasks.html', config=c, label_config=label_config,
                                 editor_css=editor_css,
                                 tasks=sorted(db.get_tasks().keys()), completions=db.get_completions_ids())


@app.route('/api/projects/1/next/', methods=['GET'])
@exception_treatment
def api_generate_next_task():
    """ Generate next task to label
    """
    # try to find task is not presented in completions
    completions = db.get_completions_ids()
    for (task_id, task) in db.get_tasks().items():
        if task_id not in completions:
            log.info(msg='New task for labeling', extra=task)
            return make_response(task, 200)

    # no tasks found
    return make_response('', 404)


@app.route('/api/projects/1/task_ids/', methods=['GET'])
@exception_treatment
def api_all_task_ids():
    """ Get all tasks ids
    """
    ids = sorted(list(db.get_tasks().keys()))
    return make_response(jsonify(ids), 200)


@app.route('/api/projects/1/completions_ids/', methods=['GET'])
@exception_treatment
def api_all_completion_ids():
    """ Get all completion ids
    """
    ids = db.get_completions_ids()
    return make_response(jsonify(ids), 200)


@app.route('/api/tasks/<task_id>/completions/', methods=['POST'])
@exception_treatment
def api_save_completion(task_id):
    """ Save completion to output_path with the same name as task_id
    """
    completion = request.json
    completion.pop('state', None)  # remove editor state
    db.save_completion(task_id, completion)
    log.info(msg='Completion saved', extra={'task_id': task_id, 'output': request.json})
    return answer(201, 'ok', result=[42])


@app.route('/api/projects/1/expert_instruction')
@exception_treatment
def api_instruction():
    return make_response(c['instruction'], 200)


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=c['port'], debug=c['debug'])

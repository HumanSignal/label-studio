#!/usr/bin/env python
import os
import sys
import flask
import json  # it MUST be included after flask!
import db

from flask import request, jsonify, make_response, Response
from utils import exception_treatment, answer, log_config, log, config_line_stripped, load_config


# init
c = load_config()
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

    # load config at each page reload (for fast changing of config/input_path/output_path)
    c = load_config()

    # find editor files to include in html
    editor_dir = c['editor']['build_path']
    editor_js_dir = os.path.join(editor_dir, 'js')
    editor_js = ['/static/editor/js/' + f for f in os.listdir(editor_js_dir) if f.endswith('.js')]
    editor_css_dir = os.path.join(editor_dir, 'css')
    editor_css = ['/static/editor/css/' + f for f in os.listdir(editor_css_dir) if f.endswith('.css')]

    # load editor config from XML
    label_config_line = config_line_stripped(open(c['label_config']).read())

    # task data: completions preview
    # task_id, task_data = list(db.get_tasks().items())[0]
    # task_data['completions'] = [db.get_completion(task_id)]
    task_data = None
    return flask.render_template('index.html', config=c, label_config_line=label_config_line,
                                 editor_css=editor_css, editor_js=editor_js, task_data=task_data)


@app.route('/tasks')
def tasks_page():
    """ Tasks and completions page: tasks.html
    """
    global c
    c = load_config()
    label_config = open(c['label_config']).read()  # load editor config from XML
    task_ids = db.get_tasks().keys()
    completed_at = db.get_completed_at(task_ids)

    # sort by completed time
    task_ids = sorted([(i, completed_at[i] if i in completed_at else '9') for i in task_ids], key=lambda x: x[1])
    task_ids = [i[0] for i in task_ids]  # take only id back
    return flask.render_template('tasks.html', config=c, label_config=label_config,
                                 task_ids=task_ids, completions=db.get_completions_ids(),
                                 completed_at=completed_at)


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


@app.route('/api/tasks/<task_id>/completions/', methods=['POST', 'DELETE'])
@exception_treatment
def api_completions(task_id):
    """ Delete or save completion to output_dir with the same name as task_id
    """
    global c

    if request.method == 'POST':
        completion = request.json
        completion.pop('state', None)  # remove editor state
        db.save_completion(task_id, completion)
        log.info(msg='Completion saved', extra={'task_id': task_id, 'output': request.json})
        return answer(201, 'ok')

    elif request.method == 'DELETE':
        if c.get('allow_delete_completions', False):
            db.delete_completion(task_id)
            return answer(204, 'deleted')
        else:
            return answer(422, 'Completion removing is not allowed in server config')
    else:
        return answer(500, 'Incorrect request method')


@app.route('/api/projects/1/expert_instruction')
@exception_treatment
def api_instruction():
    return make_response(c['instruction'], 200)


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=c['port'], debug=c['debug'])

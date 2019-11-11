#!/usr/bin/env python
from __future__ import print_function

import os
import flask
import json  # it MUST be included after flask!
import utils.db as db

from inspect import currentframe, getframeinfo
from flask import request, jsonify, make_response, Response
from utils.misc import (
    exception_treatment, log_config, log, config_line_stripped, load_config
)
from utils.analytics import Analytics


app = flask.Flask(__name__, static_url_path='')
app.secret_key = 'A0Zrdqwf1AQWj12ajkhgFN]dddd/,?RfDWQQT'


# init
c = None
# load editor config from XML
label_config_line = None
# analytics
analytics = None


def reload_config():
    global c
    global label_config_line
    global analytics
    c = load_config()
    label_config_line = config_line_stripped(open(c['label_config']).read())
    if analytics is None:
        analytics = Analytics(label_config_line, c.get('collect_analytics', True))
    else:
        analytics.update_info(label_config_line, c.get('collect_analytics', True))


@app.template_filter('json')
def json_filter(s):
    return json.dumps(s)


@app.before_first_request
def app_init():
    pass


@app.route('/static/editor/<path:path>')
def send_editor(path):
    """ Static for label tool js and css
    """
    return flask.send_from_directory(c['editor']['build_path'], path)


@app.route('/static/media/<path:path>')
def send_media(path):
    """ Static for label tool js and css
    """
    return flask.send_from_directory(c['editor']['build_path'] + '/media', path)


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
    global label_config_line

    # reload config at each page reload (for fast changing of config/input_path/output_path)
    reload_config()

    # find editor files to include in html
    editor_dir = c['editor']['build_path']
    editor_js_dir = os.path.join(editor_dir, 'js')
    editor_js = ['/static/editor/js/' + f for f in os.listdir(editor_js_dir) if f.endswith('.js')]
    editor_css_dir = os.path.join(editor_dir, 'css')
    editor_css = ['/static/editor/css/' + f for f in os.listdir(editor_css_dir) if f.endswith('.css')]

    # task data: load task or task with completions if it exists
    task_data = None
    task_id = request.args.get('task_id', None)

    if task_id is not None:
        task_data = db.get_completions(task_id)
        if task_data is None:
            task_data = db.get_task(task_id)

    analytics.send(getframeinfo(currentframe()).function)
    return flask.render_template('index.html', config=c, label_config_line=label_config_line,
                                 editor_css=editor_css, editor_js=editor_js,
                                 task_id=task_id, task_data=task_data)


@app.route('/tasks')
def tasks_page():
    """ Tasks and completions page: tasks.html
    """
    global c
    reload_config()
    label_config = open(c['label_config']).read()  # load editor config from XML
    task_ids = db.get_tasks().keys()
    completed_at = db.get_completed_at(task_ids)

    # sort by completed time
    task_ids = sorted([(i, completed_at[i] if i in completed_at else '9') for i in task_ids], key=lambda x: x[1])
    task_ids = [i[0] for i in task_ids]  # take only id back
    analytics.send(getframeinfo(currentframe()).function)
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
            analytics.send(getframeinfo(currentframe()).function)
            return make_response(jsonify(task), 200)

    # no tasks found
    analytics.send(getframeinfo(currentframe()).function, error=404)
    return make_response('', 404)


@app.route('/api/projects/1/task_ids/', methods=['GET'])
@exception_treatment
def api_all_task_ids():
    """ Get all tasks ids
    """
    ids = sorted(db.get_task_ids())
    analytics.send(getframeinfo(currentframe()).function)
    return make_response(jsonify(ids), 200)


@app.route('/api/tasks/<task_id>/', methods=['GET'])
@exception_treatment
def api_tasks(task_id):
    """ Get task by id
    """
    # try to get task with completions first
    task_data = db.get_completions(task_id)
    task_data = db.get_task(task_id) if task_data is None else task_data
    analytics.send(getframeinfo(currentframe()).function)
    return make_response(jsonify(task_data), 200)


@app.route('/api/projects/1/completions_ids/', methods=['GET'])
@exception_treatment
def api_all_completion_ids():
    """ Get all completion ids
    """
    ids = db.get_completions_ids()
    analytics.send(getframeinfo(currentframe()).function)
    return make_response(jsonify(ids), 200)


@app.route('/api/tasks/<task_id>/completions/', methods=['POST', 'DELETE'])
@exception_treatment
def api_completions(task_id):
    """ Delete or save new completion to output_dir with the same name as task_id
    """
    global c

    if request.method == 'POST':
        completion = request.json
        completion.pop('state', None)  # remove editor state
        completion_id = db.save_completion(task_id, completion)
        log.info(msg='Completion saved', extra={'task_id': task_id, 'output': request.json})
        analytics.send(getframeinfo(currentframe()).function)
        return make_response(json.dumps({'id': completion_id}), 201)

    else:
        analytics.send(getframeinfo(currentframe()).function, error=500)
        return make_response('Incorrect request method', 500)


@app.route('/api/tasks/<task_id>/completions/<completion_id>/', methods=['DELETE'])
@exception_treatment
def api_completion_by_id(task_id, completion_id):
    """ Delete or save new completion to output_dir with the same name as task_id.
        completion_id with different IDs is not supported in this backend
    """
    global c

    if request.method == 'DELETE':
        if c.get('allow_delete_completions', False):
            db.delete_completion(task_id)
            analytics.send(getframeinfo(currentframe()).function)
            return make_response('deleted', 204)
        else:
            analytics.send(getframeinfo(currentframe()).function, error=422)
            return make_response('Completion removing is not allowed in server config', 422)
    else:
        analytics.send(getframeinfo(currentframe()).function, error=500)
        return make_response('Incorrect request method', 500)


@app.route('/api/tasks/<task_id>/completions/<completion_id>/', methods=['PATCH'])
@exception_treatment
def api_completion_update(task_id, completion_id):
    """ Rewrite existing completion with patch.
        This is technical api call for editor testing only. It's used for Rewrite button in editor.
    """
    global c
    completion = request.json

    completion.pop('state', None)  # remove editor state
    completion['id'] = int(completion_id)
    db.save_completion(task_id, completion)
    log.info(msg='Completion saved', extra={'task_id': task_id, 'output': request.json})
    analytics.send(getframeinfo(currentframe()).function)
    return make_response('ok', 201)


@app.route('/api/projects/1/expert_instruction')
@exception_treatment
def api_instruction():
    analytics.send(getframeinfo(currentframe()).function)
    return make_response(c['instruction'], 200)


@app.route('/data/<path:filename>')
def get_image_file(filename):
    directory = request.args.get('d')
    return flask.send_from_directory(directory, filename, as_attachment=True)


if __name__ == "__main__":
    reload_config()
    app.run(host='0.0.0.0', port=c['port'], debug=c['debug'])

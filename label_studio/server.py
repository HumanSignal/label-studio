#!/usr/bin/env python
from __future__ import print_function

import os
import lxml
import time
import flask
import logging
import hashlib
import pandas as pd
import tarfile
try:
    import ujson as json
except:
    import json

from urllib.parse import unquote
from datetime import datetime
from copy import deepcopy
from inspect import currentframe, getframeinfo
from flask import request, jsonify, make_response, Response, Response as HttpResponse, send_file
from flask_api import status

import label_studio.utils.db as db
from label_studio.utils.functions import generate_sample_task
from label_studio.utils.analytics import Analytics
from label_studio.utils.models import DEFAULT_PROJECT_ID, Project, MLBackend
from label_studio.utils.prompts import LabelStudioConfigPrompt
from label_studio.utils.io import find_dir, find_editor_files, get_temp_file
from label_studio.utils import uploader
from label_studio.utils.validation import TaskValidator
from label_studio.utils.exceptions import ValidationError
from label_studio.utils.functions import generate_sample_task_without_check, data_examples
from label_studio.utils.misc import (
    exception_treatment, log_config, log, load_config, config_line_stripped, config_comments_free,
    get_config_templates, parse_input_args
)

logger = logging.getLogger(__name__)

app = flask.Flask(__name__, static_url_path='')
app.secret_key = 'A0Zrdqwf1AQWj12ajkhgFN]dddd/,?RfDWQQT'

# init
c = None
# load editor config from XML
label_config_line = None
# analytics
analytics = None
# machine learning backend
ml_backend = None
# project object with lazy initialization
project = None


def reload_config(prompt_inputs=False, force=False):
    global c
    global label_config_line
    global analytics
    global ml_backend
    global project

    # Read config from config.json & input arguments (dont initialize any inner DBs)
    c = load_config(re_init_db=False)
    if not c:
        return False

    # If specified, prompt user in console about specific inputs
    if prompt_inputs:
        iprompt = LabelStudioConfigPrompt(c)
        c['input_data'] = iprompt.ask_input_path()
        c['output_dir'] = iprompt.ask_output_dir()
        c['label_config'] = iprompt.ask_label_config()

    # Initialize DBs
    db.re_init(c)

    label_config_full = config_comments_free(open(c['label_config']).read())
    label_config_line = config_line_stripped(label_config_full)
    if analytics is None:
        analytics = Analytics(label_config_line, c.get('collect_analytics', True))
    else:
        analytics.update_info(label_config_line, c.get('collect_analytics', True))
    # configure project
    if project is None or force:
        project = Project(label_config=label_config_line, label_config_full=label_config_full)
    # configure machine learning backend
    if ml_backend is None or force:
        ml_backend_params = c.get('ml_backend')
        if ml_backend_params:
            ml_backend = MLBackend.from_params(ml_backend_params)
            project.connect(ml_backend)

    return True


@app.template_filter('json')
def json_filter(s):
    return json.dumps(s)


@app.before_first_request
def app_init():
    pass


@app.route('/static/media/<path:path>')
def send_media(path):
    """ Static for label tool js and css
    """
    media_dir = find_dir('static/media')
    return flask.send_from_directory(media_dir, path)


@app.route('/static/<path:path>')
def send_static(path):
    """ Static serving
    """
    static_dir = find_dir('static')
    return flask.send_from_directory(static_dir, path)


@app.route('/logs')
def send_log():
    """ Log access via web
    """
    logfile = log_config['handlers']['file']['filename']
    return Response(open(logfile).read(), mimetype='text/plain')


@app.route('/')
def labeling_page():
    """ Label studio frontend: task labeling
    """
    global c
    global label_config_line

    # reload config at each page reload (for fast changing of config/input_path/output_path)
    reload_config()

    # task data: load task or task with completions if it exists
    task_data = None
    task_id = request.args.get('task_id', None)

    if task_id is not None:
        task_data = db.get_task_with_completions(task_id) or db.get_task(task_id)
        if ml_backend:
            task_data = deepcopy(task_data)
            task_data['predictions'] = ml_backend.make_predictions(task_data, project)

    analytics.send(getframeinfo(currentframe()).function)
    return flask.render_template('labeling.html', config=c, label_config_line=label_config_line,
                                 task_id=task_id, task_data=task_data, **find_editor_files())


@app.route('/welcome')
def welcome_page():
    """ Label studio frontend: task labeling
    """
    global c, project
    reload_config()
    analytics.send(getframeinfo(currentframe()).function)
    return flask.render_template('welcome.html', config=c, project=project)


@app.route('/data')
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
    return flask.render_template('data.html', config=c, label_config=label_config,
                                 task_ids=task_ids, completions=db.get_completions_ids(),
                                 completed_at=completed_at)


@app.route('/settings')
def label_config_page():
    """ Setup label config
    """
    global c, project
    reload_config()

    templates = get_config_templates()
    analytics.send(getframeinfo(currentframe()).function)
    return flask.render_template('settings.html', config=c, project=project, templates=templates)


@app.route('/import')
def import_page():
    """ Import tasks from JSON, CSV, ZIP and more
    """
    global c, project
    reload_config()

    analytics.send(getframeinfo(currentframe()).function)
    return flask.render_template('import.html', config=c, project=project)


@app.route('/export')
def export_page():
    """ Export completions as JSON or using converters
    """
    global c, project
    reload_config()

    analytics.send(getframeinfo(currentframe()).function)
    return flask.render_template('export.html', config=c, project=project)


@app.route('/api/render-label-studio', methods=['GET', 'POST'])
def api_render_label_studio():
    """ Label studio frontend rendering for iframe
    """
    global c
    global label_config_line

    # reload config at each page reload (for fast changing of config/input_path/output_path)
    reload_config()

    # get args
    full_editor = request.args.get('full_editor', False)
    config = request.args.get('config', request.form.get('config', ''))
    config = unquote(config)
    if not config:
        return make_response('No config in POST', status.HTTP_417_EXPECTATION_FAILED)

    # prepare example
    examples = data_examples(mode='editor_preview')
    task_data = {
        data_key: examples.get(data_type, '')
        for data_key, data_type in Project.extract_data_types(config).items()
    }
    example_task_data = {
        'id': 1764,
        'data': task_data,
        'project': DEFAULT_PROJECT_ID,
        'created_at': '2019-02-06T14:06:42.000420Z',
        'updated_at': '2019-02-06T14:06:42.000420Z'
    }

    # prepare context for html
    config_line = config_line_stripped(config)
    response = {
        'label_config_line': config_line,
        'task_ser': example_task_data
    }
    response.update(find_editor_files())
    analytics.send(getframeinfo(currentframe()).function)
    return flask.render_template('render_ls.html', **response)


@app.route('/api/validate-config', methods=['POST'])
def api_validate_config():
    """ Validate label config via tags schema
    """
    global project
    if 'label_config' not in request.form:
        return make_response('No label_config in POST', status.HTTP_417_EXPECTATION_FAILED)

    try:
        project.validate_label_config(request.form['label_config'])
    except ValidationError as e:
        return make_response(jsonify({'label_config': e.msg_to_list()}), status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return make_response(jsonify({'label_config': [str(e)]}), status.HTTP_400_BAD_REQUEST)

    return Response(status=status.HTTP_204_NO_CONTENT)


@app.route('/api/save-config', methods=['POST'])
def api_save_config():
    """ Save label config
    """
    global c, project
    if 'label_config' not in request.form:
        return make_response('No label_config in POST', status.HTTP_417_EXPECTATION_FAILED)

    # check config before save
    label_config = request.form['label_config']
    try:
        project.validate_label_config(label_config)
    except ValidationError as e:
        return make_response(jsonify({'label_config': e.msg_to_list()}), status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return make_response(jsonify({'label_config': [str(e)]}), status.HTTP_400_BAD_REQUEST)

    # save xml label config to file
    path = c['label_config']
    open(path, 'w').write(label_config)
    logger.info(f'Label config saved to: {path}')

    reload_config(force=True)
    analytics.send(getframeinfo(currentframe()).function)
    return Response(status=status.HTTP_201_CREATED)


@app.route('/api/import-example', methods=['GET', 'POST'])
def api_import_example():
    """ Generate upload data example by config only
    """
    # django compatibility
    request.GET = request.args
    request.POST = request.form

    config = request.GET.get('label_config', '')
    if not config:
        config = request.POST.get('label_config', '')
    try:
        Project.validate_label_config(config)
        output = generate_sample_task_without_check(config, mode='editor_preview')
    except (ValueError, ValidationError, lxml.etree.Error, KeyError):
        response = HttpResponse('error while example generating', status=status.HTTP_400_BAD_REQUEST)
    else:
        response = HttpResponse(json.dumps(output))
    return response


@app.route('/api/import-example-file')
def api_import_example_file():
    """ Task examples for import
    """
    global c, project
    reload_config()
    request.GET = request.args  # django compatibility

    q = request.GET.get('q', 'json')
    filename = 'sample-' + datetime.now().strftime('%Y-%m-%d-%H-%M')
    try:
        task = generate_sample_task(project)
    except (ValueError, ValidationError, lxml.etree.Error):
        return HttpResponse('error while example generating', status=status.HTTP_400_BAD_REQUEST)

    tasks = [task, task]

    if q == 'json':
        filename += '.json'
        output = json.dumps(tasks)

    elif q == 'csv':
        filename += '.csv'
        output = pd.read_json(json.dumps(tasks), orient='records').to_csv(index=False)

    elif q == 'tsv':
        filename += '.tsv'
        output = pd.read_json(json.dumps(tasks), orient='records').to_csv(index=False, sep='\t')

    elif q == 'txt':
        if len(project.data_types.keys()) > 1:
            raise ValueError('TXT is unsupported for projects with multiple sources in config')

        filename += '.txt'
        output = ''
        for t in tasks:
            output += list(t.values())[0] + '\n'

    else:
        raise ValueError('Incorrect format ("q") in request')

    if request.GET.get('raw', '0') == '1':
        return HttpResponse(output)

    response = HttpResponse(output)
    response.headers['Content-Disposition'] = 'attachment; filename=%s' % filename
    response.headers['filename'] = filename

    analytics.send(getframeinfo(currentframe()).function)
    return response


@app.route('/api/import', methods=['POST'])
def api_import():
    global project, c

    # make django compatibility for uploader module
    class DjangoRequest:
        POST = request.form
        GET = request.args
        FILES = request.files
        data = request.json if request.json else request.form
        content_type = request.content_type

    start = time.time()
    # get tasks from request
    parsed_data = uploader.load_tasks(DjangoRequest())
    # validate tasks
    validator = TaskValidator(project)
    try:
        new_tasks = validator.to_internal_value(parsed_data)
    except ValidationError as e:
        return make_response(jsonify(e.msg_to_list()), status.HTTP_400_BAD_REQUEST)

    # save task file to input dir
    if os.path.isdir(c['input_path']):
        # tasks are in directory, write a new file with tasks
        task_dir = c['input_path']
        now = datetime.now()
        data = json.dumps(new_tasks, ensure_ascii=False)
        md5 = hashlib.md5(json.dumps(data).encode('utf-8')).hexdigest()
        name = 'import-' + now.strftime('%Y-%m-%d-%H-%M') + f'-{md5[0:8]}'
        path = os.path.join(task_dir, name + '.json')
        tasks = new_tasks
    else:
        # tasks are all in one file, append it
        path = c['input_path']
        old_tasks = json.load(open(path))
        assert isinstance(old_tasks, list), 'Tasks from input_path must be list'
        tasks = old_tasks + new_tasks
        logger.error(f"It's recommended to use directory as input_path: "
                     f"{c['input_path']} -> {os.path.dirname(c['input_path'])}")

    with open(path, 'w') as f:
        json.dump(tasks, f, ensure_ascii=False, indent=4)

    # load new tasks
    db.re_init(c)

    duration = time.time() - start
    return make_response(jsonify({
        'task_count': len(new_tasks),
        'completion_count': validator.completion_count,
        'prediction_count': validator.prediction_count,
        'duration': duration
    }), status.HTTP_201_CREATED)


@app.route('/api/export', methods=['GET'])
def api_export():
    global c

    output_dir = c['output_dir']
    with get_temp_file() as temp_file:
        archive_name = temp_file + '.tar.gz'
        with tarfile.open(archive_name, mode='w:gz') as archive:
            archive.add(output_dir, recursive=True)
        return send_file(archive_name)


@app.route(f'/api/projects/{DEFAULT_PROJECT_ID}/next/', methods=['GET'])
@exception_treatment
def api_generate_next_task():
    """ Generate next task to label
    """
    # try to find task is not presented in completions
    completions = db.get_completions_ids()
    for task_id, task in db.iter_tasks():
        if task_id not in completions:
            log.info(msg='New task for labeling', extra=task)
            analytics.send(getframeinfo(currentframe()).function)
            # try to use ml backend for predictions
            if ml_backend:
                task = deepcopy(task)
                task['predictions'] = ml_backend.make_predictions(task, project)
            return make_response(jsonify(task), 200)

    # no tasks found
    analytics.send(getframeinfo(currentframe()).function, error=404)
    return make_response('', 404)


@app.route(f'/api/projects/{DEFAULT_PROJECT_ID}/task_ids/', methods=['GET'])
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
    task_data = db.get_task_with_completions(task_id)
    task_data = db.get_task(task_id) if task_data is None else task_data
    analytics.send(getframeinfo(currentframe()).function)
    return make_response(jsonify(task_data), 200)


@app.route(f'/api/projects/{DEFAULT_PROJECT_ID}/completions_ids/', methods=['GET'])
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
        # try to train model with new completions
        if ml_backend:
            ml_backend.update_model(db.get_task(task_id), completion, project)
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


@app.route(f'/api/projects/{DEFAULT_PROJECT_ID}/expert_instruction')
@exception_treatment
def api_instruction():
    """ Instruction for annotators
    """
    analytics.send(getframeinfo(currentframe()).function)
    return make_response(c['instruction'], 200)


@app.route('/predict', methods=['POST'])
@exception_treatment
def api_predict():
    """ Make ML prediction using ml_backend
    """
    task = request.json
    if project.ml_backend:
        predictions = project.ml_backend.make_predictions({'data': task}, project)
        analytics.send(getframeinfo(currentframe()).function)
        return make_response(jsonify(predictions), 200)
    else:
        analytics.send(getframeinfo(currentframe()).function, error=400)
        return make_response(jsonify("No ML backend"), 400)


@app.route('/data/<path:filename>')
def get_data_file(filename):
    """ External resource serving
    """
    directory = request.args.get('d')
    return flask.send_from_directory(directory, filename, as_attachment=True)


def main():
    start_server = parse_input_args()
    if start_server:
        reload_config()
        app.run(host='0.0.0.0', port=c['port'], debug=c['debug'])


def main_open_browser():
    import threading
    import webbrowser

    start_server = parse_input_args()

    if start_server:
        reload_config()
        port = c['port']
        browser_url = f'http://127.0.0.1:{port}/welcome'
        print(f'Start browser at URL: {browser_url}')
        threading.Timer(2.5, lambda: webbrowser.open(browser_url)).start()
        app.run(host='0.0.0.0', port=c['port'], debug=False)


if __name__ == "__main__":
    main()

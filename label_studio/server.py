import os
import lxml
import time
import shutil
import flask
import hashlib
import logging
import pandas as pd

try:
    import ujson as json
except:
    import json

from uuid import uuid4
from urllib.parse import unquote
from datetime import datetime
from copy import deepcopy
from inspect import currentframe, getframeinfo
from flask import request, jsonify, make_response, Response, Response as HttpResponse, send_file, session, redirect
from flask_api import status

from label_studio.utils.functions import generate_sample_task
from label_studio.utils.io import find_dir, find_editor_files, get_temp_dir
from label_studio.utils import uploader
from label_studio.utils.validation import TaskValidator
from label_studio.utils.exceptions import ValidationError
from label_studio.utils.functions import generate_sample_task_without_check, data_examples
from label_studio.utils.misc import (
    exception_treatment, log_config, log, config_line_stripped,
    get_config_templates, iter_config_templates
)
from label_studio.project import Project

logger = logging.getLogger(__name__)

app = flask.Flask(__name__, static_url_path='')
app.secret_key = 'A0Zrdqwf1AQWj12ajkhgFN]dddd/,?RfDWQQT'
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

# input arguments
input_args = None


def project_get_or_create(multi_session_force_recreate=False):
    """
    Return existed or create new project based on environment. Currently supported methods:
    - "fixed": project is based on "project_name" attribute specified by input args when app starts
    - "session": project is based on "project_name" key restored from flask.session object
    :return:
    """
    if input_args.command == 'start-multi-session':
        # get user from session
        if 'user' not in session:
            session['user'] = str(uuid4())
        user = session['user']

        # get project from session
        if 'project' not in session or multi_session_force_recreate:
            session['project'] = str(uuid4())
        project = session['project']

        project_name = user + '/' + project
        return Project.get_or_create(project_name, input_args, context={
            'user': user,
            'project': project,
            'multi_session': True,
        })
    else:
        if multi_session_force_recreate:
            raise NotImplementedError(
                '"multi_session_force_recreate" option supported only with "start-multi-session" mode')
        user = project = input_args.project_name  # in standalone mode, user and project are singletons and consts
        return Project.get_or_create(input_args.project_name, input_args, context={
            'user': user,
            'project': project,
            'multi_session': False
        })


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
    project = project_get_or_create()
    if len(project.tasks) == 0:
        return redirect('/welcome')

    # task data: load task or task with completions if it exists
    task_data = None
    task_id = request.args.get('task_id', None)

    if task_id is not None:
        task_data = project.get_task_with_completions(task_id) or project.get_task(task_id)
        if project.ml_backend:
            task_data = deepcopy(task_data)
            task_data['predictions'] = project.ml_backend.make_predictions(task_data, project)

    project.analytics.send(getframeinfo(currentframe()).function)
    return flask.render_template(
        'labeling.html',
        config=project.config,
        label_config_line=project.label_config_line,
        task_id=task_id,
        task_data=task_data,
        **find_editor_files()
    )


@app.route('/welcome')
def welcome_page():
    """ Label studio frontend: task labeling
    """
    project = project_get_or_create()
    project.analytics.send(getframeinfo(currentframe()).function)
    project.update_on_boarding_state()
    return flask.render_template(
        'welcome.html',
        config=project.config,
        project=project.project_obj,
        on_boarding=project.on_boarding
    )


@app.route('/tasks')
def tasks_page():
    """ Tasks and completions page: tasks.html
    """
    project = project_get_or_create()

    label_config = open(project.config['label_config']).read()  # load editor config from XML
    task_ids = project.get_tasks().keys()
    completed_at = project.get_completed_at(task_ids)

    # sort by completed time
    task_ids = sorted([(i, completed_at[i] if i in completed_at else '9') for i in task_ids], key=lambda x: x[1])
    task_ids = [i[0] for i in task_ids]  # take only id back
    project.analytics.send(getframeinfo(currentframe()).function)
    return flask.render_template(
        'tasks.html',
        show_paths=input_args.command != 'start-multi-session',
        config=project.config,
        label_config=label_config,
        task_ids=task_ids,
        completions=project.get_completions_ids(),
        completed_at=completed_at
    )


@app.route('/setup')
def setup_page():
    """ Setup label config
    """
    project = project_get_or_create()

    templates = get_config_templates()
    input_values = {}
    project.analytics.send(getframeinfo(currentframe()).function)
    return flask.render_template(
        'setup.html',
        config=project.config,
        project=project.project_obj,
        label_config_full=project.label_config_full,
        templates=templates,
        input_values=input_values,
        multi_session=input_args.command == 'start-multi-session'
    )


@app.route('/import')
def import_page():
    """ Import tasks from JSON, CSV, ZIP and more
    """
    project = project_get_or_create()

    project.analytics.send(getframeinfo(currentframe()).function)
    return flask.render_template(
        'import.html',
        config=project.config,
        project=project.project_obj
    )


@app.route('/export')
def export_page():
    """ Export completions as JSON or using converters
    """
    project = project_get_or_create()
    project.analytics.send(getframeinfo(currentframe()).function)
    return flask.render_template(
        'export.html',
        config=project.config,
        formats=project.converter.supported_formats,
        project=project.project_obj
    )


@app.route('/api/render-label-studio', methods=['GET', 'POST'])
def api_render_label_studio():
    """ Label studio frontend rendering for iframe
    """
    # get args
    project = project_get_or_create()

    config = request.args.get('config', request.form.get('config', ''))
    config = unquote(config)
    if not config:
        return make_response('No config in POST', status.HTTP_417_EXPECTATION_FAILED)

    # prepare example
    examples = data_examples(mode='editor_preview')
    task_data = {
        data_key: examples.get(data_type, '')
        for data_key, data_type in project.extract_data_types(config).items()
    }
    example_task_data = {
        'id': 1764,
        'data': task_data,
        'project': project.id,
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

    project.analytics.send(getframeinfo(currentframe()).function)
    return flask.render_template('render_ls.html', **response)


@app.route('/api/validate-config', methods=['POST'])
def api_validate_config():
    """ Validate label config via tags schema
    """
    if 'label_config' not in request.form:
        return make_response('No label_config in POST', status.HTTP_417_EXPECTATION_FAILED)
    project = project_get_or_create()
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
    if 'label_config' not in request.form:
        return make_response('No label_config in POST', status.HTTP_417_EXPECTATION_FAILED)

    project = project_get_or_create()
    # check config before save
    label_config = request.form['label_config']
    try:
        project.validate_label_config(label_config)
    except ValidationError as e:
        return make_response(jsonify({'label_config': e.msg_to_list()}), status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return make_response(jsonify({'label_config': [str(e)]}), status.HTTP_400_BAD_REQUEST)

    project.update_label_config(label_config)
    project.reload()
    project.analytics.send(getframeinfo(currentframe()).function)
    return Response(status=status.HTTP_201_CREATED)


@app.route('/api/import-example', methods=['GET', 'POST'])
def api_import_example():
    """ Generate upload data example by config only
    """
    # django compatibility
    request.GET = request.args
    request.POST = request.form
    project = project_get_or_create()
    config = request.GET.get('label_config', '')
    if not config:
        config = request.POST.get('label_config', '')
    try:
        project.validate_label_config(config)
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
    project = project_get_or_create()
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

    project.analytics.send(getframeinfo(currentframe()).function)
    return response


@app.route('/api/import', methods=['POST'])
def api_import():
    project = project_get_or_create()

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
    if os.path.isdir(project.config['input_path']):
        # tasks are in directory, write a new file with tasks
        task_dir = project.config['input_path']
        now = datetime.now()
        data = json.dumps(new_tasks, ensure_ascii=False)
        md5 = hashlib.md5(json.dumps(data).encode('utf-8')).hexdigest()
        name = 'import-' + now.strftime('%Y-%m-%d-%H-%M') + '-' + str(md5[0:8])
        path = os.path.join(task_dir, name + '.json')
        tasks = new_tasks
    else:
        # tasks are all in one file, append it
        path = project.config['input_path']
        old_tasks = json.load(open(path))
        assert isinstance(old_tasks, list), 'Tasks from input_path must be list'
        tasks = old_tasks + new_tasks
        logger.error("It's recommended to use directory as input_path: " +
                     project.config['input_path'] + ' -> ' + os.path.dirname(project.config['input_path']))

    with open(path, 'w') as f:
        json.dump(tasks, f, ensure_ascii=False, indent=4)

    # load new tasks
    project.reload()

    duration = time.time() - start
    return make_response(jsonify({
        'task_count': len(new_tasks),
        'completion_count': validator.completion_count,
        'prediction_count': validator.prediction_count,
        'duration': duration
    }), status.HTTP_201_CREATED)


@app.route('/api/export', methods=['GET'])
def api_export():
    export_format = request.args.get('format')
    project = project_get_or_create()
    now = datetime.now()
    completion_dir = project.config['output_dir']
    export_dirname = now.strftime('%Y-%m-%d-%H-%M-%S')
    with get_temp_dir() as temp_dir:
        export_dirpath = os.path.join(temp_dir, export_dirname)
        project.converter.convert(completion_dir, export_dirpath, format=export_format)
        shutil.make_archive(export_dirpath, 'zip', export_dirpath)
        export_zipfile = export_dirpath + '.zip'
        response = send_file(export_zipfile, as_attachment=True)
        response.headers['filename'] = os.path.basename(export_zipfile)
        project.analytics.send(getframeinfo(currentframe()).function)
        return response


@app.route('/api/projects/1/next/', methods=['GET'])
@exception_treatment
def api_generate_next_task():
    """ Generate next task to label
    """
    # try to find task is not presented in completions
    project = project_get_or_create()
    completions = project.get_completions_ids()
    for task_id, task in project.iter_tasks():
        if task_id not in completions:
            log.info(msg='New task for labeling', extra=task)
            project.analytics.send(getframeinfo(currentframe()).function)
            # try to use ml backend for predictions
            if project.ml_backend:
                task = deepcopy(task)
                task['predictions'] = project.ml_backend.make_predictions(task, project.project_obj)
            return make_response(jsonify(task), 200)

    # no tasks found
    project.analytics.send(getframeinfo(currentframe()).function, error=404)
    return make_response('', 404)


@app.route('/api/project/', methods=['POST', 'GET'])
@exception_treatment
def api_project():
    """ Project global operation
    """
    project = project_get_or_create(multi_session_force_recreate=False)
    if request.method == 'POST' and request.args.get('new', False):
        project = project_get_or_create(multi_session_force_recreate=True)
    return make_response(jsonify({'project_name': project.name}), 201)


@app.route('/api/projects/1/task_ids/', methods=['GET'])
@exception_treatment
def api_all_task_ids():
    """ Get all tasks ids
    """
    project = project_get_or_create()
    ids = sorted(project.get_task_ids())
    project.analytics.send(getframeinfo(currentframe()).function)
    return make_response(jsonify(ids), 200)


@app.route('/api/tasks/<task_id>/', methods=['GET'])
@exception_treatment
def api_tasks(task_id):
    """ Get task by id
    """
    # try to get task with completions first
    project = project_get_or_create()
    task_data = project.get_task_with_completions(task_id)
    task_data = project.get_task(task_id) if task_data is None else task_data
    project.analytics.send(getframeinfo(currentframe()).function)
    return make_response(jsonify(task_data), 200)


@app.route('/api/tasks/delete', methods=['DELETE'])
@exception_treatment
def api_tasks_delete():
    """ Delete all tasks & completions
    """
    project = project_get_or_create()
    project.delete_tasks()
    return make_response(jsonify({}), 204)


@app.route('/api/projects/1/completions_ids/', methods=['GET'])
@exception_treatment
def api_all_completion_ids():
    """ Get all completion ids
    """
    project = project_get_or_create()
    ids = project.get_completions_ids()
    project.analytics.send(getframeinfo(currentframe()).function)
    return make_response(jsonify(ids), 200)


@app.route('/api/tasks/<task_id>/completions/', methods=['POST', 'DELETE'])
@exception_treatment
def api_completions(task_id):
    """ Delete or save new completion to output_dir with the same name as task_id
    """
    project = project_get_or_create()

    if request.method == 'POST':
        completion = request.json
        completion.pop('state', None)  # remove editor state
        completion_id = project.save_completion(task_id, completion)
        log.info(msg='Completion saved', extra={'task_id': task_id, 'output': request.json})
        # try to train model with new completions
        if project.ml_backend:
            project.ml_backend.update_model(project.get_task(task_id), completion, project.project_obj)
        project.analytics.send(getframeinfo(currentframe()).function)
        return make_response(json.dumps({'id': completion_id}), 201)

    else:
        project.analytics.send(getframeinfo(currentframe()).function, error=500)
        return make_response('Incorrect request method', 500)


@app.route('/api/tasks/<task_id>/completions/<completion_id>/', methods=['DELETE'])
@exception_treatment
def api_completion_by_id(task_id, completion_id):
    """ Delete or save new completion to output_dir with the same name as task_id.
        completion_id with different IDs is not supported in this backend
    """
    project = project_get_or_create()

    if request.method == 'DELETE':
        if project.config.get('allow_delete_completions', False):
            project.delete_completion(task_id)
            project.analytics.send(getframeinfo(currentframe()).function)
            return make_response('deleted', 204)
        else:
            project.analytics.send(getframeinfo(currentframe()).function, error=422)
            return make_response('Completion removing is not allowed in server config', 422)
    else:
        project.analytics.send(getframeinfo(currentframe()).function, error=500)
        return make_response('Incorrect request method', 500)


@app.route('/api/tasks/<task_id>/completions/<completion_id>/', methods=['PATCH'])
@exception_treatment
def api_completion_update(task_id, completion_id):
    """ Rewrite existing completion with patch.
        This is technical api call for editor testing only. It's used for Rewrite button in editor.
    """
    project = project_get_or_create()
    completion = request.json

    completion.pop('state', None)  # remove editor state
    completion['id'] = int(completion_id)
    project.save_completion(task_id, completion)
    log.info(msg='Completion saved', extra={'task_id': task_id, 'output': request.json})
    project.analytics.send(getframeinfo(currentframe()).function)
    return make_response('ok', 201)


@app.route('/api/projects/1/expert_instruction')
@exception_treatment
def api_instruction():
    """ Instruction for annotators
    """
    project = project_get_or_create()
    project.analytics.send(getframeinfo(currentframe()).function)
    return make_response(project.config['instruction'], 200)


@app.route('/predict', methods=['POST'])
@exception_treatment
def api_predict():
    """ Make ML prediction using ml_backend
    """
    task = request.json
    project = project_get_or_create()
    if project.ml_backend:
        predictions = project.ml_backend.make_predictions({'data': task}, project.project_obj)
        project.analytics.send(getframeinfo(currentframe()).function)
        return make_response(jsonify(predictions), 200)
    else:
        project.analytics.send(getframeinfo(currentframe()).function, error=400)
        return make_response(jsonify("No ML backend"), 400)


@app.route('/data/<path:filename>')
def get_data_file(filename):
    """ External resource serving
    """
    directory = request.args.get('d')
    return flask.send_from_directory(directory, filename, as_attachment=True)


def parse_input_args():
    """ Combine args with json config

    :return: config dict
    """
    import sys
    import argparse

    if len(sys.argv) == 1:
        print('\nQuick start usage: label-studio start my_project --init\n')

    root_parser = argparse.ArgumentParser(add_help=False)
    root_parser.add_argument(
        '-b', '--no-browser', dest='no_browser', action='store_true',
        help='Do not open browser at label studio start'
    )
    root_parser.add_argument(
        '-d', '--debug', dest='debug', action='store_true',
        help='Debug mode for Flask', default=None
    )
    root_parser.add_argument(
        '--root-dir', dest='root_dir', default='.',
        help='Projects root directory'
    )
    root_parser.add_argument(
        '-v', '--verbose', dest='verbose', action='store_true',
        help='Increase output verbosity')

    parser = argparse.ArgumentParser(description='Label studio')

    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    subparsers.required = True

    # init sub-command parser

    available_templates = [os.path.basename(os.path.dirname(f)) for f in iter_config_templates()]

    parser_init = subparsers.add_parser('init', help='Initialize Label Studio', parents=[root_parser])
    parser_init.add_argument(
        'project_name',
        help='Path to directory where project state will be initialized')
    parser_init.add_argument(
        '--template', dest='template', choices=available_templates,
        help='Choose from predefined project templates'
    )

    # start sub-command parser

    parser_start = subparsers.add_parser('start', help='Start Label Studio server', parents=[root_parser])
    parser_start.add_argument(
        'project_name',
        help='Path to directory where project state has been initialized'
    )
    parser_start.add_argument(
        '--init', dest='init', action='store_true',
        help='Initialize if project is not initialized yet'
    )
    parser_start.add_argument(
        '--template', dest='template', choices=available_templates,
        help='Choose from predefined project templates'
    )
    parser_start.add_argument(
        '-c', '--config', dest='config_path',
        help='Server config')
    parser_start.add_argument(
        '-l', '--label-config', dest='label_config', default='',
        help='Label config path')
    parser_start.add_argument(
        '-i', '--input-path', dest='input_path', default='',
        help='Input path to task file or directory with tasks')
    parser_start.add_argument(
        '-o', '--output-dir', dest='output_dir', default='',
        help='Output directory for completions')
    parser_start.add_argument(
        '-p', '--port', dest='port', default=8200, type=int,
        help='Server port')
    parser_start.add_argument(
        '--ml-backend-url', dest='ml_backend_url',
        help='Machine learning backend URL')
    parser_start.add_argument(
        '--ml-backend-name', dest='ml_backend_name',
        help='Machine learning backend name')

    # start-multi-session sub-command parser

    parser_start_ms = subparsers.add_parser(
        'start-multi-session', help='Start Label Studio server', parents=[root_parser])
    parser_start_ms.add_argument(
        '--template', dest='template', choices=available_templates,
        help='Choose from predefined project templates'
    )
    parser_start_ms.add_argument(
        '-c', '--config', dest='config_path',
        help='Server config')
    parser_start_ms.add_argument(
        '-l', '--label-config', dest='label_config', default='',
        help='Label config path')
    parser_start_ms.add_argument(
        '-i', '--input-path', dest='input_path', default='',
        help='Input path to task file or directory with tasks')
    parser_start_ms.add_argument(
        '-o', '--output-dir', dest='output_dir', default='',
        help='Output directory for completions')
    parser_start_ms.add_argument(
        '-p', '--port', dest='port', default=8200, type=int,
        help='Server port')
    parser_start_ms.add_argument(
        '--ml-backend-url', dest='ml_backend_url',
        help='Machine learning backend URL')
    parser_start_ms.add_argument(
        '--ml-backend-name', dest='ml_backend_name',
        help='Machine learning backend name')

    args = parser.parse_args()
    label_config_explicitly_specified = hasattr(args, 'label_config') and args.label_config
    if args.template and not label_config_explicitly_specified:
        args.label_config = os.path.join(find_dir('examples'), args.template, 'config.xml')
    if not hasattr(args, 'label_config'):
        args.label_config = None
    return args


def main():
    import threading
    import webbrowser

    import label_studio.utils.functions

    global input_args

    input_args = parse_input_args()

    # On `init` command, create directory args.project_name with initial project state and exit
    if input_args.command == 'init':
        Project.create_project_dir(input_args.project_name, input_args)
        return

    elif input_args.command == 'start':

        # If `start --init` option is specified, do the same as with `init` command, but continue to run app
        if input_args.init:
            Project.create_project_dir(input_args.project_name, input_args)

    label_studio.utils.functions.HOSTNAME = 'http://localhost:' + str(input_args.port)

    # On `start` command, launch browser if --no-browser is not specified and start label studio server
    if input_args.command == 'start':
        if not input_args.no_browser:
            browser_url = 'http://127.0.0.1:' + str(input_args.port) + '/welcome'
            threading.Timer(2.5, lambda: webbrowser.open(browser_url)).start()
            print('Start browser at URL: ' + browser_url)

        app.run(host='0.0.0.0', port=input_args.port, debug=input_args.debug)

    # On `start-multi-session` command, server creates one project per each browser sessions
    elif input_args.command == 'start-multi-session':
        app.run(host='0.0.0.0', port=input_args.port, debug=input_args.debug)


if __name__ == "__main__":
    main()

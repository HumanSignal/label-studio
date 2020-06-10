import os
import io
import lxml
import time
import shutil
import flask
import pandas as pd
import logging
import logging.config
import traceback as tb

try:
    import ujson as json
except:
    import json

# setup default config
with io.open(os.path.join(os.path.dirname(__file__), 'logger.json')) as f:
    logging.config.dictConfig(json.load(f))

from uuid import uuid4
from urllib.parse import unquote
from datetime import datetime
from inspect import currentframe, getframeinfo
from flask import (
    request, jsonify, make_response, Response, Response as HttpResponse, send_file, session, redirect
)
from flask_api import status
from types import SimpleNamespace

from label_studio.utils.functions import generate_sample_task
from label_studio.utils.io import find_dir, find_editor_files
from label_studio.utils import uploader
from label_studio.utils.validation import TaskValidator
from label_studio.utils.exceptions import ValidationError
from label_studio.utils.functions import generate_sample_task_without_check
from label_studio.utils.misc import (
    exception_treatment, exception_treatment_page,
    config_line_stripped, get_config_templates, convert_string_to_hash, serialize_class
)
from label_studio.utils.argparser import parse_input_args
from label_studio.utils.uri_resolver import resolve_task_data_uri
from label_studio.storage import get_storage_form

from label_studio.project import Project
from label_studio.tasks import Tasks

logger = logging.getLogger(__name__)

app = flask.Flask(__name__, static_url_path='')

app.secret_key = 'A0Zrdqwf1AQWj12ajkhgFN]dddd/,?RfDWQQT'
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
app.config['WTF_CSRF_ENABLED'] = False

# input arguments
input_args = None
if os.path.exists('server.json'):
    try:
        with open('server.json') as f:
            input_args = SimpleNamespace(**json.load(f))
    except:
        pass


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
            'multi_session': True,
            'user': convert_string_to_hash(user)
        })
    else:
        if multi_session_force_recreate:
            raise NotImplementedError(
                '"multi_session_force_recreate" option supported only with "start-multi-session" mode')
        return Project.get_or_create(input_args.project_name, input_args, context={'multi_session': False})


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


@app.route('/upload/<path:path>')
def send_upload(path):
    """ User uploaded files
    """
    logger.warning('Task path starting with "/upload/" is deprecated and will be removed in next releases, '
                   'replace "/upload/" => "/data/upload/" in your tasks.json files')
    project = project_get_or_create()
    project_dir = os.path.join(project.name, 'upload')
    return open(os.path.join(project_dir, path), 'rb').read()


@app.route('/static/<path:path>')
def send_static(path):
    """ Static serving
    """
    static_dir = find_dir('static')
    return flask.send_from_directory(static_dir, path)


@app.errorhandler(ValidationError)
def validation_error_handler(error):
    logger.error(error)
    return str(error), 500


@app.route('/')
@exception_treatment_page
def labeling_page():
    """ Label studio frontend: task labeling
    """
    project = project_get_or_create()
    if project.no_tasks():
        return redirect('/welcome')

    # task data: load task or task with completions if it exists
    task_data = None
    task_id = request.args.get('task_id', None)

    if task_id is not None:
        task_id = int(task_id)
        # Task explore mode
        task_data = project.get_task_with_completions(task_id) or project.source_storage.get(task_id)
        task_data = resolve_task_data_uri(task_data)

        if project.ml_backends_connected:
            task_data = project.make_predictions(task_data)

    project.analytics.send(getframeinfo(currentframe()).function)
    return flask.render_template(
        'labeling.html',
        project=project,
        config=project.config,
        label_config_line=project.label_config_line,
        task_id=task_id,
        task_data=task_data,
        **find_editor_files()
    )


@app.route('/welcome')
@exception_treatment_page
def welcome_page():
    """ Label studio frontend: task labeling
    """
    project = project_get_or_create()
    project.analytics.send(getframeinfo(currentframe()).function)
    project.update_on_boarding_state()
    return flask.render_template(
        'welcome.html',
        config=project.config,
        project=project,
        on_boarding=project.on_boarding
    )


@app.route('/tasks', methods=['GET', 'POST'])
@exception_treatment_page
def tasks_page():
    """ Tasks and completions page
    """
    try:
        project = project_get_or_create()
        serialized_project = project.serialize()
        serialized_project['multi_session_mode'] = input_args.command != 'start-multi-session'
        project.analytics.send(getframeinfo(currentframe()).function)
        return flask.render_template(
            'tasks.html',
            project=project,
            serialized_project=serialized_project
        )
    except Exception as e:
        error = str(e)
        logger.error(error, exc_info=True)
        traceback = tb.format_exc()
        return flask.render_template(
            'includes/error.html',
            error=error, header="Project loading error", traceback=traceback
        )


@app.route('/setup')
@exception_treatment_page
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
        project=project,
        label_config_full=project.label_config_full,
        templates=templates,
        input_values=input_values,
        multi_session=input_args.command == 'start-multi-session'
    )


@app.route('/import')
@exception_treatment_page
def import_page():
    """ Import tasks from JSON, CSV, ZIP and more
    """
    project = project_get_or_create()

    project.analytics.send(getframeinfo(currentframe()).function)
    return flask.render_template(
        'import.html',
        config=project.config,
        project=project
    )


@app.route('/export')
@exception_treatment_page
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


@app.route('/model')
@exception_treatment_page
def model_page():
    """ Machine learning"""
    project = project_get_or_create()
    project.analytics.send(getframeinfo(currentframe()).function)
    ml_backends = []
    for ml_backend in project.ml_backends:
        if ml_backend.connected:
            try:
                ml_backend.sync(project)
                training_status = ml_backend.is_training(project)
                ml_backend.training_in_progress = training_status['is_training']
                ml_backend.model_version = training_status['model_version']
                ml_backend.is_connected = True
            except Exception as exc:
                logger.error(str(exc), exc_info=True)
                ml_backend.is_error = True
        else:
            ml_backend.is_connected = False
        ml_backends.append(ml_backend)
    return flask.render_template(
        'model.html',
        config=project.config,
        project=project,
        ml_backends=ml_backends
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
    task_data = generate_sample_task_without_check(config, mode='editor_preview')
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

    try:
        project.update_label_config(label_config)
    except Exception as e:
        return make_response(jsonify({'label_config': [str(e)]}), status.HTTP_400_BAD_REQUEST)

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
@exception_treatment
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
    parsed_data = uploader.load_tasks(DjangoRequest(), project)
    # validate tasks
    validator = TaskValidator(project)
    try:
        new_tasks = validator.to_internal_value(parsed_data)
    except ValidationError as e:
        return make_response(jsonify(e.msg_to_list()), status.HTTP_400_BAD_REQUEST)

    max_id_in_old_tasks = -1
    if not project.no_tasks():
        max_id_in_old_tasks = project.source_storage.max_id()

    new_tasks = Tasks().from_list_of_dicts(new_tasks, max_id_in_old_tasks + 1)
    project.source_storage.set_many(new_tasks.keys(), new_tasks.values())

    # update schemas based on newly uploaded tasks
    project.update_derived_input_schema()
    project.update_derived_output_schema()

    duration = time.time() - start
    return make_response(jsonify({
        'task_count': len(new_tasks),
        'completion_count': validator.completion_count,
        'prediction_count': validator.prediction_count,
        'duration': duration,
        'new_task_ids': [t for t in new_tasks]
    }), status.HTTP_201_CREATED)


@app.route('/api/export', methods=['GET'])
@exception_treatment
def api_export():
    export_format = request.args.get('format')
    project = project_get_or_create()
    now = datetime.now()
    completion_dir = project.config['output_dir']

    project_export_dir = os.path.join(os.path.dirname(completion_dir), 'export')
    os.makedirs(project_export_dir, exist_ok=True)

    zip_dir = os.path.join(project_export_dir, now.strftime('%Y-%m-%d-%H-%M-%S'))
    os.makedirs(zip_dir, exist_ok=True)

    project.converter.convert(completion_dir, zip_dir, format=export_format)
    shutil.make_archive(zip_dir, 'zip', zip_dir)
    shutil.rmtree(zip_dir)

    response = send_file(zip_dir+'.zip', as_attachment=True)
    response.headers['filename'] = os.path.basename(zip_dir+'.zip')
    project.analytics.send(getframeinfo(currentframe()).function)
    return response


@app.route('/api/projects/1/next/', methods=['GET'])
@exception_treatment
def api_generate_next_task():
    """ Generate next task to label
    """
    project = project_get_or_create()
    # try to find task is not presented in completions
    completed_tasks_ids = project.get_completions_ids()
    task = project.next_task(completed_tasks_ids)
    if task is None:
        # no tasks found
        project.analytics.send(getframeinfo(currentframe()).function, error=404)
        return make_response('', 404)

    task = resolve_task_data_uri(task)

    #project.analytics.send(getframeinfo(currentframe()).function)

    # collect prediction from multiple ml backends
    if project.ml_backends_connected:
        task = project.make_predictions(task)
    logger.debug('Next task:\n' + json.dumps(task, indent=2))
    return make_response(jsonify(task), 200)


@app.route('/api/project/', methods=['POST', 'GET', 'PATCH'])
@exception_treatment
def api_project():
    """ Project global operation"""
    project = project_get_or_create(multi_session_force_recreate=False)
    code = 200

    if request.method == 'POST' and request.args.get('new', False):
        project = project_get_or_create(multi_session_force_recreate=True)
        code = 201
    elif request.method == 'PATCH':
        project.update_params(request.json)
        code = 201

    output = project.serialize()
    output['multi_session_mode'] = input_args.command != 'start-multi-session'
    if not request.args.get('fast', False):
        project.analytics.send(getframeinfo(currentframe()).function, method=request.method)
    return make_response(jsonify(output), code)


@app.route('/api/project/storage-settings', methods=['GET', 'POST'])
@exception_treatment
def api_project_storage_settings():
    project = project_get_or_create()

    # GET: return selected form, populated with current storage parameters
    if request.method == 'GET':
        # render all forms for caching in web
        all_forms = {'source': {}, 'target': {}}
        for storage_for in all_forms:
            for name, description in project.get_available_storage_names(storage_for).items():
                current_type = project.config.get(storage_for, {'type': ''})['type']
                current = name == current_type
                form_class = get_storage_form(name)
                form = form_class(data=project.get_storage(storage_for).get_params()) if current else form_class()
                all_forms[storage_for][name] = {
                    'fields': [serialize_class(field) for field in form],
                    'type': name, 'current': current, 'description': description,
                    'path': getattr(project, storage_for + '_storage').readable_path
                }
                # generate data key automatically
                if project.data_types.keys():
                    for field in all_forms[storage_for][name]['fields']:
                        if field['name'] == 'data_key' and not field['data']:
                            field['data'] = list(project.data_types.keys())[0]
        project.analytics.send(getframeinfo(currentframe()).function, method=request.method)
        return make_response(jsonify(all_forms), 200)

    # POST: update storage given filled form
    if request.method == 'POST':
        selected_type = request.args.get('type', '')
        storage_for = request.args.get('storage_for')
        current_type = project.config.get(storage_for, {'type': ''})['type']
        selected_type = selected_type if selected_type else current_type

        form = get_storage_form(selected_type)(data=request.json)
        project.analytics.send(
            getframeinfo(currentframe()).function, method=request.method, storage=selected_type,
            storage_for=storage_for)
        if form.validate_on_submit():
            storage_kwargs = dict(form.data)
            storage_kwargs['type'] = request.json['type']  # storage type
            try:
                project.update_storage(storage_for, storage_kwargs)
            except Exception as e:
                traceback = tb.format_exc()
                logger.error(str(traceback))
                return make_response(jsonify({'detail': 'Error while storage update: ' + str(e)}), 400)
            else:
                return make_response(jsonify({'result': 'ok'}), 201)
        else:
            logger.error('Errors: ' + str(form.errors) + ' for request body ' + str(request.json))
            return make_response(jsonify({'errors': form.errors}), 400)


@app.route('/api/projects/1/task_ids/', methods=['GET'])
@exception_treatment
def api_all_task_ids():
    """ Get all tasks ids
    """
    project = project_get_or_create()
    ids = list(sorted(project.source_storage.ids()))
    project.analytics.send(getframeinfo(currentframe()).function)
    return make_response(jsonify(ids), 200)


@app.route('/api/tasks', methods=['GET'])
@exception_treatment
def api_all_tasks():
    """ Get full tasks with pagination, completions and predictions
    """
    project = project_get_or_create()
    page, page_size = int(request.args.get('page', 1)), int(request.args.get('page_size', 10))
    order = request.args.get('order', 'id')
    if page < 1 or page_size < 1:
        return make_response(jsonify({'detail': 'Incorrect page or page_size'}), 422)

    order_inverted = order[0] == '-'
    order = order[1:] if order_inverted else order
    if order not in ['id', 'completed_at']:
        return make_response(jsonify({'detail': 'Incorrect order'}), 422)

    # get task ids and sort them by completed time
    task_ids = project.source_storage.ids()
    completed_at = project.get_completed_at(None)

    # ordering
    pre_order = [{'id': i, 'completed_at': completed_at[i] if i in completed_at else "can't obtain"} for i in task_ids]
    ordered = sorted(pre_order, key=lambda x: x[order])
    ordered = ordered[::-1] if order_inverted else ordered
    paginated = ordered[(page - 1) * page_size:page * page_size]

    # get tasks with completions
    tasks = []
    for item in paginated:
        i = item['id']
        task = project.get_task_with_completions(i)
        if task is None:  # no completion at task
            task = project.source_storage.get(i)
        else:
            task['completed_at'] = item['completed_at']
        tasks.append(task)

    return make_response(jsonify(tasks), 200)


@app.route('/api/tasks/<task_id>/', methods=['GET', 'DELETE'])
@exception_treatment
def api_tasks(task_id):
    """ Get task by id
    """
    # try to get task with completions first
    task_id = int(task_id)
    project = project_get_or_create()
    if request.method == 'GET':
        task_data = project.get_task_with_completions(task_id) or project.source_storage.get(task_id)
        project.analytics.send(getframeinfo(currentframe()).function)
        return make_response(jsonify(task_data), 200)
    elif request.method == 'DELETE':
        project.remove_task(task_id)
        project.analytics.send(getframeinfo(currentframe()).function)
        return make_response(jsonify('Task deleted.'), 204)


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
        completion_id = project.save_completion(int(task_id), completion)
        project.analytics.send(getframeinfo(currentframe()).function)
        return make_response(json.dumps({'id': completion_id}), 201)

    else:
        project.analytics.send(getframeinfo(currentframe()).function, error=500)
        return make_response('Incorrect request method', 500)


@app.route('/api/tasks/<task_id>/cancel', methods=['POST'])
@exception_treatment
def api_tasks_cancel(task_id):
    task_id = int(task_id)
    project = project_get_or_create()
    skipped_completion = {
        'result': [],
        'skipped': True
    }
    completion_id = project.save_completion(task_id, skipped_completion)
    project.analytics.send(getframeinfo(currentframe()).function)
    return make_response(json.dumps({'id': completion_id}), 201)


@app.route('/api/tasks/<task_id>/completions/<completion_id>/', methods=['DELETE'])
@exception_treatment
def api_completion_by_id(task_id, completion_id):
    """ Delete or save new completion to output_dir with the same name as task_id.
        completion_id with different IDs is not supported in this backend
    """
    project = project_get_or_create()

    if request.method == 'DELETE':
        if project.config.get('allow_delete_completions', False):
            project.delete_completion(int(task_id))
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
    task_id = int(task_id)
    project = project_get_or_create()
    completion = request.json

    completion.pop('state', None)  # remove editor state
    completion['id'] = int(completion_id)
    project.save_completion(task_id, completion)
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


@app.route('/api/remove-ml-backend', methods=['POST'])
@exception_treatment
def api_remove_ml_backend():
    project = project_get_or_create()
    ml_backend_name = request.json['name']
    project.remove_ml_backend(ml_backend_name)
    project.analytics.send(getframeinfo(currentframe()).function)
    return make_response(jsonify('Deleted!'), 204)


@app.route('/predict', methods=['POST'])
@exception_treatment
def api_predict():
    """ Make ML prediction using ml_backends
    """
    task = {'data': request.json}
    project = project_get_or_create()
    if project.ml_backends_connected:
        task_with_predictions = project.make_predictions(task)
        project.analytics.send(getframeinfo(currentframe()).function)
        return make_response(jsonify(task_with_predictions), 200)
    else:
        project.analytics.send(getframeinfo(currentframe()).function, error=400)
        return make_response(jsonify("No ML backend"), 400)


@app.route('/api/train', methods=['POST'])
@exception_treatment
def api_train():
    """Send train signal to ML backend"""
    project = project_get_or_create()
    if project.ml_backends_connected:
        training_started = project.train()
        if training_started:
            logger.debug('Training started.')
            project.analytics.send(getframeinfo(currentframe()).function, num_backends=len(project.ml_backends))
            return make_response(jsonify({'details': 'Training started'}), 200)
        else:
            logger.debug('Training failed.')
            project.analytics.send(getframeinfo(currentframe()).function, error=400, training_started=training_started)
            return make_response(
                jsonify('Training is not started: seems that you don\'t have any ML backend connected'), 400)
    else:
        project.analytics.send(getframeinfo(currentframe()).function, error=400)
        return make_response(jsonify("No ML backend"), 400)


@app.route('/api/predictions', methods=['POST'])
@exception_treatment
def api_predictions():
    """Send creating predictions signal to ML backend"""
    project = project_get_or_create()
    if project.ml_backends_connected:
        # get tasks ids without predictions
        tasks_with_predictions = {}
        for task_id, task in project.source_storage.items():
            task_pred = project.make_predictions(task)
            tasks_with_predictions[task_pred['id']] = task_pred
        project.source_storage.set_many(tasks_with_predictions.keys(), tasks_with_predictions.values())

        return make_response(jsonify({'details': 'Predictions done.'}), 200)
    else:
        project.analytics.send(getframeinfo(currentframe()).function, error=400)
        return make_response(jsonify("No ML backend"), 400)


@app.route('/data/<path:filename>')
@exception_treatment
def get_data_file(filename):
    """ External resource serving
    """
    project = project_get_or_create()

    # support for upload via GUI
    if filename.startswith('upload/'):
        path = os.path.join(project.name, filename)
        directory = os.path.abspath(os.path.dirname(path))
        filename = os.path.basename(path)
        return flask.send_from_directory(directory, filename, as_attachment=True)

    # serving files from local storage
    if not project.config.get('allow_serving_local_files'):
        raise FileNotFoundError('Serving local files is not allowed. '
                                'Use "allow_serving_local_files": true config option to enable local serving')
    directory = request.args.get('d')
    return flask.send_from_directory(directory, filename, as_attachment=True)


def str2datetime(timestamp_str):
    try:
        ts = int(timestamp_str)
    except:
        return timestamp_str
    # return datetime.utcfromtimestamp(ts).strftime('%Y%m%d.%H%M%S')
    return datetime.utcfromtimestamp(ts).strftime('%c')


def start_browser(ls_url, no_browser):
    import threading
    import webbrowser
    if no_browser:
        return

    browser_url = ls_url + '/welcome'
    threading.Timer(2.5, lambda: webbrowser.open(browser_url)).start()
    print('Start browser at URL: ' + browser_url)


def main():
    global input_args

    app.jinja_env.filters['str2datetime'] = str2datetime

    input_args = parse_input_args()

    # setup logging level
    if input_args.log_level:
        logging.root.setLevel(input_args.log_level)

    # On `init` command, create directory args.project_name with initial project state and exit
    if input_args.command == 'init':
        Project.create_project_dir(input_args.project_name, input_args)
        return

    elif input_args.command == 'start':

        # If `start --init` option is specified, do the same as with `init` command, but continue to run app
        if input_args.init:
            Project.create_project_dir(input_args.project_name, input_args)

        if not os.path.exists(Project.get_project_dir(input_args.project_name, input_args)):
            raise FileNotFoundError(
                'Project directory "{pdir}" not found. '
                'Did you miss create it first with `label-studio init {pdir}` ?'.format(
                    pdir=Project.get_project_dir(input_args.project_name, input_args)))

    # On `start` command, launch browser if --no-browser is not specified and start label studio server
    if input_args.command == 'start':
        import label_studio.utils.functions

        config = Project.get_config(input_args.project_name, input_args)
        host = input_args.host or config.get('host', 'localhost')
        port = input_args.port or config.get('port', 8080)
        label_studio.utils.functions.HOSTNAME = 'http://localhost:' + str(port)

        try:
            start_browser(label_studio.utils.functions.HOSTNAME, input_args.no_browser)
            app.run(host=host, port=port, debug=input_args.debug)
        except OSError as e:
            # address already is in use
            if e.errno == 98:
                new_port = int(port) + 1
                print('\n*** WARNING! ***\n* Port ' + str(port) + ' is in use.\n'
                      '* Try to start at ' + str(new_port) + '\n****************\n')
                label_studio.utils.functions.HOSTNAME = 'http://localhost:' + str(new_port)
                start_browser(label_studio.utils.functions.HOSTNAME, input_args.no_browser)
                app.run(host=host, port=new_port, debug=input_args.debug)
            else:
                raise e

    # On `start-multi-session` command, server creates one project per each browser sessions
    elif input_args.command == 'start-multi-session':
        app.run(host=input_args.host or '0.0.0.0', port=input_args.port or 8080, debug=input_args.debug)


if __name__ == "__main__":
    main()

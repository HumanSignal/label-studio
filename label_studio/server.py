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
import label_studio

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

from gevent.pywsgi import WSGIServer

from flask import (
    request, jsonify, make_response, Response, Response as HttpResponse,
    send_file, session, redirect, g
)
from flask_api import status
from types import SimpleNamespace

from label_studio.utils.functions import generate_sample_task, get_task_from_labeling_config
from label_studio.utils.io import find_dir, find_editor_files
from label_studio.utils import uploader
from label_studio.utils.validation import TaskValidator
from label_studio.utils.exceptions import ValidationError
from label_studio.utils.functions import (
    generate_sample_task_without_check, set_full_hostname, set_web_protocol, get_web_protocol, generate_time_series_json
)
from label_studio.utils.misc import (
    exception_treatment, exception_treatment_page,
    config_line_stripped, get_config_templates, convert_string_to_hash, serialize_class,
    DirectionSwitch, check_port_in_use, timestamp_to_local_datetime
)
from label_studio.utils.analytics import Analytics
from label_studio.utils.argparser import parse_input_args
from label_studio.utils.uri_resolver import resolve_task_data_uri
from label_studio.storage import get_storage_form

from label_studio.project import Project
from label_studio.tasks import Tasks
from label_studio.utils.auth import requires_auth

logger = logging.getLogger(__name__)


def create_app():
    """Create application factory, as explained here:
    http://flask.pocoo.org/docs/patterns/appfactories/.

        config_object="label_studio.settings"
    :param config_object: The configuration object to use.
    """
    app = flask.Flask(__name__, static_url_path='')
    app.secret_key = 'A0Zrdqwf1AQWj12ajkhgFN]dddd/,?RfDWQQT'
    app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
    app.config['WTF_CSRF_ENABLED'] = False
    app.url_map.strict_slashes = False
    return app


app = create_app()


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
    if input_args and input_args.command == 'start-multi-session':
        # get user from session
        if 'user' not in session:
            session['user'] = str(uuid4())
        user = session['user']
        g.user = user

        # get project from session
        if 'project' not in session or multi_session_force_recreate:
            session['project'] = str(uuid4())
        project = session['project']

        # check for shared projects and get owner user
        if project in session.get('shared_projects', []):
            owner = Project.get_user_by_project(project, input_args.root_dir)
            if owner is None:  # owner is None when project doesn't exist
                raise Exception('No such shared project found: project_uuid = ' + project)
            else:
                user = owner

        project_name = user + '/' + project
        return Project.get_or_create(project_name, input_args, context={
            'multi_session': True,
            'user': convert_string_to_hash(user)
        })
    else:
        if multi_session_force_recreate:
            raise NotImplementedError(
                '"multi_session_force_recreate" option supported only with "start-multi-session" mode')
        return Project.get_or_create(input_args.project_name,
                                     input_args, context={'multi_session': False})


@app.template_filter('json')
def json_filter(s):
    return json.dumps(s)

# For development purposes. Uncomment to enable CORS
# NOT FORM PRODUCTION
# @app.after_request
# def after_request_func(response):
#     response.headers.add('Access-Control-Allow-Origin', "*")
#     return response


@app.before_request
def app_before_request_callback():
    if request.endpoint in ('static', 'send_static'):
        return

    def prepare_globals():
        # setup session cookie
        if 'session_id' not in session:
            session['session_id'] = str(uuid4())
        g.project = project_get_or_create()
        g.analytics = Analytics(input_args, g.project)
        g.sid = g.analytics.server_id

    # show different exception pages for api and other endpoints
    if request.path.startswith('/api'):
        return exception_treatment(prepare_globals)()
    else:
        return exception_treatment_page(prepare_globals)()

@app.after_request
@exception_treatment
def app_after_request_callback(response):
    if hasattr(g, 'analytics'):
        g.analytics.send(request, session, response)
    return response


@app.route('/static/media/<path:path>')
@requires_auth
def send_media(path):
    """ Static for label tool js and css
    """
    media_dir = find_dir('static/media')
    return flask.send_from_directory(media_dir, path)


@app.route('/upload/<path:path>')
@requires_auth
def send_upload(path):
    """ User uploaded files
    """
    logger.warning('Task path starting with "/upload/" is deprecated and will be removed in next releases, '
                   'replace "/upload/" => "/data/upload/" in your tasks.json files')
    project_dir = os.path.join(g.project.path, 'upload')
    return open(os.path.join(project_dir, path), 'rb').read()


@app.route('/samples/time-series.csv')
@requires_auth
def samples_time_series():
    """ Generate time series example for preview
    """
    time_column = request.args.get('time')
    value_columns = request.args.get('values').split(',')
    time_format = request.args.get('tf')

    # separator processing
    separator = request.args.get('sep', ',')
    separator = separator.replace('\\t', '\t')
    aliases = {'dot': '.', 'comma': ',', 'tab': '\t', 'space': ' '}
    if separator in aliases:
        separator = aliases[separator]

    # check headless or not
    header = True
    if all(n.isdigit() for n in [time_column] + value_columns):
        header = False

    # generate all columns for headless csv
    if not header:
        max_column_n = max([int(v) for v in value_columns] + [0])
        value_columns = range(1, max_column_n+1)

    ts = generate_time_series_json(time_column, value_columns, time_format)
    csv_data = pd.DataFrame.from_dict(ts).to_csv(index=False, header=header, sep=separator).encode('utf-8')
    mem = io.BytesIO()
    mem.write(csv_data)
    mem.seek(0)
    return send_file(
        mem,
        as_attachment=False,
        attachment_filename='time-series.csv',
        mimetype='text/csv'
    )


@app.route('/static/<path:path>')
@requires_auth
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
@requires_auth
@exception_treatment_page
def labeling_page():
    """ Label studio frontend: task labeling
    """
    if g.project.no_tasks():
        return redirect('welcome')

    # task data: load task or task with completions if it exists
    task_data = None
    task_id = request.args.get('task_id', None)

    if task_id is not None:
        task_id = int(task_id)
        # Task explore mode
        task_data = g.project.get_task_with_completions(task_id) or g.project.source_storage.get(task_id)
        task_data = resolve_task_data_uri(task_data, project=g.project)

        if g.project.ml_backends_connected:
            task_data = g.project.make_predictions(task_data)

    return flask.render_template(
        'labeling.html',
        project=g.project,
        config=g.project.config,
        label_config_line=g.project.label_config_line,
        task_id=task_id,
        task_data=task_data,
        **find_editor_files()
    )


@app.route('/welcome')
@requires_auth
@exception_treatment_page
def welcome_page():
    """ Label studio frontend: task labeling
    """
    g.project.update_on_boarding_state()
    return flask.render_template(
        'welcome.html',
        config=g.project.config,
        project=g.project,
        on_boarding=g.project.on_boarding
    )


@app.route('/tasks', methods=['GET', 'POST'])
@requires_auth
@exception_treatment_page
def tasks_page():
    """ Tasks and completions page
    """
    serialized_project = g.project.serialize()
    serialized_project['multi_session_mode'] = input_args.command != 'start-multi-session'
    return flask.render_template(
        'tasks.html',
        config=g.project.config,
        project=g.project,
        serialized_project=serialized_project,
        **find_editor_files()
    )


@app.route('/setup')
@requires_auth
@exception_treatment_page
def setup_page():
    """ Setup label config
    """
    input_values = {}
    project = g.project

    g.project.description = project.get_config(project.name, input_args).get('description', 'Untitled')

    # evaluate all projects for this user: user_projects + shared_projects
    if project.config.get("show_project_links_in_multisession", True) and hasattr(g, 'user'):
        user = g.user
        project_ids = g.project.get_user_projects(user, input_args.root_dir)

        # own projects
        project_names = [os.path.join(user, uuid) for uuid in project_ids]
        project_desc = [Project.get_config(name, input_args).get('description', 'Untitled') for name in project_names]
        own_projects = dict(zip(project_ids, project_desc))

        # shared projects
        shared_projects = {}
        for uuid in session.get('shared_projects', []):
            tmp_user = Project.get_user_by_project(uuid, input_args.root_dir)
            project_name = os.path.join(tmp_user, uuid)
            project_desc = Project.get_config(project_name, input_args).get('description', 'Untitled')
            shared_projects[uuid] = project_desc
    else:
        own_projects, shared_projects = {}, {}

    templates = get_config_templates(g.project.config)
    return flask.render_template(
        'setup.html',
        config=g.project.config,
        project=g.project,
        label_config_full=g.project.label_config_full,
        templates=templates,
        input_values=input_values,
        multi_session=input_args.command == 'start-multi-session',
        own_projects=own_projects,
        shared_projects=shared_projects
    )


@app.route('/import')
@requires_auth
@exception_treatment_page
def import_page():
    """ Import tasks from JSON, CSV, ZIP and more
    """
    return flask.render_template(
        'import.html',
        config=g.project.config,
        project=g.project
    )


@app.route('/export')
@requires_auth
@exception_treatment_page
def export_page():
    """ Export completions as JSON or using converters
    """
    return flask.render_template(
        'export.html',
        config=g.project.config,
        formats=g.project.converter.supported_formats,
        project=g.project
    )


@app.route('/model')
@requires_auth
@exception_treatment_page
def model_page():
    """ Machine learning"""
    ml_backends = []
    for ml_backend in g.project.ml_backends:
        if ml_backend.connected:
            try:
                ml_backend.sync(g.project)
                training_status = ml_backend.is_training(g.project)
                ml_backend.training_in_progress = training_status['is_training']
                ml_backend.model_version = training_status['model_version']
                ml_backend.is_connected = True
                ml_backend.is_error = False
            except Exception as exc:
                logger.error(str(exc), exc_info=True)
                ml_backend.is_error = True
                try:
                    # try to parse json as the result of @exception_treatment
                    ml_backend.error = json.loads(str(exc))
                except ValueError:
                    ml_backend.error = {'detail': "Can't parse exception message from ML Backend"}

        else:
            ml_backend.is_connected = False
        ml_backends.append(ml_backend)
    return flask.render_template(
        'model.html',
        config=g.project.config,
        project=g.project,
        ml_backends=ml_backends
    )


def _get_sample_task(label_config):
    predefined_task, completions, predictions = get_task_from_labeling_config(label_config)
    generated_task = generate_sample_task_without_check(label_config, mode='editor_preview')
    if predefined_task is not None:
        generated_task.update(predefined_task)
    return generated_task, completions, predictions


@app.route('/api/render-label-studio', methods=['GET', 'POST'])
@requires_auth
def api_render_label_studio():
    """ Label studio frontend rendering for iframe
    """
    config = request.args.get('config', request.form.get('config', ''))
    config = unquote(config)
    if not config:
        return make_response('No config in POST', status.HTTP_417_EXPECTATION_FAILED)

    task_data, completions, predictions = _get_sample_task(config)

    example_task_data = {
        'id': 1764,
        'data': task_data,
        'completions': completions,
        'predictions': predictions,
        'project': g.project.id,
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

    return flask.render_template('render_ls.html', **response)


@app.route('/api/validate-config', methods=['POST'])
@requires_auth
def api_validate_config():
    """ Validate label config via tags schema
    """
    if 'label_config' not in request.form:
        return make_response('No label_config in POST', status.HTTP_417_EXPECTATION_FAILED)
    try:
        g.project.validate_label_config(request.form['label_config'])
    except ValidationError as e:
        return make_response(jsonify({'label_config': e.msg_to_list()}), status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return make_response(jsonify({'label_config': [str(e)]}), status.HTTP_400_BAD_REQUEST)

    return Response(status=status.HTTP_204_NO_CONTENT)


@app.route('/api/save-config', methods=['POST'])
@requires_auth
def api_save_config():
    """ Save label config
    """
    label_config = None
    if 'label_config' in request.form:
        label_config = request.form['label_config']
    elif 'label_config' in request.json:
        label_config = request.json['label_config']

    # check config before save
    try:
        g.project.validate_label_config(label_config)
    except ValidationError as e:
        return make_response(jsonify({'label_config': e.msg_to_list()}), status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return make_response(jsonify({'label_config': [str(e)]}), status.HTTP_400_BAD_REQUEST)

    try:
        g.project.update_label_config(label_config)
    except Exception as e:
        return make_response(jsonify({'label_config': [str(e)]}), status.HTTP_400_BAD_REQUEST)

    return Response(status=status.HTTP_201_CREATED)


@app.route('/api/import-example', methods=['GET', 'POST'])
@requires_auth
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
        g.project.validate_label_config(config)
        task_data, _, _ = _get_sample_task(config)
    except (ValueError, ValidationError, lxml.etree.Error, KeyError):
        response = HttpResponse('error while example generating', status=status.HTTP_400_BAD_REQUEST)
    else:
        response = HttpResponse(json.dumps(task_data))
    return response


@app.route('/api/import-example-file')
@requires_auth
def api_import_example_file():
    """ Task examples for import
    """
    request.GET = request.args  # django compatibility

    q = request.GET.get('q', 'json')
    filename = 'sample-' + datetime.now().strftime('%Y-%m-%d-%H-%M')
    try:
        task = generate_sample_task(g.project)
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
        if len(g.project.data_types.keys()) > 1:
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

    return response


@app.route('/api/import', methods=['POST'])
@requires_auth
@exception_treatment
def api_import():
    # make django compatibility for uploader module
    class DjangoRequest:
        POST = request.form
        GET = request.args
        FILES = request.files
        data = request.json if request.json else request.form
        content_type = request.content_type

    start = time.time()
    # get tasks from request
    parsed_data, formats = uploader.load_tasks(DjangoRequest(), g.project)
    # validate tasks
    validator = TaskValidator(g.project)
    try:
        new_tasks = validator.to_internal_value(parsed_data)
    except ValidationError as e:
        return make_response(jsonify(e.msg_to_list()), status.HTTP_400_BAD_REQUEST)

    max_id_in_old_tasks = -1
    if not g.project.no_tasks():
        max_id_in_old_tasks = g.project.source_storage.max_id()

    new_tasks = Tasks().from_list_of_dicts(new_tasks, max_id_in_old_tasks + 1)
    try:
        g.project.source_storage.set_many(new_tasks.keys(), new_tasks.values())
    except NotImplementedError:
        raise NotImplementedError('Import is not supported for the current storage ' + str(g.project.source_storage))

    # if tasks have completion - we need to implicitly save it to target
    for i in new_tasks.keys():
        for completion in new_tasks[i].get('completions', []):
            g.project.save_completion(int(i), completion)

    # update schemas based on newly uploaded tasks
    g.project.update_derived_input_schema()
    g.project.update_derived_output_schema()

    duration = time.time() - start
    return make_response(jsonify({
        'task_count': len(new_tasks),
        'completion_count': validator.completion_count,
        'prediction_count': validator.prediction_count,
        'duration': duration,
        'formats': formats,
        'new_task_ids': [t for t in new_tasks]
    }), status.HTTP_201_CREATED)


@app.route('/api/export', methods=['GET'])
@requires_auth
@exception_treatment
def api_export():
    export_format = request.args.get('format')
    now = datetime.now()
    completion_dir = g.project.config['output_dir']

    project_export_dir = os.path.join(os.path.dirname(completion_dir), 'export')
    os.makedirs(project_export_dir, exist_ok=True)

    zip_dir = os.path.join(project_export_dir, now.strftime('%Y-%m-%d-%H-%M-%S'))
    os.makedirs(zip_dir, exist_ok=True)

    g.project.converter.convert(completion_dir, zip_dir, format=export_format)
    shutil.make_archive(zip_dir, 'zip', zip_dir)
    shutil.rmtree(zip_dir)

    response = send_file(zip_dir+'.zip', as_attachment=True)
    response.headers['filename'] = os.path.basename(zip_dir+'.zip')
    return response


@app.route('/api/projects/1/next/', methods=['GET'])
@requires_auth
@exception_treatment
def api_generate_next_task():
    """ Generate next task to label
    """
    # try to find task is not presented in completions
    completed_tasks_ids = g.project.get_completions_ids()
    task = g.project.next_task(completed_tasks_ids)
    if task is None:
        # no tasks found
        return make_response('', 404)

    task = resolve_task_data_uri(task, project=g.project)

    # collect prediction from multiple ml backends
    if g.project.ml_backends_connected:
        task = g.project.make_predictions(task)
    logger.debug('Next task:\n' + str(task.get('id', None)))
    return make_response(jsonify(task), 200)


@app.route('/api/project/', methods=['POST', 'GET', 'PATCH'])
@requires_auth
@exception_treatment
def api_project():
    """ Project global operation"""
    code = 200

    if request.method == 'POST' and request.args.get('new', False):
        input_args.project_desc = request.args.get('desc')
        g.project = project_get_or_create(multi_session_force_recreate=True)
        code = 201
    elif request.method == 'PATCH':
        g.project.update_params(request.json)
        code = 201

    output = g.project.serialize()
    output['multi_session_mode'] = input_args.command != 'start-multi-session'
    return make_response(jsonify(output), code)


@app.route('/api/project/storage-settings/', methods=['GET', 'POST'])
@requires_auth
@exception_treatment
def api_project_storage_settings():

    # GET: return selected form, populated with current storage parameters
    if request.method == 'GET':
        # render all forms for caching in web
        all_forms = {'source': {}, 'target': {}}
        for storage_for in all_forms:
            for name, description in g.project.get_available_storage_names(storage_for).items():
                current_type = g.project.config.get(storage_for, {'type': ''})['type']
                current = name == current_type
                form_class = get_storage_form(name)
                form = form_class(data=g.project.get_storage(storage_for).get_params()) if current else form_class()
                all_forms[storage_for][name] = {
                    'fields': [serialize_class(field) for field in form],
                    'type': name, 'current': current, 'description': description,
                    'path': getattr(g.project, storage_for + '_storage').readable_path
                }
                # generate data key automatically
                if g.project.data_types.keys():
                    for field in all_forms[storage_for][name]['fields']:
                        if field['name'] == 'data_key' and not field['data']:
                            field['data'] = list(g.project.data_types.keys())[0]
        return make_response(jsonify(all_forms), 200)

    # POST: update storage given filled form
    if request.method == 'POST':
        selected_type = request.args.get('type', '')
        storage_for = request.args.get('storage_for')
        current_type = g.project.config.get(storage_for, {'type': ''})['type']
        selected_type = selected_type if selected_type else current_type

        form = get_storage_form(selected_type)(data=request.json)

        if form.validate_on_submit():
            storage_kwargs = dict(form.data)
            storage_kwargs['type'] = request.json['type']  # storage type
            try:
                g.project.update_storage(storage_for, storage_kwargs)
            except Exception as e:
                traceback = tb.format_exc()
                logger.error(str(traceback))
                return make_response(jsonify({'detail': 'Error while storage update: ' + str(e)}), 400)
            else:
                return make_response(jsonify({'result': 'ok'}), 201)
        else:
            logger.error('Errors: ' + str(form.errors) + ' for request body ' + str(request.json))
            return make_response(jsonify({'errors': form.errors}), 400)


@app.route('/api/tasks/', methods=['GET'])
@requires_auth
@exception_treatment
def api_all_tasks():
    """ Get full tasks with pagination, completions and predictions
    """
    page, page_size = int(request.args.get('page', 1)), int(request.args.get('page_size', 10))
    order = request.args.get('order', 'id')
    if page < 1 or page_size < 1:
        return make_response(jsonify({'detail': 'Incorrect page or page_size'}), 422)

    order_inverted = order[0] == '-'
    order = order[1:] if order_inverted else order
    if order not in ['id', 'completed_at', 'has_skipped_completions']:
        return make_response(jsonify({'detail': 'Incorrect order'}), 422)

    # get task ids and sort them by completed time
    task_ids = g.project.source_storage.ids()
    completed_at = g.project.get_completed_at()
    skipped_status = g.project.get_skipped_status()

    # ordering
    pre_order = ({
        'id': i,
        'completed_at': completed_at[i] if i in completed_at else None,
        'has_skipped_completions': skipped_status[i] if i in completed_at else None,
    } for i in task_ids)

    if order == 'id':
        ordered = sorted(pre_order, key=lambda x: x['id'], reverse=order_inverted)

    else:
        # for has_skipped_completions use two keys ordering
        if order == 'has_skipped_completions':
            ordered = sorted(pre_order,
                             key=lambda x: (DirectionSwitch(x['has_skipped_completions'], not order_inverted),
                                            DirectionSwitch(x['completed_at'], False)))
        # another orderings
        else:
            ordered = sorted(pre_order, key=lambda x: (DirectionSwitch(x[order], not order_inverted)))

    paginated = ordered[(page - 1) * page_size:page * page_size]

    # get tasks with completions
    tasks = []
    for item in paginated:
        if item['completed_at'] != 'undefined' and item['completed_at'] is not None:
            item['completed_at'] = timestamp_to_local_datetime(item['completed_at']).strftime('%Y-%m-%d %H:%M:%S')
        i = item['id']
        task = g.project.get_task_with_completions(i)
        if task is None:  # no completion at task
            task = g.project.source_storage.get(i)
        else:
            task['completed_at'] = item['completed_at']
            task['has_skipped_completions'] = item['has_skipped_completions']
        task = resolve_task_data_uri(task, project=g.project)
        tasks.append(task)

    return make_response(jsonify(tasks), 200)


@app.route('/api/tasks/<task_id>/', methods=['GET', 'DELETE'])
@requires_auth
@exception_treatment
def api_tasks(task_id):
    """ Get task by id
    """
    # try to get task with completions first
    task_id = int(task_id)
    if request.method == 'GET':
        task_data = g.project.get_task_with_completions(task_id) or g.project.source_storage.get(task_id)
        task_data = resolve_task_data_uri(task_data, project=g.project)

        if g.project.ml_backends_connected:
            task_data = g.project.make_predictions(task_data)

        return make_response(jsonify(task_data), 200)
    elif request.method == 'DELETE':
        g.project.remove_task(task_id)
        return make_response(jsonify('Task deleted.'), 204)


@app.route('/api/tasks/delete', methods=['DELETE'])
@requires_auth
@exception_treatment
def api_tasks_delete():
    """ Delete all tasks & completions
    """
    g.project.delete_tasks()
    return make_response(jsonify({}), 204)


@app.route('/api/projects/1/completions_ids/', methods=['GET'])
@requires_auth
@exception_treatment
def api_all_completion_ids():
    """ Get all completion ids
    """
    ids = g.project.get_completions_ids()
    return make_response(jsonify(ids), 200)


@app.route('/api/tasks/<task_id>/completions/', methods=['POST', 'DELETE'])
@requires_auth
@exception_treatment
def api_completions(task_id):
    """ Delete or save new completion to output_dir with the same name as task_id
    """
    if request.method == 'POST':
        completion = request.json
        completion.pop('state', None)  # remove editor state
        completion.pop('skipped', None)
        completion.pop('was_cancelled', None)
        completion_id = g.project.save_completion(int(task_id), completion)
        return make_response(json.dumps({'id': completion_id}), 201)
    else:
        return make_response('Incorrect request method', 500)


@app.route('/api/project/completions/', methods=['DELETE'])
@requires_auth
@exception_treatment
def api_all_completions():
    """ Delete all completions
    """
    if request.method == 'DELETE':
        g.project.delete_all_completions()
        return make_response('done', 201)

    else:
        return make_response('Incorrect request method', 500)


@app.route('/api/tasks/<task_id>/cancel', methods=['POST'])
@requires_auth
@exception_treatment
def api_tasks_cancel(task_id):
    task_id = int(task_id)
    skipped_completion = request.json
    skipped_completion['was_cancelled'] = True  # for platform support
    skipped_completion['skipped'] = True

    completion_id = g.project.save_completion(task_id, skipped_completion)
    return make_response(json.dumps({'id': completion_id}), 201)


@app.route('/api/tasks/<task_id>/completions/<completion_id>/', methods=['DELETE'])
@requires_auth
@exception_treatment
def api_completion_by_id(task_id, completion_id):
    """ Delete or save new completion to output_dir with the same name as task_id.
        completion_id with different IDs is not supported in this backend
    """
    if request.method == 'DELETE':
        if g.project.config.get('allow_delete_completions', False):
            g.project.delete_completion(int(task_id))
            return make_response('deleted', 204)
        else:
            return make_response('Completion removing is not allowed in server config', 422)
    else:
        return make_response('Incorrect request method', 500)


@app.route('/api/tasks/<task_id>/completions/<completion_id>/', methods=['PATCH'])
@requires_auth
@exception_treatment
def api_completion_update(task_id, completion_id):
    """ Rewrite existing completion with patch.
        This is technical api call for editor testing only. It's used for Rewrite button in editor.
    """
    task_id = int(task_id)
    completion = request.json

    completion.pop('state', None)  # remove editor state
    completion['skipped'] = completion['was_cancelled'] = False  # pop is a bad idea because of dict updating inside

    completion['id'] = int(completion_id)
    g.project.save_completion(task_id, completion)
    return make_response('ok', 201)


@app.route('/api/projects/1/expert_instruction')
@requires_auth
@exception_treatment
def api_instruction():
    """ Instruction for annotators
    """
    return make_response(g.project.config['instruction'], 200)


@app.route('/api/remove-ml-backend', methods=['POST'])
@requires_auth
@exception_treatment
def api_remove_ml_backend():
    ml_backend_name = request.json['name']
    g.project.remove_ml_backend(ml_backend_name)
    return make_response(jsonify('Deleted!'), 204)


@app.route('/predict', methods=['POST'])
@requires_auth
@exception_treatment
def api_predict():
    """ Make ML prediction using ml_backends
    """
    if 'data' not in request.json:
        task = {'data': request.json}
    else:
        task = request.json
    if g.project.ml_backends_connected:
        task_with_predictions = g.project.make_predictions(task)
        g.project.analytics.send(getframeinfo(currentframe()).function)
        return make_response(jsonify(task_with_predictions), 200)
    else:
        g.project.analytics.send(getframeinfo(currentframe()).function, error=400)
        return make_response(jsonify("No ML backend"), 400)


@app.route('/api/train', methods=['POST'])
@requires_auth
@exception_treatment
def api_train():
    """Send train signal to ML backend"""
    if g.project.ml_backends_connected:
        training_started = g.project.train()
        if training_started:
            logger.debug('Training started.')
            return make_response(jsonify({'details': 'Training started'}), 200)
        else:
            logger.debug('Training failed.')
            return make_response(
                jsonify('Training is not started: seems that you don\'t have any ML backend connected'), 400)
    else:
        return make_response(jsonify("No ML backend"), 400)


@app.route('/api/predictions', methods=['POST'])
@requires_auth
@exception_treatment
def api_predictions():
    """Send creating predictions signal to ML backend"""
    if g.project.ml_backends_connected:
        # get tasks ids without predictions
        tasks_with_predictions = {}
        for task_id, task in g.project.source_storage.items():
            task_pred = g.project.make_predictions(task)
            tasks_with_predictions[task_pred['id']] = task_pred
        g.project.source_storage.set_many(tasks_with_predictions.keys(), tasks_with_predictions.values())
        return make_response(jsonify({'details': 'Predictions done.'}), 200)
    else:
        return make_response(jsonify("No ML backend"), 400)


@app.route('/version')
@requires_auth
@exception_treatment
def version():
    """Show backend and frontend version"""
    lsf = json.load(open(find_dir('static/editor') + '/version.json'))
    ver = {
        'label-studio-frontend': lsf,
        'label-studio-backend': label_studio.__version__
    }
    return make_response(jsonify(ver), 200)


@app.route('/data/<path:filename>')
@requires_auth
@exception_treatment
def get_data_file(filename):
    """ External resource serving
    """
    # support for upload via GUI
    if filename.startswith('upload/'):
        path = os.path.join(g.project.path, filename)
        directory = os.path.abspath(os.path.dirname(path))
        filename = os.path.basename(path)
        return flask.send_from_directory(directory, filename, as_attachment=True)

    # serving files from local storage
    if not g.project.config.get('allow_serving_local_files'):
        raise FileNotFoundError('Serving local files is not allowed. '
                                'Use "allow_serving_local_files": true config option to enable local serving')
    directory = request.args.get('d')
    return flask.send_from_directory(directory, filename, as_attachment=True)


@app.route('/api/project-switch', methods=['GET', 'POST'])
@requires_auth
@exception_treatment
def api_project_switch():
    """ Switch projects """

    if request.args.get('uuid') is None:
        return make_response("Not a valid UUID", 400)

    uuid = request.args.get('uuid')
    user = Project.get_user_by_project(uuid, input_args.root_dir)

    # not owner user tries to open shared project
    if user != g.user:
        # create/append shared projects for user
        if 'shared_projects' not in session:
            session['shared_projects'] = {}
        session['shared_projects'].update({uuid: {}})

    # switch project
    session['project'] = uuid

    output = g.project.serialize()
    output['multi_session_mode'] = input_args.command == 'start-multi-session'
    if request.method == 'GET':
        return redirect('../setup')
    else:
        return make_response(jsonify(output), 200)


@app.route('/api/states', methods=['GET'])
@requires_auth
@exception_treatment
def stats():
    """ Save states
    """
    return make_response('{"status": "done"}', 200)


@app.route('/api/health', methods=['GET'])
@requires_auth
@exception_treatment
def health():
    """ Health check
    """
    return make_response('{"status": "up"}', 200)


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
        import label_studio.utils.auth
        config = Project.get_config(input_args.project_name, input_args)

        # set username and password
        label_studio.utils.auth.USERNAME = input_args.username or \
            config.get('username') or label_studio.utils.auth.USERNAME
        label_studio.utils.auth.PASSWORD = input_args.password or config.get('password', '')

        # set host name
        host = input_args.host or config.get('host', 'localhost')  # name for external links generation
        port = input_args.port or config.get('port', 8080)
        server_host = 'localhost' if host == 'localhost' else '0.0.0.0'  # web server host

        # ssl certificate and key
        cert_file = input_args.cert_file or config.get('cert')
        key_file = input_args.key_file or config.get('key')
        ssl_context = None
        if cert_file and key_file:
            config['protocol'] = 'https://'
            ssl_context = (cert_file, key_file)

        # check port is busy
        if not input_args.debug and check_port_in_use('localhost', port):
            old_port = port
            port = int(port) + 1
            print('\n*** WARNING! ***\n* Port ' + str(old_port) + ' is in use.\n' +
                  '* Trying to start at ' + str(port) +
                  '\n****************\n')

        set_web_protocol(input_args.protocol or config.get('protocol', 'http://'))
        set_full_hostname(get_web_protocol() + host.replace('0.0.0.0', 'localhost') + ':' + str(port))

        start_browser('http://localhost:' + str(port), input_args.no_browser)
        if input_args.use_gevent:
            app.debug = input_args.debug
            ssl_args = {'keyfile': key_file, 'certfile': cert_file} if ssl_context else {}
            http_server = WSGIServer((server_host, port), app, log=app.logger, **ssl_args)
            http_server.serve_forever()
        else:
            app.run(host=server_host, port=port, debug=input_args.debug, ssl_context=ssl_context)

    # On `start-multi-session` command, server creates one project per each browser sessions
    elif input_args.command == 'start-multi-session':
        server_host = input_args.host or '0.0.0.0'
        port = input_args.port or 8080

        if input_args.use_gevent:
            app.debug = input_args.debug
            http_server = WSGIServer((server_host, port), app, log=app.logger)
            http_server.serve_forever()
        else:
            app.run(host=server_host, port=port, debug=input_args.debug)


if __name__ == "__main__":
    main()

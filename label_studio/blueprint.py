import os
import io
import attr
import shutil
import flask
import pathlib
import functools
import logging
import logging.config
import pandas as pd
import traceback as tb
import label_studio

try:
    import ujson as json
except ModuleNotFoundError:
    import json

# setup default config for logging
with io.open(os.path.join(os.path.dirname(__file__), 'logger.json')) as f:
    logging.config.dictConfig(json.load(f))

from uuid import uuid4
from urllib.parse import unquote
from datetime import datetime
from gevent.pywsgi import WSGIServer
from flask import (
    request, jsonify, make_response, Response, send_file, session, redirect, current_app, Blueprint, url_for, g
)
from flask_api import status
from types import SimpleNamespace

from label_studio.utils.io import find_dir, find_editor_files
from label_studio.utils.exceptions import ValidationError, LabelStudioError
from label_studio.utils.functions import (
    set_external_hostname, set_web_protocol, get_web_protocol,
    generate_time_series_json, get_sample_task
)
from label_studio.utils.misc import (
    exception_handler, exception_handler_page, check_port_in_use, start_browser, str2datetime,
    config_line_stripped, get_config_templates, convert_string_to_hash, serialize_class
)
from label_studio.utils.analytics import Analytics
from label_studio.utils.argparser import parse_input_args
from label_studio.utils.uri_resolver import resolve_task_data_uri
from label_studio.utils.auth import requires_auth
from label_studio.storage import get_storage_form
from label_studio.project import Project
from label_studio.data_manager.functions import remove_tabs

from label_studio.data_manager.views import blueprint as data_manager_blueprint
from label_studio.data_import.views import blueprint as data_import_blueprint

INPUT_ARGUMENTS_PATH = pathlib.Path("server.json")

logger = logging.getLogger(__name__)
blueprint = Blueprint(__package__, __name__,
                      static_folder='static', static_url_path='/static',
                      template_folder='templates')
blueprint.add_app_template_filter(str2datetime, 'str2datetime')


@attr.s(frozen=True)
class LabelStudioConfig:
    input_args = attr.ib()


def set_input_arguments_path(path):
    global INPUT_ARGUMENTS_PATH
    INPUT_ARGUMENTS_PATH = pathlib.Path(path)


@functools.lru_cache(maxsize=1)
def config_from_file():
    try:
        config_file = INPUT_ARGUMENTS_PATH.open(encoding='utf8')
    except OSError:
        raise LabelStudioError("Can't open input_args file: " + str(INPUT_ARGUMENTS_PATH) + ", " 
                               "use set_input_arguments_path() to setup it")

    with config_file:
        data = json.load(config_file)
    return LabelStudioConfig(input_args=SimpleNamespace(**data))


def app_before_request_callback():
    # skip endpoints where no project is needed
    if request.endpoint in ('label_studio.static', 'label_studio.send_static'):
        return

    # prepare global variables
    def prepare_globals():
        # setup session cookie
        if 'session_id' not in session:
            session['session_id'] = str(uuid4())
        g.project = project_get_or_create()
        g.analytics = Analytics(current_app.label_studio.input_args, g.project)
        g.sid = g.analytics.server_id

    # show different exception pages for api and other endpoints
    if request.path.startswith('/api'):
        return exception_handler(prepare_globals)()
    else:
        return exception_handler_page(prepare_globals)()


@exception_handler
def app_after_request_callback(response):
    if hasattr(g, 'analytics'):
        g.analytics.send(request, session, response)

    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE')

    if request.method != 'GET':
        response.headers.add('Allow', 'GET, POST, PATCH, PUT, DELETE')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')

    return response


def create_app(label_studio_config=None):
    """ Create application factory, as explained here:
        http://flask.pocoo.org/docs/patterns/appfactories/.

    :param label_studio_config: LabelStudioConfig object to use with input_args params
    """
    app = flask.Flask(__package__, static_url_path='')
    app.secret_key = 'A0Zrdqwf1AQWj12ajkhgFN]dddd/,?RfDWQQT'
    app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
    app.config['WTF_CSRF_ENABLED'] = False
    app.url_map.strict_slashes = False
    app.label_studio = label_studio_config or config_from_file()

    # check LabelStudioConfig correct loading
    if app.label_studio is None:
        raise LabelStudioError('LabelStudioConfig is not loaded correctly')

    app.register_blueprint(blueprint)  # main app
    app.register_blueprint(data_manager_blueprint)
    app.register_blueprint(data_import_blueprint)

    app.before_request(app_before_request_callback)
    app.after_request(app_after_request_callback)
    return app


def project_get_or_create(multi_session_force_recreate=False):
    """ Return existed or create new project based on environment. Currently supported methods:
        - "fixed": project is based on "project_name" attribute specified by input args when app starts
        - "session": project is based on "project_name" key restored from flask.session object

        :param multi_session_force_recreate: create a new project if True
        :return: project
    """
    input_args = current_app.label_studio.input_args
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
            'user': convert_string_to_hash(user.encode())
        })
    else:
        if multi_session_force_recreate:
            raise NotImplementedError(
                '"multi_session_force_recreate" option supported only with "start-multi-session" mode')
        return Project.get_or_create(input_args.project_name,
                                     input_args, context={'multi_session': False})


@blueprint.route('/static/media/<path:path>')
@requires_auth
def send_media(path):
    """ Static for label tool js and css
    """
    media_dir = find_dir('static/media')
    return flask.send_from_directory(media_dir, path)


@blueprint.route('/static/<path:path>')
@requires_auth
def send_static(path):
    """ Static serving
    """
    static_dir = find_dir('static')
    return flask.send_from_directory(static_dir, path)


@blueprint.route('/data/<path:filename>')
@requires_auth
@exception_handler
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


@blueprint.route('/samples/time-series.csv')
@requires_auth
def samples_time_series():
    """ Generate time series example for preview
    """
    time_column = request.args.get('time', '')
    value_columns = request.args.get('values', '').split(',')
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


@blueprint.route('/')
@blueprint.route('/label-old')
@requires_auth
@exception_handler_page
def labeling_page():
    """ Label stream for tasks
    """
    if g.project.no_tasks():
        return redirect(url_for('label_studio.welcome_page'))

    # task data: load task or task with completions if it exists
    task_id = request.args.get('task_id', None)
    task_data = None

    # open separated LSF for task
    if task_id is not None:
        task_id = int(task_id)
        # Task explore mode
        task_data = g.project.get_task_with_completions(task_id) or g.project.source_storage.get(task_id)
        task_data = resolve_task_data_uri(task_data, project=g.project)

        if g.project.ml_backends_connected:
            task_data = g.project.make_predictions(task_data)

    # data manager if no task id to open
    elif 'label-old' not in request.url:
        return redirect(url_for('data_manager_blueprint.tasks_page'))

    return flask.render_template(
        'labeling.html',
        project=g.project,
        config=g.project.config,
        label_config_line=g.project.label_config_line,
        task_id=task_id,
        task_data=task_data,
        version=label_studio.__version__,
        **find_editor_files()
    )


@blueprint.route('/welcome')
@requires_auth
@exception_handler_page
def welcome_page():
    """ On-boarding page
    """
    g.project.update_on_boarding_state()
    if g.project.on_boarding['import']:
        return redirect(url_for('data_manager_blueprint.tasks_page'))
    return flask.render_template(
        'welcome.html',
        config=g.project.config,
        project=g.project,
        on_boarding=g.project.on_boarding
    )


@blueprint.route('/setup')
@blueprint.route('/settings')
@requires_auth
@exception_handler_page
def setup_page():
    """ Setup labeling config
    """
    input_values = {}
    project = g.project
    input_args = current_app.label_studio.input_args

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

    # this is useful for the transfer to playground templates
    template_mode = request.args.get('template_mode')
    page = 'includes/setup_templates.html' if template_mode else 'setup.html'

    templates = get_config_templates(g.project.config)
    return flask.render_template(
        page,
        config=g.project.config,
        project=g.project,
        label_config_full=g.project.label_config_full,
        templates=templates,
        input_values=input_values,
        multi_session=input_args.command == 'start-multi-session',
        own_projects=own_projects,
        shared_projects=shared_projects,
        template_mode=template_mode,
        serialized_project=g.project.serialize()
    )


@blueprint.route('/export')
@requires_auth
@exception_handler_page
def export_page():
    """ Export page: export completions as JSON or using converters
    """
    return flask.render_template(
        'export.html',
        config=g.project.config,
        formats=g.project.converter.supported_formats,
        project=g.project
    )


@blueprint.route('/model')
@requires_auth
@exception_handler_page
def model_page():
    """ Machine learning backends page
    """
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
                    # try to parse json as the result of @exception_handler
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


@blueprint.route('/version')
@requires_auth
@exception_handler
def version():
    """ Show LS backend and LS frontend versions
    """
    with open(find_dir('static/editor') + '/version.json') as f:
        lsf = json.load(f)
    with open(find_dir('static/dm') + '/version.json') as f:
        dm = json.load(f)
    ver = {
        'label-studio-frontend': lsf,
        'label-studio-datamanager': dm,
        'label-studio-backend': label_studio.__version__
    }
    return make_response(jsonify(ver), 200)


@blueprint.route('/render-label-studio', methods=['GET', 'POST'])
@requires_auth
def api_render_label_studio():
    """ Label studio frontend rendering for iframe
    """
    config = request.args.get('config', request.form.get('config', ''))
    config = unquote(config)
    if not config:
        return make_response('No config in POST', status.HTTP_417_EXPECTATION_FAILED)

    task_data, completions, predictions = get_sample_task(config)

    example_task_data = {
        'id': 42,
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


@blueprint.route('/api/validate-config', methods=['POST'])
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


@blueprint.route('/api/project', methods=['POST', 'GET', 'PATCH'])
@requires_auth
@exception_handler
def api_project():
    """ Project properties and create a new for multi-session mode
    """
    code = 200
    input_args = current_app.label_studio.input_args

    # new project
    if request.method == 'POST' and request.args.get('new', False):
        input_args.web_gui_project_desc = request.args.get('desc')
        g.project = project_get_or_create(multi_session_force_recreate=True)
        delattr(input_args, 'web_gui_project_desc')  # remove it to avoid other users affecting
        code = 201

    # update project params, ml backend settings
    elif request.method == 'PATCH':
        g.project.update_params(request.json)
        code = 201

    output = g.project.serialize()
    output['multi_session_mode'] = input_args.command == 'start-multi-session'
    return make_response(jsonify(output), code)


@blueprint.route('/api/project/config', methods=['POST'])
@requires_auth
def api_save_config():
    """ Save labeling config
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

    # update config states
    try:
        schema_before = g.project.input_data_scheme
        g.project.update_label_config(label_config)
        schema_after = g.project.input_data_scheme
        if not schema_before.issubset(schema_after):
            remove_tabs(g.project)
    except Exception as e:
        return make_response(jsonify({'label_config': [str(e)]}), status.HTTP_400_BAD_REQUEST)

    return Response(status=status.HTTP_201_CREATED)


@blueprint.route('/api/project/export', methods=['GET'])
@requires_auth
@exception_handler
def api_export():
    """ Export labeling results using label-studio-converter to popular formats
    """
    export_format = request.args.get('format')
    now = datetime.now()

    os.makedirs(g.project.export_dir, exist_ok=True)

    zip_dir = os.path.join(g.project.export_dir, now.strftime('%Y-%m-%d-%H-%M-%S') + '-' + export_format)
    os.makedirs(zip_dir, exist_ok=True)
    g.project.converter.convert(g.project.output_dir, zip_dir, format=export_format)
    shutil.make_archive(zip_dir, 'zip', zip_dir)
    shutil.rmtree(zip_dir)

    zip_dir_full_path = os.path.abspath(zip_dir + '.zip')
    response = send_file(zip_dir_full_path, as_attachment=True)
    response.headers['filename'] = os.path.basename(zip_dir_full_path)
    return response


@blueprint.route('/api/project/storage-settings', methods=['GET', 'POST'])
@requires_auth
@exception_handler
def api_project_storage_settings():
    """ Set project storage settings: Amazon S3, Google CS, local file storages.
        Source storages store input tasks in json formats.
        Target storage store completions with labeling results
    """

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


@blueprint.route('/api/project-switch', methods=['GET', 'POST'])
@requires_auth
@exception_handler
def api_project_switch():
    """ Switch projects in multi-session mode
    """
    input_args = current_app.label_studio.input_args

    if request.args.get('uuid') is None:
        return make_response({'detail': "Not a valid UUID"}, 400)

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
        return redirect(url_for('label_studio.setup_page'))
    else:
        return make_response(jsonify(output), 200)


@blueprint.route('/api/tasks', methods=['GET', 'DELETE'])
@requires_auth
@exception_handler
def api_all_tasks():
    """ Tasks API: retrieve by filters, delete all tasks
    """
    from label_studio.data_manager.functions import prepare_tasks

    # retrieve tasks (plus completions and predictions) with pagination & ordering
    if request.method == 'GET':
        tab = {
            'ordering': [request.values.get('order', 'id')],
            'filters': request.json.get('filters', None) if request.json is not None else None,
            'fields': request.values.get('fields', 'all').split(',')
        }

        # get filter parameters from request
        page, page_size = int(request.values.get('page', 1)), int(request.values.get('page_size', 10))
        if page < 1 or page_size < 1:
            return make_response({'detail': 'Incorrect page or page_size'}, 422)

        params = SimpleNamespace(page=page, page_size=page_size, tab=tab, resolve_uri=True)
        tasks = prepare_tasks(g.project, params)
        return make_response(jsonify(tasks), 200)

    # delete all tasks with completions
    if request.method == 'DELETE':
        g.project.delete_all_tasks()
        return make_response(jsonify({'detail': 'deleted'}), 204)


@blueprint.route('/api/tasks/<task_id>', methods=['GET', 'DELETE', 'PATCH', 'POST'])
@requires_auth
@exception_handler
def api_task_by_id(task_id):
    """ Get task by id, this call will refresh this task predictions
    """
    task_id = int(task_id)

    # try to get task with completions first
    if request.method == 'GET':
        from label_studio.data_manager.functions import load_task
        task = load_task(g.project, task_id, None, resolve_uri=True)

        if g.project.ml_backends_connected:
            task = g.project.make_predictions(task)

        # change indent for pretty jsonify
        indent = 2 if request.values.get('pretty', False) else None
        response = current_app.response_class(
            json.dumps(task, indent=indent) + "\n",
            mimetype=current_app.config["JSONIFY_MIMETYPE"],
        )
        return make_response(response, 200)

    if request.method == 'PATCH' or request.method == 'POST':
        data = request.json
        g.project.source_storage._validate_task(task_id, data)
        g.project.source_storage.set(task_id, data)
        return make_response({'detail': 'Task patched', 'data': data}, 200)

    # delete task
    elif request.method == 'DELETE':
        g.project.delete_task(task_id)
        return make_response(jsonify({'detail': 'Task deleted'}), 204)


@blueprint.route('/api/tasks/<task_id>/completions', methods=['POST', 'DELETE'])
@requires_auth
@exception_handler
def api_tasks_completions(task_id):
    """ Save new completion or delete all completions
    """
    task_id = int(task_id)

    # save completion
    if request.method == 'POST':
        completion = request.json

        # cancelled completion
        was_cancelled = request.values.get('was_cancelled', False)
        if was_cancelled:
            completion['was_cancelled'] = True

        # regular completion
        else:
            completion.pop('skipped', None)  # deprecated
            completion.pop('was_cancelled', None)

        completion_id = g.project.save_completion(task_id, completion)
        return make_response(json.dumps({'id': completion_id}), 201)

    # remove all task completions
    if request.method == 'DELETE':
        if g.project.config.get('allow_delete_completions', False):
            g.project.delete_task_completions(task_id)
            return make_response('deleted', 204)
        else:
            return make_response({'detail': 'Completion removing is not allowed in server config'}, 422)


@blueprint.route('/api/tasks/<task_id>/completions/<completion_id>', methods=['POST', 'PATCH', 'DELETE'])
@requires_auth
@exception_handler
def api_completion_by_id(task_id, completion_id):
    """ Update existing completion with patch.
    """
    # catch case when completion is not submitted yet, but user tries to act with it
    if completion_id == 'null':
        return make_response({'detail': 'completion id is null'}, 200)

    task_id = int(task_id)
    completion_id = int(completion_id)

    # update completion
    if request.method == 'PATCH' or request.method == 'POST':
        completion = request.json
        completion['id'] = completion_id
        if 'was_cancelled' in request.values:
            completion['was_cancelled'] = bool(request.values['was_cancelled'])

        g.project.save_completion(task_id, completion)
        return make_response({'detail': 'created'}, 201)

    # delete completion
    elif request.method == 'DELETE':
        if g.project.config.get('allow_delete_completions', False):
            g.project.delete_task_completion(task_id, completion_id)
            return make_response({'detail': 'deleted'}, 204)
        else:
            return make_response({'detail': 'Completion removing is not allowed in server config'}, 422)


@blueprint.route('/api/completions', methods=['GET', 'DELETE'])
@requires_auth
@exception_handler
def api_all_completions():
    """ Get all completion ids
        Delete all project completions
    """
    # delete all completions
    if request.method == 'DELETE':
        g.project.delete_all_completions()
        return make_response({'detail': 'done'}, 201)

    # get all completions ids
    elif request.method == 'GET':
        ids = g.project.get_completions_ids()
        return make_response(jsonify({'ids': ids}), 200)

    else:
        return make_response({'detail': 'Incorrect request method'}, 500)


@blueprint.route('/api/models', methods=['GET', 'DELETE'])
@requires_auth
@exception_handler
def api_models():
    """ List ML backends names and remove it by name
    """
    # list all ml backends
    if request.method == 'GET':
        model_names = [model.model_name for model in g.project.ml_backends]
        return make_response(jsonify({'models': model_names}), 200)

    # delete specified ml backend
    if request.method == 'DELETE':
        ml_backend_name = request.json['name']
        g.project.remove_ml_backend(ml_backend_name)
        return make_response({'detail': 'ML backend deleted'}, 204)


@blueprint.route('/api/models/train', methods=['POST'])
@requires_auth
@exception_handler
def api_train():
    """ Send train signal to ML backend
    """
    if g.project.ml_backends_connected:
        training_started = g.project.train()
        if training_started:
            logger.debug('Training started.')
            return make_response(jsonify({'detail': 'Training started'}), 200)
        else:
            logger.debug('Training failed.')
            return make_response(
                jsonify({'detail': 'Training is not started: seems that you don\'t have any ML backend connected'}), 400)
    else:
        return make_response(jsonify({'detail': "No ML backend"}), 400)


@blueprint.route('/api/models/predictions', methods=['GET', 'POST'])
@requires_auth
@exception_handler
def api_predictions():
    """ Make ML predictions using ML backends

        param mode: "data" [default] - task data will be taken and predicted from request.json
                    "all_tasks" - make predictions for all tasks in DB
    """
    mode = request.values.get('mode', 'data')  # data | all_tasks
    if g.project.ml_backends_connected:

        # make prediction for task data from request
        if mode == 'data':
            if request.json is None:
                return make_response(jsonify({'detail': 'no task data found in request json'}), 422)

            task = request.json if 'data' in request.json else {'data': request.json}
            task_with_predictions = g.project.make_predictions(task)
            return make_response(jsonify(task_with_predictions), 200)

        # make prediction for all tasks
        elif mode == 'all_tasks':
            # get tasks ids without predictions
            tasks_with_predictions = {}
            for task_id, task in g.project.source_storage.items():
                task_pred = g.project.make_predictions(task)
                tasks_with_predictions[task_pred['id']] = task_pred

            # save tasks with predictions to storage
            g.project.source_storage.set_many(tasks_with_predictions.keys(), tasks_with_predictions.values())
            return make_response(jsonify({'details': 'predictions are ready'}), 200)

        # unknown mode
        else:
            return make_response(jsonify({'detail': 'unknown mode'}), 422)
    else:
        return make_response(jsonify({'detail': "No ML backend"}), 400)


@blueprint.route('/api/states', methods=['GET'])
@requires_auth
@exception_handler
def stats():
    """ Save states
    """
    return make_response('{"status": "done"}', 200)


@blueprint.route('/api/health', methods=['GET'])
@requires_auth
@exception_handler
def health():
    """ Health check
    """
    return make_response('{"status": "up"}', 200)


@blueprint.errorhandler(ValidationError)
def validation_error_handler(error):
    logger.error(error)
    return str(error), 500


@blueprint.app_template_filter('json')
def json_filter(s):
    return json.dumps(s)


def main():
    # this will avoid looped imports and will register deprecated endpoints in the blueprint
    import label_studio.deprecated

    input_args = parse_input_args()
    app = create_app(LabelStudioConfig(input_args=input_args))

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
        host = input_args.host or config.get('host', 'localhost')
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

        # external hostname is used for data import paths, they must be absolute always,
        # otherwise machine learning backends couldn't access them
        set_web_protocol(input_args.protocol or config.get('protocol', 'http://'))
        external_hostname = get_web_protocol() + host.replace('0.0.0.0', 'localhost')
        if host in ['0.0.0.0', 'localhost', '127.0.0.1']:
            external_hostname += ':' + str(port)
        set_external_hostname(external_hostname)

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

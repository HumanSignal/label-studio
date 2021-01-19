import io
import os
import ssl
import hashlib
import lxml
import time
import pandas as pd
import lxml.etree
import logging

try:
    import ujson as json
except ModuleNotFoundError:
    import json

from urllib.request import urlopen
from werkzeug.utils import secure_filename
from datetime import datetime
from flask import request, jsonify, make_response, Response as HttpResponse, g
from flask_api import status

from label_studio.utils.auth import requires_auth
from label_studio.utils.misc import exception_handler, convert_string_to_hash
from label_studio.data_import.views import blueprint
from label_studio.utils.exceptions import ValidationError
from label_studio.utils.functions import generate_sample_task, get_sample_task

from .models import ImportState


logger = logging.getLogger(__name__)


@blueprint.route('/api/import-example', methods=['GET', 'POST'])
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
        task_data, _, _ = get_sample_task(config)
    except (ValueError, ValidationError, lxml.etree.Error, KeyError):
        response = HttpResponse('error while example generating', status=status.HTTP_400_BAD_REQUEST)
    else:
        response = HttpResponse(json.dumps(task_data))
    return response


@blueprint.route('/api/import-example-file')
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


def _is_allowed_file(filename):
    """ Secured mode allows only certain file extensions being uploaded on server """
    return True


def _upload_files(request_files, project):
    filelist = []
    for _, file in request_files.items():
        if file and file.filename and _is_allowed_file(file.filename):
            filename = secure_filename(file.filename)

            # read as text or binary file
            if isinstance(file, io.TextIOWrapper):
                with open(filename, mode='rb') as f:
                    data = f.read()
            else:
                data = file.read()

            # assign unique filename
            filename = convert_string_to_hash(data, trim=6) + '-' + os.path.basename(filename)

            # save file to path on disk
            with open(os.path.join(project.upload_dir, filename), mode='wb') as f:
                f.write(data)

            filelist.append(filename)

    return filelist


def _create_import_state(request, g):
    data = request.json if request.json else request.form

    # Files import
    if len(request.files):
        uploaded_files = _upload_files(request.files, g.project)
        import_state = ImportState.create_from_filelist(filelist=uploaded_files, project=g.project)

    # URL import
    elif 'application/x-www-form-urlencoded' in request.content_type:
        try:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

            url = data['url']
            with urlopen(url, context=ctx) as file:
                file.filename = url
                request_files = {url: file}

                uploaded_files = _upload_files(request_files, g.project)
                import_state = ImportState.create_from_filelist(filelist=uploaded_files, project=g.project)

        except ValidationError:
            raise
        except Exception as e:
            raise ValidationError(str(e))

    # API import
    elif 'application/json' in request.content_type:
        import_state = ImportState.create_from_data(data, project=g.project)

    # incorrect data source
    else:
        raise ValidationError('load_tasks: No data found in values or in files')
    return import_state


@blueprint.route('/api/project/import', methods=['POST'])
@requires_auth
@exception_handler
def api_import():
    """ The main API for task import, supports
        * json task data
        * files (as web form, files will be hosted by this flask server)
        * url links to images, audio, csv (if you use TimeSeries in labeling config)
    """

    start = time.time()
    try:
        import_state = _create_import_state(request, g)
    except ValidationError as e:
        # TODO: import specific exception handler
        return make_response(jsonify(e.msg_to_list()), 422)

    response = import_state.serialize()
    new_tasks = import_state.apply()
    duration = time.time() - start
    response['duration'] = duration
    response['new_task_ids'] = [t for t in new_tasks]
    return make_response(jsonify(response), status.HTTP_201_CREATED)


@blueprint.route('/api/project/import/prepare', methods=['POST'])
@requires_auth
@exception_handler
def api_import_prepare():
    """ Create ImportState object and returns it's ID
    """
    try:
        import_state = _create_import_state(request, g)
    except ValidationError as e:
        # TODO: import specific exception handler
        error_message = e.msg_to_list()
        logger.error(error_message)
        return make_response(jsonify(error_message), status.HTTP_400_BAD_REQUEST)
    response = {'id': import_state.id}
    logger.debug(response)
    return make_response(jsonify(response), status.HTTP_201_CREATED)


@blueprint.route('/api/project/import/<int:import_id>', methods=['GET', 'PATCH'])
@requires_auth
@exception_handler
def api_import_detail(import_id):
    import_state = ImportState.get_by_id(id=import_id)
    if request.method == 'PATCH':
        # Update ImportState fields
        import_state_params = dict(request.json)
        import_state.update(**import_state_params)
    response = import_state.serialize()
    logger.debug(response)
    return make_response(response, status.HTTP_200_OK)


@blueprint.route('/api/project/import/<int:import_id>/apply', methods=['POST'])
@requires_auth
@exception_handler
def api_import_apply(import_id):
    import_state = ImportState.get_by_id(id=import_id)
    new_tasks = import_state.apply()
    response = {'new_task_ids': [t for t in new_tasks]}
    return make_response(jsonify(response), status.HTTP_201_CREATED)

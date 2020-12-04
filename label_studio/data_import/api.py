import lxml
import time
import pandas as pd
import lxml.etree
try:
    import ujson as json
except ModuleNotFoundError:
    import json

from datetime import datetime
from flask import request, jsonify, make_response, Response as HttpResponse, g
from flask_api import status

from label_studio.utils import uploader
from label_studio.utils.validation import TaskValidator
from label_studio.utils.exceptions import ValidationError
from label_studio.utils.functions import (
    generate_sample_task, get_sample_task
)
from label_studio.tasks import Tasks
from label_studio.utils.auth import requires_auth
from label_studio.utils.misc import exception_handler
from label_studio.data_import.views import blueprint


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


@blueprint.route('/api/project/import', methods=['POST'])
@requires_auth
@exception_handler
def api_import():
    """ The main API for task import, supports
        * json task data
        * files (as web form, files will be hosted by this flask server)
        * url links to images, audio, csv (if you use TimeSeries in labeling config)
    """
    # make django compatibility for uploader module
    class DjangoRequest:
        def __init__(self): pass
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

    # get the last task id
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

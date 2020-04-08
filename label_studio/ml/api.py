import json
import logging

from flask import Flask, request, jsonify, send_file
from rq.exceptions import NoSuchJobError

from label_studio.ml.model import LabelStudioMLManager

logger = logging.getLogger(__name__)

_server = Flask(__name__)
_manager = LabelStudioMLManager()


def init_app(**kwargs):
    global _manager
    _manager.initialize(**kwargs)
    return _server


@_server.route('/predict', methods=['POST'])
def _predict():
    data = json.loads(request.data)
    tasks = data['tasks']
    project = data.get('project')
    label_config = data.get('label_config')
    force_reload = data.get('force_reload', False)
    try_fetch = data.get('try_fetch', True)
    params = data.get('params') or {}
    logger.debug(f'Request: predict {len(tasks)} tasks for project {project}')
    predictions, model = _manager.predict(tasks, project, label_config, force_reload, try_fetch, predict_kwargs=params)
    response = {
        'results': predictions,
        'model_version': model.model_version
    }
    return jsonify(response)


@_server.route('/setup', methods=['POST'])
def _setup():
    data = json.loads(request.data)
    project = data.get('project')
    schema = data.get('schema')
    force_reload = data.get('force_reload', False)
    model = _manager.fetch(project, schema, force_reload)
    return jsonify({'model_version': model.model_version})


@_server.route('/train', methods=['POST'])
def _train():
    data = json.loads(request.data)
    completions = data['completions']
    project = data.get('project')
    label_config = data.get('label_config')
    params = data.get('params', {})
    if len(completions) == 0:
        return jsonify({'status': 'error', 'message': 'No tasks found.'}), 400
    logger.debug(f'Request: train for project {project} with {len(completions)} tasks')
    job = _manager.train(completions, project, label_config, **params)
    response = {'job': job.id} if job else {}
    return jsonify(response), 201


@_server.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'UP'})


@_server.route('/metrics', methods=['GET'])
def metrics():
    return jsonify({})


@_server.errorhandler(NoSuchJobError)
def no_such_job_error_handler(error):
    logger.warning(f'Got error: {str(error)}')
    return str(error), 410


@_server.errorhandler(FileNotFoundError)
def file_not_found_error_handler(error):
    logger.warning(f'Got error: {str(error)}')
    return str(error), 404

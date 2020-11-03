import logging

from flask import Flask, request, jsonify, send_file
from rq.exceptions import NoSuchJobError

from label_studio.ml.model import LabelStudioMLManager
from label_studio.utils.misc import exception_handler

logger = logging.getLogger(__name__)

_server = Flask(__name__)
_manager = LabelStudioMLManager()


def init_app(model_class, **kwargs):
    global _manager
    _manager.initialize(model_class, **kwargs)
    return _server


@_server.route('/predict', methods=['POST'])
@exception_handler
def _predict():
    data = request.json
    tasks = data['tasks']
    project = data.get('project')
    label_config = data.get('label_config')
    force_reload = data.get('force_reload', False)
    try_fetch = data.get('try_fetch', True)
    params = data.get('params') or {}
    predictions, model = _manager.predict(tasks, project, label_config, force_reload, try_fetch, **params)
    response = {
        'results': predictions,
        'model_version': model.model_version
    }
    return jsonify(response)


@_server.route('/setup', methods=['POST'])
@exception_handler
def _setup():
    data = request.json
    project = data.get('project')
    schema = data.get('schema')
    force_reload = data.get('force_reload', False)
    model = _manager.fetch(project, schema, force_reload)
    logger.debug('Fetch model version: {}'.format(model.model_version))
    return jsonify({'model_version': model.model_version})


@_server.route('/train', methods=['POST'])
@exception_handler
def _train():
    data = request.json
    completions = data['completions']
    project = data.get('project')
    label_config = data.get('label_config')
    params = data.get('params', {})
    if len(completions) == 0:
        return jsonify('No completions found.'), 400
    job = _manager.train(completions, project, label_config, **params)
    response = {'job': job.id} if job else {}
    return jsonify(response), 201


@_server.route('/is_training', methods=['GET'])
@exception_handler
def _is_training():
    project = request.args.get('project')
    output = _manager.is_training(project)
    return jsonify(output)


@_server.route('/health', methods=['GET'])
@exception_handler
def health():
    return jsonify({'status': 'UP', 'model_dir': _manager.model_dir})


@_server.route('/metrics', methods=['GET'])
@exception_handler
def metrics():
    return jsonify({})


@_server.errorhandler(NoSuchJobError)
def no_such_job_error_handler(error):
    logger.warning('Got error: ' + str(error))
    return str(error), 410


@_server.errorhandler(FileNotFoundError)
def file_not_found_error_handler(error):
    logger.warning('Got error: ' + str(error))
    return str(error), 404


@_server.errorhandler(AssertionError)
def assertion_error(error):
    logger.error(str(error), exc_info=True)
    return str(error), 500


@_server.errorhandler(IndexError)
def index_error(error):
    logger.error(str(error), exc_info=True)
    return str(error), 500

""" Deprecated APIs, they will be removed soon
"""
from label_studio.blueprint import *


class DeprecatedException(Exception):
    pass


def deprecated_message(old, new):
    msg = '\n! API "' + old + '" is DEPRECATED and will be removed soon, please use "' + new + '" instead!\n'
    logger.warning(msg)
    print(msg)
    return msg


@blueprint.route('/upload/<path:path>')
@requires_auth
def deprecated_send_upload(path):
    logger.warning('Task path starting with "/upload/" is deprecated and will be removed in next releases, '
                   'replace "/upload/" => "/data/upload/" in your tasks.json files')
    project_dir = os.path.join(g.project.path, 'upload')
    return open(os.path.join(project_dir, path), 'rb').read()


@blueprint.route('/api/render-label-studio', methods=['GET', 'POST'])
@requires_auth
def deprecated_api_render_label_studio():
    deprecated_message('/api/render-label-studio', '/render-label-studio')
    return api_render_label_studio()


@blueprint.route('/api/save-config', methods=['POST'])
@requires_auth
def deprecated_api_save_config():
    deprecated_message('/api/save-config', '/api/project/config')
    return api_save_config()


@blueprint.route('/api/import', methods=['POST'])
@requires_auth
def deprecated_api_import():
    deprecated_message('/api/import', '/api/project/import')
    return api_import()


@blueprint.route('/api/export', methods=['GET'])
@requires_auth
def deprecated_api_export():
    deprecated_message('/api/export', '/api/project/export')
    return api_export()


@blueprint.route('/api/projects/1/next/', methods=['GET'])
@requires_auth
def deprecated_api_generate_next_task():
    deprecated_message('/api/project/1/next', '/api/project/next')
    return api_generate_next_task()


@blueprint.route('/api/tasks/delete', methods=['DELETE'])
@requires_auth
def deprecated_api_tasks_delete():
    deprecated_message('/api/tasks/delete', 'DELETE /api/tasks')
    g.project.delete_all_tasks()
    return make_response(jsonify({}), 204)


@blueprint.route('/api/projects/1/completions_ids/', methods=['GET'])
@requires_auth
def deprecated_api_all_completion_ids():
    deprecated_message('/api/projects/1/completions_ids/', '/api/completions')
    ids = g.project.get_completions_ids()
    return make_response(jsonify(ids), 200)


@blueprint.route('/api/project/completions/', methods=['DELETE'])
@requires_auth
def deprecated_api_all_completions():
    deprecated_message('/api/completions', 'DELETE /api/completions')
    return api_all_completions()


@blueprint.route('/api/tasks/<task_id>/cancel', methods=['POST'])
@requires_auth
def deprecated_api_tasks_cancel(task_id):
    msg = deprecated_message('/api/tasks/<task_id>/cancel', 'POST /api/tasks/<task_id>/completions/')
    raise DeprecatedException(msg)


@blueprint.route('/api/projects/1/expert_instruction')
@requires_auth
def deprecated_api_instruction():
    deprecated_message('/api/projects/1/expert_instruction', '/api/project')
    return make_response(g.project.config['instruction'], 200)


@blueprint.route('/api/remove-ml-backend', methods=['POST'])
@requires_auth
def deprecated_api_remove_ml_backend():
    deprecated_message('/api/remove-ml-backend', 'DELETE /api/models')
    ml_backend_name = request.json['name']
    g.project.remove_ml_backend(ml_backend_name)
    return make_response(jsonify('Deleted!'), 204)


@blueprint.route('/predict', methods=['POST'])
@requires_auth
def deprecated_api_predict():
    deprecated_message('/predict', '/api/models/predictions?mode=data')

    if 'data' not in request.json:
        task = {'data': request.json}
    else:
        task = request.json
    if g.project.ml_backends_connected:
        task_with_predictions = g.project.make_predictions(task)
        return make_response(jsonify(task_with_predictions), 200)
    else:
        return make_response(jsonify("No ML backend"), 400)


@blueprint.route('/api/train', methods=['POST'])
@requires_auth
def deprecated_api_train():
    deprecated_message('/api/train', '/api/models/train')
    return api_train()


@blueprint.route('/api/project/next', methods=['GET'])
@requires_auth
def api_generate_next_task():
    from label_studio.data_manager.actions import next_task
    deprecated_message('/api/project/next', '/api/project/actions?id=next_task')
    result = next_task(g.project, None, None)
    code = result.pop('response_code', 200)
    return make_response(result, code)

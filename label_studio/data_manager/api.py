from types import SimpleNamespace
from flask import make_response, request, jsonify, g
from label_studio.utils.auth import requires_auth
from label_studio.utils.misc import exception_handler
from label_studio.data_manager.functions import (
    prepare_tasks, prepare_annotations, make_actions, make_columns, load_tab, save_tab, delete_tab, load_all_tabs,
    preload_tasks, filter_tasks
)
from label_studio.blueprint import blueprint


@blueprint.route('/api/project/columns', methods=['GET'])
@requires_auth
@exception_handler
def api_project_columns():
    """ Project columns for data manager tabs
    """
    result = make_columns(g.project)
    return make_response(jsonify(result), 200)


@blueprint.route('/api/project/actions', methods=['GET'])
@requires_auth
@exception_handler
def api_project_actions():
    """ Project actions for data manager tabs
    """
    result = make_actions(g.project)
    return make_response(jsonify(result), 200)


@blueprint.route('/api/project/tabs', methods=['GET'])
@requires_auth
@exception_handler
def api_project_tabs():
    """ Project tabs for data manager
    """
    if request.method == 'GET':
        data = load_all_tabs(g.project)
        return make_response(jsonify(data), 200)


@blueprint.route('/api/project/tabs/<tab_id>', methods=['GET', 'POST', 'DELETE'])
@requires_auth
@exception_handler
def api_project_tabs_id(tab_id):
    """ Specified tab for data manager
    """
    tab_id = int(tab_id)
    tab_data = load_tab(tab_id, raise_if_not_exists=request.method == 'GET', project=g.project)

    # get tab data
    if request.method == 'GET':
        return make_response(jsonify(tab_data), 200)

    # set tab data
    if request.method == 'POST':
        tab_data.update(request.json)
        save_tab(tab_id, tab_data, g.project)
        return make_response(jsonify(tab_data), 201)

    # delete tab data
    if request.method == 'DELETE':
        delete_tab(tab_id, project)
        return make_response(jsonify(tab_data), 204)


@blueprint.route('/api/project/tabs/<tab_id>/selected-items', methods=['GET', 'POST', 'PATCH', 'DELETE'])
@requires_auth
@exception_handler
def api_project_tabs_selected_items(tab_id):
    """ Selected items (checkboxes for tasks/annotations)
    """
    tab_id = int(tab_id)
    tab = load_tab(tab_id, raise_if_not_exists=request.method == 'GET', project=g.project)

    # get tab data
    if request.method == 'GET':
        return make_response(jsonify(tab.get('selectedItems', [])), 200)

    # check json body for list or str "all"
    assert isinstance(request.json, list) or (isinstance(request.json, str) and request.json == 'all'), \
        'json body must be list with selected task ids OR string equal to "all"'
    items = request.json

    # set whole
    if request.method == 'POST':
        # get all tasks from tab filters
        if items == 'all':
            # load all tasks from db with some aggregations over completions and filter them
            tasks = preload_tasks(project, resolve_uri=need_uri_resolving)
            tasks = filter_tasks(tasks, params=SimpleNamespace(tab=tab))
            items = [t['id'] for t in tasks]

        tab['selectedItems'] = sorted(items)  # we need to use sorting because of frontend limitations
        save_tab(tab_id, tab, g.project)
        return make_response(jsonify(tab), 201)

    # init selectedItems
    if 'selectedItems' not in tab:
        tab['selectedItems'] = []

    # set particular
    if request.method == 'PATCH':
        # [ {[1,2,3]} U {[2,3,4]} ]
        tab['selectedItems'] = sorted(list(set(tab['selectedItems']).union(set(items))))
        save_tab(tab_id, tab, g.project)
        return make_response(jsonify(tab), 201)

    # delete specified items
    if request.method == 'DELETE':
        # remove all items
        if items == 'all':
            tab['selectedItems'] = []

        # exclude specified items
        else:
            tab['selectedItems'] = sorted(list(set(tab['selectedItems']) - set(items)))

        save_tab(tab_id, tab, g.project)
        return make_response(jsonify(tab), 204)


@blueprint.route('/api/project/tabs/<tab_id>/tasks', methods=['GET'])
@requires_auth
@exception_handler
def api_project_tab_tasks(tab_id):
    """ Get tasks for specified tab
    """
    tab_id = int(tab_id)
    tab = load_tab(tab_id, True, g.project)

    # get pagination
    page, page_size = int(request.values.get('page', 1)), int(request.values.get('page_size', 10))
    if page < 1 or page_size < 1:
        return make_response(jsonify({'detail': 'Incorrect page or page_size'}), 422)

    params = SimpleNamespace(page=page, page_size=page_size, tab=tab)
    tasks = prepare_tasks(g.project, params)
    return make_response(jsonify(tasks), 200)


@blueprint.route('/api/project/tabs/<tab_id>/annotations', methods=['GET'])
@requires_auth
@exception_handler
def api_project_tab_annotations(tab_id):
    """ Get annotations for specified tab
    """
    tab_id = int(tab_id)
    tab = load_tab(tab_id, True, g.project)

    page, page_size = int(request.values.get('page', 1)), int(request.values.get('page_size', 10))
    if page < 1 or page_size < 1:
        return make_response(jsonify({'detail': 'Incorrect page or page_size'}), 422)

    # get tasks first
    task_params = SimpleNamespace(page=0, page_size=0, tab=tab)  # take all tasks from tab
    tasks = prepare_tasks(g.project, task_params)

    # pass tasks to get annotation over them
    annotation_params = SimpleNamespace(page=page, page_size=page_size, tab=tab)
    annotations = prepare_annotations(tasks['tasks'], annotation_params)
    return make_response(jsonify(annotations), 200)

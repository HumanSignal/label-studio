from types import SimpleNamespace
from flask import make_response, request, jsonify, g
from ordered_set import OrderedSet

from label_studio.utils.auth import requires_auth
from label_studio.utils.misc import exception_handler

from label_studio.data_manager.actions import get_all_actions, perform_action
from label_studio.data_manager import blueprint
from label_studio.data_manager.functions import DataManagerException
from label_studio.data_manager.functions import (
    prepare_tasks, prepare_annotations, get_all_columns, load_tab, save_tab, delete_tab, load_all_tabs,
    get_selected_items, remove_tabs
)


@blueprint.route('/api/project/columns', methods=['GET'])
@requires_auth
@exception_handler
def api_project_columns():
    """ Project columns for data manager tabs
    """
    result = get_all_columns(g.project)
    return make_response(jsonify(result), 200)


@blueprint.route('/api/project/actions', methods=['GET', 'POST'])
@requires_auth
@exception_handler
def api_project_actions():
    """ Project actions for data manager tabs
    """
    # POST or GET with action id: perform action
    if request.method == 'POST' or (request.method == 'GET' and request.values.get('id', None)):
        return api_project_tab_action(None)

    # GET: return all action descriptions
    elif request.method == 'GET':
        result = get_all_actions(g.project)
        return make_response(jsonify(result), 200)


@blueprint.route('/api/project/tabs', methods=['GET', 'DELETE'])
@requires_auth
@exception_handler
def api_project_tabs():
    """ Project tabs for data manager
    """
    if request.method == 'GET':
        data = load_all_tabs(g.project)
        return make_response(jsonify(data), 200)

    if request.method == 'DELETE':
        remove_tabs(g.project)
        data = load_all_tabs(g.project)
        return make_response(jsonify(data), 204)


@blueprint.route('/api/project/tabs/<tab_id>', methods=['GET', 'POST', 'DELETE'])
@requires_auth
@exception_handler
def api_project_tabs_id(tab_id):
    """ Specified tab for data manager
    """
    tab_id = int(tab_id)
    tab_data = load_tab(tab_id, g.project, raise_if_not_exists=request.method == 'GET')

    # get tab data
    if request.method == 'GET':
        return make_response(jsonify(tab_data), 200)

    # set tab data
    if request.method == 'POST':
        new_data = request.json

        # reset selected items if filters are changed
        if tab_data.get('filters', {}) != request.json.get('filters', {}):
            new_data['selectedItems'] = {'all': False, 'included': []}

        tab_data.update(new_data)
        save_tab(tab_id, tab_data, g.project)
        return make_response(jsonify(tab_data), 200)

    # delete tab data
    if request.method == 'DELETE':
        delete_tab(tab_id, g.project)
        return make_response(jsonify(tab_data), 204)


@blueprint.route('/api/project/tabs/<tab_id>/selected-items', methods=['GET', 'POST', 'PATCH', 'DELETE'])
@requires_auth
@exception_handler
def api_project_tabs_selected_items(tab_id):
    """ Selected items (checkboxes for tasks/annotations)
    """
    tab_id = int(tab_id)
    tab = load_tab(tab_id, g.project, raise_if_not_exists=request.method == 'GET')

    # GET: get selected items from tab
    if request.method == 'GET':
        return make_response(jsonify(tab.get('selectedItems', None)), 200)

    # check json body for list or str "all"
    data = request.json
    assert isinstance(data, dict) and 'all' in data and (
        (data['all'] and 'excluded' in data) or
        (not data['all'] and 'included' in data)), \
        'JSON body must be dict: ' \
        '{"all": true, "excluded": [..task_ids..]} or ' \
        '{"all": false, "included": [..task_ids..]}'

    # POST: set whole
    if request.method == 'POST':
        tab['selectedItems'] = data
        save_tab(tab_id, tab, g.project)
        return make_response(jsonify(tab), 201)

    # init selectedItems, we need to read it in PATCH and DELETE
    if 'selectedItems' not in tab:
        tab['selectedItems'] = {'all': False, 'included': []}

    tab_data = tab['selectedItems']
    assert tab_data['all'] == data['all'], 'Unsupported operands: tab_data["all"] != data["all"]'
    key = 'excluded' if data['all'] else 'included'
    left = OrderedSet(tab_data[key])
    right = OrderedSet(data.get(key, []))

    # PATCH: set particular with union
    if request.method == 'PATCH':
        # make union
        result = left | right
        tab['selectedItems'][key] = list(result)
        save_tab(tab_id, tab, g.project)
        return make_response(jsonify(tab), 201)

    # DELETE: delete specified items
    if request.method == 'DELETE':
        result = (left - right)
        tab['selectedItems'][key] = list(result)
        save_tab(tab_id, tab, g.project)
        return make_response(jsonify(tab), 204)


@blueprint.route('/api/project/tabs/<tab_id>/tasks', methods=['GET'])
@requires_auth
@exception_handler
def api_project_tab_tasks(tab_id):
    """ Get tasks for specified tab
    """
    tab_id = int(tab_id)
    tab = load_tab(tab_id, g.project, raise_if_not_exists=True)

    # get pagination
    page, page_size = int(request.values.get('page', 1)), int(request.values.get('page_size', 10))
    if page < 1 or page_size < 1:
        return make_response(jsonify({'detail': 'Incorrect page or page_size'}), 422)

    params = SimpleNamespace(page=page, page_size=page_size, tab=tab, resolve_uri=True)
    tasks = prepare_tasks(g.project, params)
    return make_response(jsonify(tasks), 200)


@blueprint.route('/api/project/tabs/<tab_id>/annotations', methods=['GET'])
@requires_auth
@exception_handler
def api_project_tab_annotations(tab_id):
    """ Get annotations for specified tab
    """
    tab_id = int(tab_id)
    tab = load_tab(tab_id, g.project, raise_if_not_exists=True)

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


@blueprint.route('/api/project/tabs/<tab_id>/actions', methods=['POST'])
@requires_auth
@exception_handler
def api_project_tab_action(tab_id):
    """ Perform actions with selected items from tab,
        also it could be used by POST /api/project/actions
    """
    # use filters and selected items from tab
    if tab_id is not None:
        tab_id = int(tab_id)
        tab = load_tab(tab_id, g.project, raise_if_not_exists=True)
        selected = tab.get('selectedItems', None)
    else:
        tab = {}
        selected = None

    # use filters and selected items from request if it's specified
    if request.json is not None:
        selected = request.json.get('selectedItems', selected)
        if not selected or not isinstance(selected, dict):
            raise DataManagerException('selectedItems must be dict: {"all": [true|false], '
                                       '"excluded | included": [...task_ids...]}')

    filters = request.values.get('filters') or tab.get('filters', None)
    ordering = request.values.get('ordering') or tab.get('ordering', None)
    items = get_selected_items(g.project, selected, filters, ordering)

    # make advanced params for actions
    params = SimpleNamespace(tab=tab, values=request.values)

    # no selected items on tab
    if not items:
        response = {'detail': 'no selected items on tab with id ' + str(tab_id)}
        return make_response(jsonify(response), 404)

    # wrong action id
    action_id = request.values.get('id', None)
    if action_id is None:
        response = {'detail': 'No action id "' + str(action_id) + '", use ?id=<action-id>'}
        return make_response(jsonify(response), 422)

    # perform action and return the result dict
    result = perform_action(action_id, g.project, params, items)
    code = result.pop('response_code', 200)
    return make_response(jsonify(result), code)

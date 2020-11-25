import flask
from flask import Blueprint, current_app, g

from label_studio.utils.auth import requires_auth
from label_studio.utils.misc import exception_handler_page
from label_studio.utils.io import find_editor_files
import label_studio.data_manager.api  # we need to import this to register api endpoints
# from label_studio.blueprint import blueprint

blueprint = Blueprint('data_manager_blueprint', __name__, template_folder='templates')


@blueprint.route('/tasks', methods=['GET', 'POST'])
@requires_auth
@exception_handler_page
def tasks_page():
    """ Tasks and completions page
    """
    serialized_project = g.project.serialize()
    serialized_project['multi_session_mode'] = current_app.label_studio.input_args.command != 'start-multi-session'
    return flask.render_template(
        'tasks.html',
        config=g.project.config,
        project=g.project,
        serialized_project=serialized_project
    )


@blueprint.route('/tasks_old', methods=['GET', 'POST'])
@requires_auth
@exception_handler_page
def tasks_old_page():
    """ Tasks and completions page
    """
    serialized_project = g.project.serialize()
    serialized_project['multi_session_mode'] = current_app.label_studio.input_args.command != 'start-multi-session'
    return flask.render_template(
        'tasks_old.html',
        config=g.project.config,
        project=g.project,
        serialized_project=serialized_project,
        **find_editor_files()
    )

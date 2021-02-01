import flask
from flask import current_app, g

from label_studio.utils.auth import requires_auth
from label_studio.utils.misc import exception_handler_page
from label_studio.utils.io import find_editor_files
from label_studio.data_manager import blueprint
import label_studio.data_manager.api  # !: we need to import it here to register api endpoints


@blueprint.route('/tasks', methods=['GET', 'POST'])
@requires_auth
@exception_handler_page
def tasks_page():
    """ Tasks and completions page
    """
    return flask.render_template(
        'tasks.html',
        config=g.project.config,
        project=g.project,
        version=label_studio.__version__,
        **find_editor_files()
    )


@blueprint.route('/tasks-old', methods=['GET', 'POST'])
@requires_auth
@exception_handler_page
def tasks_old_page():
    """ Tasks and completions page
    """
    serialized_project = g.project.serialize()
    serialized_project['multi_session_mode'] = current_app.label_studio.input_args.command == 'start-multi-session'
    return flask.render_template(
        'tasks_old.html',
        config=g.project.config,
        project=g.project,
        serialized_project=serialized_project,
        version=label_studio.__version__,
        **find_editor_files()
    )

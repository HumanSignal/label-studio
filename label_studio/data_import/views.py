import flask
from flask import current_app, g

from label_studio.utils.auth import requires_auth
from label_studio.utils.misc import exception_handler_page
from label_studio.data_import import blueprint
import label_studio.data_import.api  # !: we need to import it here to register endpoints


@blueprint.route('/import-old')
@requires_auth
@exception_handler_page
def import_old_page():
    """ Import tasks from JSON, CSV, ZIP and more
    """
    return flask.render_template(
        'import_old.html',
        project=g.project,
        config=g.project.config
    )


@blueprint.route('/import')
@requires_auth
@exception_handler_page
def import_page():
    """ Import tasks from JSON, CSV, ZIP and more
    """
    serialized_project = g.project.serialize()
    serialized_project['multi_session_mode'] = current_app.label_studio.input_args.command == 'start-multi-session'
    return flask.render_template(
        'import_new.html',
        project=g.project,
        config=g.project.config,
        serialized_project=serialized_project
    )

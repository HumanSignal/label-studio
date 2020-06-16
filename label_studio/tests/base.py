# python
import os
from types import SimpleNamespace

# 3rd party
import pytest

# label_studio
from label_studio.server import app
from label_studio.project import Project


@pytest.fixture(scope='module')
def test_client():
    #flask_app = create_app('flask_test.cfg')

    app.config['TESTING'] = True
    app.config['DEBUG'] = False

    # Flask provides a way to test your application by exposing the Werkzeug test Client
    # and handling the context locals for you.
    testing_client = app.test_client()

    # Establish an application context before running the tests.
    ctx = app.app_context()
    ctx.push()
    assert app.debug == False

    # this is where the testing happens!
    yield testing_client

    ctx.pop()


@pytest.fixture(scope='module')
def new_project():
    project_name = 'my_project'
    user = 'admin'
    input_args_dict = {
        'root_dir':os.path.join(os.path.dirname(__file__), '../../')
    }
    input_args = SimpleNamespace(**input_args_dict)
    project = Project.get_or_create(project_name, input_args, context={
            'multi_session': False
    })
    return project

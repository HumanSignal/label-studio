# python
import os
import pytest
from types import SimpleNamespace

# 3rd party
from _pytest import monkeypatch
from flask import template_rendered

# label_studio
from label_studio.blueprint import create_app, LabelStudioConfig
from label_studio.project import Project


@pytest.fixture(scope="module")
def label_studio_app():
    input_args = SimpleNamespace(command='start', project_name='my_project',
                                 root_dir=os.path.join(os.path.dirname(__file__), '../../'))
    app = create_app(LabelStudioConfig(input_args=input_args))
    app.config['TESTING'] = True
    app.config['DEBUG'] = False

    # Establish an application context before running the tests.
    ctx = app.app_context()
    ctx.push()
    assert app.debug == False
    yield app
    ctx.pop()


@pytest.fixture(scope="module")
def test_client(label_studio_app):
    # Flask provides a way to test your application by exposing test Client
    # and handling the context locals for you.
    return label_studio_app.test_client()  # this is where the testing happens!


@pytest.fixture
def captured_templates(label_studio_app):
    """receive templates name and context during flask render"""
    app = label_studio_app
    recorded = []

    def record(sender, template, context, **extra):
        recorded.append((template, context))

    template_rendered.connect(record, app)
    try:
        yield recorded
    finally:
        template_rendered.disconnect(record, app)


def goc_project():
    """monkeypatch for get_or_create_project"""
    project_name = 'my_project'
    user = 'admin'
    input_args_dict = {
        'root_dir': os.path.join(os.path.dirname(__file__), '../../')
    }
    input_args = SimpleNamespace(**input_args_dict)
    project = Project.get_or_create(project_name, input_args, context={
            'multi_session': False
    })
    return project

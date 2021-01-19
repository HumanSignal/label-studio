import pytest
import os

from flask import template_rendered
from types import SimpleNamespace

from label_studio.server import create_app
from label_studio.blueprint import LabelStudioConfig

from .base import goc_project


@pytest.fixture
def app(tmpdir):
    # teardown project
    from label_studio.project import Project
    Project._storage = {}
    from label_studio.data_import.models import ImportState
    ImportState._db = {}

    root_dir = str(tmpdir.mkdir('label-studio-app'))
    input_args = SimpleNamespace(command='start', project_name='my_project', root_dir=root_dir, init=True)
    app = create_app(LabelStudioConfig(input_args=input_args))
    app.args = input_args
    ctx = app.app_context()
    ctx.push()
    yield app
    ctx.pop()


@pytest.fixture
def client(app):
    c = app.test_client()
    c.app = app
    return c


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
    project = goc_project()  # FIXME: move project reset to the proper place
    project.delete_all_tasks()
    project.delete_all_completions()

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

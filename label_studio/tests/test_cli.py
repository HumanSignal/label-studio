"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import pytest

from server import _create_user
from core.argparser import parse_input_args
from tests.utils import make_project, make_task, make_annotation


@pytest.mark.django_db
def test_create_user():  # type: ignore[no-untyped-def]
    input_args = parse_input_args(['init', 'test', '--username', 'default@localhost', '--password', '12345678'])  # type: ignore[no-untyped-call]
    config = {}  # type: ignore[var-annotated]
    user = _create_user(input_args, config)  # type: ignore[no-untyped-call]
    assert user.active_organization is not None


@pytest.mark.django_db
def test_user_active_organization_counters():  # type: ignore[no-untyped-def]
    input_args = parse_input_args(['init', 'test', '--username', 'default@localhost', '--password', '12345678'])  # type: ignore[no-untyped-call]
    user = _create_user(input_args, {})  # type: ignore[no-untyped-call]

    project_config = dict(
            title='Test',
            is_published=True,
            label_config='''
                <View>
                  <Text name="location" value="$location"></Text>
                  <Choices name="text_class" choice="single">
                    <Choice value="class_A"></Choice>
                    <Choice value="class_B"></Choice>
                  </Choices>
                </View>'''
        )

    def make_test_project():  # type: ignore[no-untyped-def]
        project = make_project(project_config, user, False, org=user.active_organization)  # type: ignore[no-untyped-call]
        task1 = make_task({'data': {'location': 'London', 'text': 'text A'}}, project)  # type: ignore[no-untyped-call]
        task2 = make_task({'data': {'location': 'London', 'text': 'text A'}}, project)  # type: ignore[no-untyped-call]
        make_annotation({'result': [{'result': [{'r': 1}], 'ground_truth': True}], 'completed_by': user}, task1.id)  # type: ignore[no-untyped-call]
        make_annotation({'result': [{'result': [{'r': 1}], 'ground_truth': True}], 'completed_by': user}, task1.id)  # type: ignore[no-untyped-call]
        make_annotation({'result': [{'result': [{'r': 1}], 'ground_truth': True}], 'completed_by': user}, task2.id)  # type: ignore[no-untyped-call]

    make_test_project()  # type: ignore[no-untyped-call]
    make_test_project()  # type: ignore[no-untyped-call]
    make_test_project()  # type: ignore[no-untyped-call]

    assert user.active_organization_annotations().count() == 9
    assert user.active_organization_contributed_project_number() == 3



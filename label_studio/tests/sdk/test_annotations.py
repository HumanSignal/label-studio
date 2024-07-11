import json

import pytest

from label_studio.tests.sdk.common import LABEL_CONFIG_AND_TASKS

pytestmark = pytest.mark.django_db
from label_studio_sdk.client import LabelStudio
from label_studio_sdk.data_manager import Column, Filters, Operator, Type
from label_studio_sdk.label_interface import LabelInterface
from label_studio_sdk.label_interface.create import choices
from label_studio_sdk.label_interface.objects import AnnotationValue, PredictionValue, TaskValue
from label_studio_sdk.label_interface.object_tags import TextTag
from label_studio_sdk.label_interface.control_tags import ChoicesTag, ChoicesValue


def test_annotations_CRUD(django_live_url, business_client):
    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
    li = LabelInterface(LABEL_CONFIG_AND_TASKS['label_config'])
    p = ls.projects.create(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    task_data = TaskValue(data={'my_text': 'Test task'})
    ls.projects.import_tasks(id=p.id, request=[task_data.model_dump()])

    for task in ls.tasks.list(project=p.id):
        assert task.data == task_data.data

    task_id = task.id
    tag_name = 'sentiment_class'
    annotation_data = AnnotationValue(
        result=[li.get_control(tag_name).label(['Positive'])],
        completed_by=business_client.user.id
    ).model_dump()
    new_annotation = ls.annotations.create(task_id, result=annotation_data['result'])
    assert (annotation_id := new_annotation.id)
    assert new_annotation.result == annotation_data['result']

    ls.annotations.update(
        id=annotation_id,
        result=[li.get_control(tag_name).label(['Negative'])],
    )
    for task_with_annotation in ls.tasks.list(project=p.id):
        updated_annotation = task_with_annotation.annotations[0]
    assert updated_annotation['result'][0]['value'] == {'choices': ['Negative']}

    # create another annotation
    another_annotation = ls.annotations.create(
        id=task_id,
        result=[li.get_control(tag_name).label(['Neutral'])],
    )

    # check that there are two annotations
    annotations = ls.annotations.list(task_id)
    assert len(annotations) == 2

    # delete one annotation
    ls.annotations.delete(id=annotation_id)
    annotations = ls.annotations.list(task_id)
    assert len(annotations) == 1
    assert annotations[0].id == another_annotation.id
    assert annotations[0].result[0]['value']['choices'] == ['Neutral']


def test_annotation_marks_task_as_labeled(django_live_url, business_client):
    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)

    label_config = LabelInterface.create({
        'choices': ChoicesTag(
            name='sentiment_class',
            to_name=['message'],
            choices=ChoicesValue(choices=['Positive', 'Negative']),
            attr={},
            tag="Control"
        ),
        'message': TextTag(name='message', value='my_text', tag='Text'),
    })

    p = ls.projects.create(
        title='New Project',
        label_config=label_config,
    )

    task_data = [
        TaskValue(data={'my_text': 'Test task'}),
        TaskValue(data={'my_text': 'Test task 2'}),
    ]
    ls.projects.import_tasks(id=p.id, request=[task.model_dump() for task in task_data])

    filters = Filters.create(
        Filters.OR,
        [
            Filters.item(Column.completed_at, Operator.EMPTY, Type.Datetime, Filters.value(False)),
        ],
    )
    query = json.dumps({'filters': filters})

    labeled_tasks = []
    for task in ls.tasks.list(project=p.id, query=query, fields='all'):
        labeled_tasks.append(task)
    assert labeled_tasks == []

    tasks = []
    for task in ls.tasks.list(project=p.id):
        tasks.append(task)

    assert len(tasks) == 2

    task_id = tasks[0].id
    annotation_data = AnnotationValue(
        result=[label_config.get_control('sentiment_class').label(['Positive'])],
        completed_by=business_client.user.id
    ).model_dump()

    ls.annotations.create(id=task_id, result=annotation_data['result'])

    labeled_tasks = []
    for task in ls.tasks.list(project=p.id, query=query):
        labeled_tasks.append(task)

    assert len(labeled_tasks) == 1
    assert labeled_tasks[0].data == task_data[0]['data']

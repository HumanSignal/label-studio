import json

import pytest

from label_studio.tests.sdk.common import LABEL_CONFIG_AND_TASKS

pytestmark = pytest.mark.django_db
from label_studio_sdk.client import LabelStudio
from label_studio_sdk.data_manager import Column, Filters, Operator, Type
from label_studio_sdk.label_interface import LabelInterface
from label_studio_sdk.label_interface.create import labels
from label_studio_sdk.label_interface.objects import AnnotationValue, TaskValue


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
        result=[li.get_control(tag_name).label(['Positive'])], completed_by=business_client.user.id
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

    label_config = LabelInterface.create(
        {
            'image1': 'Image',
            'bbox': labels(['Car', 'Truck', 'Van'], tag_type='RectangleLabels'),
        }
    )

    p = ls.projects.create(
        title='New Project',
        label_config=label_config,
    )

    task_data = [
        TaskValue(data={'image1': 'https://example.com/image.jpg'}),
        TaskValue(data={'image1': 'https://example.com/image2.jpg'}),
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
    project = ls.projects.get(p.id)
    li = project.get_label_interface()
    annotation_data = AnnotationValue(
        result=[li.get_control('bbox').label(['Car'], x=10, y=20, width=100, height=100)],
        completed_by=business_client.user.id,
    ).model_dump()

    annotation = ls.annotations.create(id=task_id, result=annotation_data['result'])

    labeled_tasks = []
    for task in ls.tasks.list(project=p.id, query=query):
        labeled_tasks.append(task)

    assert len(labeled_tasks) == 1
    assert labeled_tasks[0].data == task_data[0].data
    assert labeled_tasks[0].annotations[0]['id'] == annotation.id
    assert labeled_tasks[0].annotations[0]['result'][0]['from_name'] == 'bbox'
    assert labeled_tasks[0].annotations[0]['result'][0]['to_name'] == 'image1'
    assert labeled_tasks[0].annotations[0]['result'][0]['type'] == 'rectanglelabels'
    assert labeled_tasks[0].annotations[0]['result'][0]['value'] == {
        'rectanglelabels': ['Car'],
        'x': 10,
        'y': 20,
        'width': 100,
        'height': 100,
        'rotation': 0,
    }

"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import glob
import io
import json
import logging
import os

import pytest
import yaml
from core.label_config import parse_config, parse_config_to_json, validate_label_config
from projects.models import Project

from label_studio.tests.utils import make_annotation, make_prediction, make_task, project_id  # noqa

logger = logging.getLogger(__name__)


@pytest.mark.parametrize(
    'tasks_count, annotations_count, predictions_count',
    [
        [2, 2, 2],
    ],
)
@pytest.mark.django_db
def test_change_label_config_repeater(tasks_count, annotations_count, predictions_count, business_client, project_id):
    # Change label config to Repeater
    payload = {
        'label_config': '<View> <Repeater on="$images" indexFlag="{{idx}}"> <Image name="page_{{idx}}" value="$images" maxWidth="100%"/>     <Header value="Utterance Review"/>     <RectangleLabels name="labels_{{idx}}" toName="page_{{idx}}">       <Label value="Header" hotkey="1"/> <Label value="Body" hotkey="2"/> <Label value="Footer" hotkey="3"/> </RectangleLabels> </Repeater> </View>'
    }
    response = business_client.patch(
        f'/api/projects/{project_id}',
        data=json.dumps(payload),
        content_type='application/json',
    )
    assert response.status_code == 200
    # cr
    project = Project.objects.get(pk=project_id)
    for _ in range(0, tasks_count):
        task_id = make_task(
            {
                'data': {
                    'images': [
                        {'url': 'https://htx-pub.s3.amazonaws.com/demo/images/demo_stock_purchase_agreement/0001.jpg'},
                        {'url': 'https://htx-pub.s3.amazonaws.com/demo/images/demo_stock_purchase_agreement/0002.jpg'},
                        {'url': 'https://htx-pub.s3.amazonaws.com/demo/images/demo_stock_purchase_agreement/0003.jpg'},
                    ]
                }
            },
            project,
        ).id
        print('TASK_ID: %s' % task_id)
        for _ in range(0, annotations_count):
            print('COMPLETION')
            make_annotation(
                {
                    'result': [
                        {
                            'id': '_565WKjviN',
                            'type': 'rectanglelabels',
                            'value': {
                                'x': 21.451104100946377,
                                'y': 7.682926829268292,
                                'width': 54.73186119873817,
                                'height': 4.146341463414634,
                                'rotation': 0,
                                'rectanglelabels': ['Header'],
                            },
                            'origin': 'manual',
                            'to_name': 'page_0',
                            'from_name': 'labels_0',
                            'image_rotation': 0,
                            'original_width': 800,
                            'original_height': 1035,
                        }
                    ]
                },
                task_id,
            )

        for _ in range(0, predictions_count):
            make_prediction({'result': []}, task_id)

    # no changes - no errors
    payload = {
        'label_config': '<View> <Repeater on="$images" indexFlag="{{idx}}"> <Image name="page_{{idx}}" value="$images" maxWidth="100%"/>     <Header value="Utterance Review"/>     <RectangleLabels name="labels_{{idx}}" toName="page_{{idx}}"> <Label value="Header" hotkey="1"/> <Label value="Body" hotkey="2"/> <Label value="Footer" hotkey="3"/> </RectangleLabels> </Repeater> </View>'
    }
    response = business_client.post(
        f'/api/projects/{project_id}/validate',
        data=json.dumps(payload),
        content_type='application/json',
    )
    assert response.status_code == 200

    # delete unused labels
    payload = {
        'label_config': '<View> <Repeater on="$images" indexFlag="{{idx}}"> <Image name="page_{{idx}}" value="$images" maxWidth="100%"/>     <Header value="Utterance Review"/>     <RectangleLabels name="labels_{{idx}}" toName="page_{{idx}}"> <Label value="Header" hotkey="1"/> <Label value="Body" hotkey="2"/> </RectangleLabels> </Repeater> </View>'
    }
    response = business_client.post(
        f'/api/projects/{project_id}/validate',
        data=json.dumps(payload),
        content_type='application/json',
    )
    assert response.status_code == 200

    # delete used labels - 400
    payload = {
        'label_config': '<View> <Repeater on="$images" indexFlag="{{idx}}"> <Image name="page_{{idx}}" value="$images" maxWidth="100%"/>     <Header value="Utterance Review"/>     <RectangleLabels name="labels_{{idx}}" toName="page_{{idx}}"> <Label value="Body" hotkey="2"/> <Label value="Footer" hotkey="3"/> </RectangleLabels> </Repeater> </View>'
    }
    response = business_client.post(
        f'/api/projects/{project_id}/validate',
        data=json.dumps(payload),
        content_type='application/json',
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_parse_all_configs():
    folder_wildcard = './label_studio/annotation_templates'
    result = [y for x in os.walk(folder_wildcard) for y in glob.glob(os.path.join(x[0], '*.xml'))]
    for file in result:
        print(f'Parsing config: {file}')
        with open(file, mode='r') as f:
            config = f.read()
            assert parse_config(config)
            assert parse_config_to_json(config)
            validate_label_config(config)


@pytest.mark.django_db
def test_config_validation_for_choices_workaround(business_client, project_id):
    """
    Validate Choices tag for 1 choice with workaround
    Example bug DEV-3635
    """
    payload = {
        'label_config': '<View><Text value="$text" name="artist" /><View><Choices name="choices_1" toName="artist">'
        '<Choice name="choice_1" value="1"/></Choices></View><View>'
        '<Choices name="choices_2" toName="artist"><Choice name="choice_2" value="2"/></Choices>'
        '</View></View>'
    }
    response = business_client.patch(
        f'/api/projects/{project_id}',
        data=json.dumps(payload),
        content_type='application/json',
    )
    assert response.status_code == 200

    payload = {
        'label_config': '<View><Text value="$text" name="artist" /><View><Choices name="choices_1" toName="artist">'
        '<Choice name="choice_1" value="1"/></Choices><Choices name="choices_2" toName="artist">'
        '<Choice name="choice_2" value="2"/></Choices></View></View>'
    }
    response = business_client.patch(
        f'/api/projects/{project_id}',
        data=json.dumps(payload),
        content_type='application/json',
    )
    assert response.status_code == 200


@pytest.mark.django_db
def test_config_validation_for_missing_to_name_in_number_tag_fails(business_client, project_id):
    """
    Validate Number tag with missing to_name fails (see LEAP-245)
    """
    payload = {
        'label_config': (
            '<View>'
            '<Text name="question" value="$question" granularity="word"/>'
            '<Number name="number" to="question" required="true" />'
            '</View>'
        )
    }
    response = business_client.patch(
        f'/api/projects/{project_id}',
        data=json.dumps(payload),
        content_type='application/json',
    )
    assert response.status_code == 400
    response_data = response.json()
    assert "'toName' is a required property" in response_data['validation_errors']['label_config'][0]


@pytest.mark.django_db
def test_parse_wrong_xml(business_client, project_id):
    # Change label config to Repeater
    payload = {
        'label_config': '<View> <Repeater on="$images" indexFlag="{{idx}}"> <Image name="page_{{idx}}" value="$images" maxWidth="100%"/>     <Header value="Utterance Review"/>     <RectangleLabels name="labels_{{idx}}" toName="page_{{idx}}">       <Label value="Header" hotkey="1"/> <Label value="Body" hotkey="2"/> <Label value="Footer" hotkey="3"/> </RectangleLabels> </Repeater> </View>'
    }
    response = business_client.patch(
        f'/api/projects/{project_id}',
        data=json.dumps(payload),
        content_type='application/json',
    )
    assert response.status_code == 200
    # Change label config to wrong XML
    payload = {
        'label_config': '1<View> <Repeater on="$images" indexFlag="{{idx}}"> <Image name="page_{{idx}}" value="$images" maxWidth="100%"/>     <Header value="Utterance Review"/>     <RectangleLabels name="labels_{{idx}}" toName="page_{{idx}}"> <Label value="Body" hotkey="2"/> <Label value="Footer" hotkey="3"/> </RectangleLabels> </Repeater> </View>'
    }
    response = business_client.post(
        f'/api/projects/{project_id}/validate',
        data=json.dumps(payload),
        content_type='application/json',
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_label_config_versions(business_client, project_id):
    with io.open(os.path.join(os.path.dirname(__file__), 'test_data/data_for_test_label_config_matrix.yml')) as f:
        test_suites = yaml.safe_load(f)
    for test_name, test_content in test_suites.items():
        payload = {'label_config': test_content['label_config']}
        response = business_client.post(
            f'/api/projects/{project_id}/validate',
            data=json.dumps(payload),
            content_type='application/json',
        )
        logger.warning(f'Test: {test_name}')
        assert response.status_code == test_content['status_code']

"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import pytest
import json
import os
import glob

from core.label_config import parse_config, validate_label_config, parse_config_to_json
from label_studio.tests.utils import make_task, make_annotation, make_prediction, project_id
from projects.models import Project


@pytest.mark.parametrize(
    "tasks_count, annotations_count, predictions_count",
    [
        [2, 2, 2],
    ],
)
@pytest.mark.django_db
def test_change_label_config_repeater(tasks_count, annotations_count, predictions_count, business_client, project_id):
    # Change label config to Repeater
    payload = {'label_config': '<View> <Repeater on="$images" indexFlag="{{idx}}"> <Image name="page_{{idx}}" value="$images" maxWidth="100%"/>     <Header value="Utterance Review"/>     <RectangleLabels name="labels_{{idx}}" toName="page_{{idx}}">       <Label value="Header" hotkey="1"/> <Label value="Body" hotkey="2"/> <Label value="Footer" hotkey="3"/> </RectangleLabels> </Repeater> </View>'}
    response = business_client.patch(
        f"/api/projects/{project_id}",
        data=json.dumps(payload),
        content_type="application/json",
    )
    assert response.status_code == 200
    # cr
    project = Project.objects.get(pk=project_id)
    for _ in range(0, tasks_count):
        task_id = make_task({"data": {
            "images": [
                {
                    "url": "https://htx-pub.s3.amazonaws.com/demo/images/demo_stock_purchase_agreement/0001.jpg"
                },
                {
                    "url": "https://htx-pub.s3.amazonaws.com/demo/images/demo_stock_purchase_agreement/0002.jpg"
                },
                {
                    "url": "https://htx-pub.s3.amazonaws.com/demo/images/demo_stock_purchase_agreement/0003.jpg"
                }
            ]
        }}, project).id
        print('TASK_ID: %s' % task_id)
        for _ in range(0, annotations_count):
            print('COMPLETION')
            make_annotation({"result": [
                {
                    "id": "_565WKjviN",
                    "type": "rectanglelabels",
                    "value": {
                        "x": 21.451104100946377,
                        "y": 7.682926829268292,
                        "width": 54.73186119873817,
                        "height": 4.146341463414634,
                        "rotation": 0,
                        "rectanglelabels": [
                            "Header"
                        ]
                    },
                    "origin": "manual",
                    "to_name": "page_0",
                    "from_name": "labels_0",
                    "image_rotation": 0,
                    "original_width": 800,
                    "original_height": 1035
                }
            ]}, task_id)

        for _ in range(0, predictions_count):
            make_prediction({"result": []}, task_id)

    # no changes - no errors
    payload = {'label_config': '<View> <Repeater on="$images" indexFlag="{{idx}}"> <Image name="page_{{idx}}" value="$images" maxWidth="100%"/>     <Header value="Utterance Review"/>     <RectangleLabels name="labels_{{idx}}" toName="page_{{idx}}"> <Label value="Header" hotkey="1"/> <Label value="Body" hotkey="2"/> <Label value="Footer" hotkey="3"/> </RectangleLabels> </Repeater> </View>'}
    response = business_client.post(
        f"/api/projects/{project_id}/validate",
        data=json.dumps(payload),
        content_type="application/json",
    )
    assert response.status_code == 200

    # delete unused labels
    payload = {'label_config': '<View> <Repeater on="$images" indexFlag="{{idx}}"> <Image name="page_{{idx}}" value="$images" maxWidth="100%"/>     <Header value="Utterance Review"/>     <RectangleLabels name="labels_{{idx}}" toName="page_{{idx}}"> <Label value="Header" hotkey="1"/> <Label value="Body" hotkey="2"/> </RectangleLabels> </Repeater> </View>'}
    response = business_client.post(
        f"/api/projects/{project_id}/validate",
        data=json.dumps(payload),
        content_type="application/json",
    )
    assert response.status_code == 200

    # delete used labels - 400
    payload = {'label_config': '<View> <Repeater on="$images" indexFlag="{{idx}}"> <Image name="page_{{idx}}" value="$images" maxWidth="100%"/>     <Header value="Utterance Review"/>     <RectangleLabels name="labels_{{idx}}" toName="page_{{idx}}"> <Label value="Body" hotkey="2"/> <Label value="Footer" hotkey="3"/> </RectangleLabels> </Repeater> </View>'}
    response = business_client.post(
        f"/api/projects/{project_id}/validate",
        data=json.dumps(payload),
        content_type="application/json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_parse_all_configs():
    folder_wildcard = "./label_studio/annotation_templates"
    result = [y for x in os.walk(folder_wildcard) for y in glob.glob(os.path.join(x[0], '*.xml'))]
    for file in result:
        print(f"Parsing config: {file}")
        with open(file, mode='r') as f:
            config = f.read()
            assert parse_config(config)
            assert parse_config_to_json(config)
            validate_label_config(config)

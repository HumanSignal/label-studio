"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import pytest
import json

from projects.models import Project


_TEXT_CONFIG = '''<View>
          <Text name="text_name" value="$text_val"></Text>
          <Choices name="text_class" toName="text_name">
            <Choice value="class_A"></Choice>
            <Choice value="class_B"></Choice>
          </Choices>
        </View>'''

_TEXT_LABEL_CONFIG = '''<View>
          <Text name="text_name" value="$text_val"></Text>
          <Labels name="tag" toName="text_name">
            <Label value="class_A"></Label>
            <Label value="class_B"></Label>
          </Labels>
        </View>'''

_IMAGE_CONFIG = '''<View>
          <Image name="image_name" value="$image_url"></Image>
          <Choices name="image_class" toName="image_name">
            <Choice value="class_A"></Choice>
            <Choice value="class_B"></Choice>
          </Choices>
        </View>'''


@pytest.mark.integration_tests
@pytest.mark.django_db
@pytest.mark.parametrize('create_label_config_form_onboarding', (True, False))
@pytest.mark.parametrize('label_config, connection_model_names_and_schemas, total_expected_connections', [
    (
        _TEXT_CONFIG,
        dict(zip(
            ['textclassifier_ru', 'textclassifier_en', 'textclassifier_fr', 'textclassifier_de', 'textclassifier_es', 'text_classifier_generic'],  # noqa
            [{'output_names': ['text_class'], 'input_names': ['text_name'], 'input_values': ['text_val'], 'input_types': ['Text']}] * 6
        )),
        6
    ),
    (
        _IMAGE_CONFIG,
        {'imageclassifier': {'output_names': ['image_class'], 'input_names': ['image_name'], 'input_values': ['image_url'], 'input_types': ['Image']}},  # noqa
        1
    ),
    (
        '''<View>
          <Image name="image_name" value="$image_url"></Image>
          <Choices name="image_class" toName="image_name">
            <Choice value="class_A"></Choice>
            <Choice value="class_B"></Choice>
          </Choices>
          <Choices name="image_class_aux" toName="image_name">
            <Choice value="class_A"></Choice>
            <Choice value="class_B"></Choice>
          </Choices>
        </View>''',
        {'imageclassifier': [
            {'output_names': ['image_class'], 'input_names': ['image_name'], 'input_values': ['image_url'], 'input_types': ['Image']},
            {'output_names': ['image_class_aux'], 'input_names': ['image_name'], 'input_values': ['image_url'], 'input_types': ['Image']},
        ]},
        2
    ),
    (
        _TEXT_LABEL_CONFIG,
        {
            'text_tagger_generic': {
                'output_names': ['tag'],
                'input_names': ['text_name'],
                'input_values': ['text_val'],
                'input_types': ['Text']
            }
        },
        1
    )
])
def test_ml_backend_connections(
    business_client, label_config, connection_model_names_and_schemas, total_expected_connections,
    create_label_config_form_onboarding
):
    if create_label_config_form_onboarding:
        project = Project(title='test_ml_backend_connections', label_config=label_config)
        project.created_by = business_client.user
        project.save()
    else:
        project = Project.objects.create(
            title='test_ml_backend_connections', created_by=business_client.user)
        r = business_client.patch(
            f'/api/projects/{project.id}/',
            data=json.dumps({'label_config': label_config}),
            content_type='application/json',
        )
        assert r.status_code == 200
    conns = MLBackendConnection.objects.filter(project=project.id)
    assert conns.count() == total_expected_connections

    for conn in conns:
        assert conn.ml_backend.name in connection_model_names_and_schemas
        schemas = connection_model_names_and_schemas[conn.ml_backend.name]
        if isinstance(schemas, list):
            assert any(schema == conn.schema for schema in schemas)
        else:
            assert schemas == conn.schema


@pytest.mark.integration_tests
@pytest.mark.django_db
def test_change_config_after_connection(business_client):
    project = Project.objects.create(
        title='test_ml_backend_connections', created_by=business_client.user)
    # create label config
    assert business_client.patch(
        f'/api/projects/{project.id}/',
        data=json.dumps({'label_config': _TEXT_CONFIG}),
        content_type='application/json',
    ).status_code == 200

    # choose ML backend connection
    conn = MLBackendConnection.objects.filter(project=project.id).first()
    assert conn.ml_backend.name.startswith('text')
    assert business_client.patch(
        f'/api/projects/{project.id}/',
        data=json.dumps({'batch_size': 100, 'interval': 100, 'ml_backend_active_connection': conn.id}),
        content_type='application/json',
    ).status_code == 200

    # change label config
    assert business_client.patch(
        f'/api/projects/{project.id}/',
        data=json.dumps({'label_config': _IMAGE_CONFIG}),
        content_type='application/json',
    ).status_code == 200

    p = Project.objects.get(id=project.id)
    conn = MLBackendConnection.objects.filter(project=p.id).first()
    assert conn.ml_backend.name.startswith('image')

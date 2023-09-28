import json

import pytest

pytestmark = pytest.mark.django_db


def _get_columns(business_client, label_config=None):
    r = business_client.post(
        '/api/projects/',
        data=json.dumps(dict(title='test_project1', **({'label_config': label_config} if label_config else {}))),
        content_type='application/json',
    )

    project1_id = r.json()['id']
    r = business_client.get(f'/api/dm/columns/?project={project1_id}')

    assert r.status_code == 200, r.content
    r_json = r.json()
    assert 'columns' in r_json
    return r_json['columns']


def test_columns_api_returns_expected_ids(business_client):
    columns = _get_columns(business_client)

    assert [c['id'] for c in columns] == [
        'id',
        'inner_id',
        'completed_at',
        'total_annotations',
        'cancelled_annotations',
        'total_predictions',
        'annotators',
        'annotations_results',
        'annotations_ids',
        'predictions_score',
        'predictions_model_versions',
        'predictions_results',
        'file_upload',
        'storage_filename',
        'created_at',
        'updated_at',
        'updated_by',
        'avg_lead_time',
        'draft_exists',
        'data',
    ]


def test_columns_api_annotates_default_columns_with_project_defined_false(business_client):
    columns = _get_columns(business_client)

    for c in columns:
        assert 'project_defined' in c
        assert c['project_defined'] is False


def test_columns_api_annotates_config_defined_columns_with_project_defined_true(business_client):
    config_with_text_column = """
        <View>
            <Text value="$text" name="artist" />
            <View>
                <Choices name="choices_1" toName="artist">
                    <Choice name="choice_1" value="1"/>
                </Choices>
            </View>
        </View>
        """

    columns = _get_columns(business_client, config_with_text_column)

    for c in columns:
        assert 'project_defined' in c
        assert c['project_defined'] == (c['id'] == 'text')

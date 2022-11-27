import pytest


@pytest.mark.parametrize('data, expected', [
                         ({'data': {'meta_info': 'meta info B', 'text': 'text B'}, 'unique_id': 'uuid_2'}, 0),
                         ({'data': {'meta_info': 'meta info C', 'text': 'text C'}, 'unique_id': 'uuid_3'}, 1),
                         ({'data': {'meta_info': 'meta info D', 'text': 'text D'}, 'unique_id': ''}, 1),
                         ({'data': {'meta_info': 'meta info E', 'text': 'text E'}}, 1)
                         ],
                         ids=[
                             'Data with duplicate unique ID',
                             'Data with new unique ID',
                             'Data with empty unique ID',
                             'Data without unique ID field'
                         ])
@pytest.mark.django_db
def test_duplicate_unique_id(business_client, configured_project, data, expected):
    r = business_client.post(
        f'/api/projects/{configured_project.id}/import',
        data=data,
        content_type="application/json"
    )
    assert r.status_code == 201
    response = r.json()
    assert len(response['unique_ids']) == expected

"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import pytest
import json

from ..utils import project_id


@pytest.mark.django_db
def test_selected_items(business_client, project_id):
    # create view
    payload = dict(project=project_id, data={"test": 1})
    response = business_client.post(
        "/api/dm/views/",
        data=json.dumps(payload),
        content_type="application/json",
    )
    assert response.status_code == 201, response.content
    view_id = response.json()["id"]
    api_url = "/api/dm/views/{}/selected-items/".format(view_id)

    # post
    response = business_client.post(
        api_url, data=json.dumps({"all": False, "included": [1, 2, 3]}), content_type="application/json"
    )
    assert response.status_code == 201, response.content

    # get
    response = business_client.get(api_url)
    assert response.status_code == 200, response.content
    assert response.json() == {"all": False, "included": [1, 2, 3]}

    # patch
    response = business_client.patch(
        api_url, data=json.dumps({"all": False, "included": [4, 5]}), content_type="application/json"
    )
    assert response.status_code == 201, response.content
    response = business_client.get(api_url)
    assert response.status_code == 200, response.content
    assert response.json() == {"all": False, "included": [1, 2, 3, 4, 5]}

    # delete
    response = business_client.delete(
        api_url, data=json.dumps({"all": False, "included": [3]}), content_type="application/json"
    )
    assert response.status_code == 204, response.content
    response = business_client.get(api_url)
    assert response.status_code == 200, response.content
    assert response.json() == {"all": False, "included": [1, 2, 4, 5]}

    # select all
    response = business_client.post(
        api_url, data=json.dumps({"all": True, "excluded": []}), content_type="application/json"
    )
    assert response.status_code == 201, response.content
    response = business_client.get(api_url)
    assert response.status_code == 200, response.content
    assert response.json() == {"all": True, "excluded": []}

    # delete all
    response = business_client.delete(
        api_url, data=json.dumps({"all": True, "excluded": []}), content_type="application/json"
    )
    assert response.status_code == 204, response.content
    response = business_client.get(api_url)
    assert response.status_code == 200, response.content
    assert response.json() == {"all": True, "excluded": []}


@pytest.mark.django_db
def test_selected_items_excluded(business_client, project_id):
    # create view
    payload = dict(project=project_id, data={"test": 1})
    response = business_client.post(
        "/api/dm/views/",
        data=json.dumps(payload),
        content_type="application/json",
    )
    assert response.status_code == 201, response.content
    view_id = response.json()["id"]
    api_url = "/api/dm/views/{}/selected-items/".format(view_id)

    # post
    response = business_client.post(
        api_url, data=json.dumps({"all": True, "excluded": [1, 2, 3]}), content_type="application/json"
    )
    assert response.status_code == 201

    # get
    response = business_client.get(api_url)
    assert response.status_code == 200
    assert response.json() == {"all": True, "excluded": [1, 2, 3]}

    # patch
    response = business_client.patch(
        api_url, data=json.dumps({"all": True, "excluded": [1, 2]}), content_type="application/json"
    )
    assert response.status_code == 201
    response = business_client.get(api_url)
    assert response.status_code == 200
    assert response.json() == {"all": True, "excluded": [1, 2, 3]}

    # delete
    response = business_client.delete(
        api_url, data=json.dumps({"all": True, "excluded": [4, 5]}), content_type="application/json"
    )
    assert response.status_code == 204
    response = business_client.get(api_url)
    assert response.status_code == 200
    assert response.json() == {"all": True, "excluded": [1, 2, 3]}


@pytest.mark.django_db
def test_validation(business_client, project_id):
    # create view
    payload = dict(project=project_id, data={"test": 1})
    response = business_client.post(
        "/api/dm/views/",
        data=json.dumps(payload),
        content_type="application/json",
    )
    assert response.status_code == 201, response.content
    view_id = response.json()["id"]
    api_url = "/api/dm/views/{}/selected-items/".format(view_id)

    # excluded not allowed with all==false
    response = business_client.post(
        api_url,
        data=json.dumps({"all": False, "included": [1, 2, 3], "excluded": [4, 5, 6]}),
        content_type="application/json",
    )
    assert response.status_code == 400, response.content

    # included not allowed with all==true
    response = business_client.post(
        api_url,
        data=json.dumps({"all": True, "included": [1, 2, 3], "excluded": [4, 5, 6]}),
        content_type="application/json",
    )
    assert response.status_code == 400, response.content

    # fill with excluded
    response = business_client.post(
        api_url, data=json.dumps({"all": True, "excluded": [1, 2, 3]}), content_type="application/json"
    )
    assert response.status_code == 201

    # only excluded modification allowed
    response = business_client.patch(
        api_url, data=json.dumps({"all": False, "included": [1, 2]}), content_type="application/json"
    )
    assert response.status_code == 400

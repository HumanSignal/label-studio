"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import pytest
import json

from ..utils import project_id


@pytest.mark.django_db
def test_views_api(business_client, project_id):
    # create
    payload = dict(project=project_id, data={"test": 1})
    response = business_client.post(
        "/api/dm/views/",
        data=json.dumps(payload),
        content_type="application/json",
    )

    assert response.status_code == 201, response.content

    # list
    response = business_client.get(
        "/api/dm/views/",
    )

    assert response.status_code == 200, response.content
    assert response.json()[0]["project"] == project_id
    view_id = response.json()[0]["id"]

    # partial update
    updated_payload = dict(data={"test": 2})
    response = business_client.patch(
        f"/api/dm/views/{view_id}/",
        data=json.dumps(updated_payload),
        content_type="application/json",
    )
    assert response.status_code == 200, response.content

    # retrieve
    response = business_client.get(
        f"/api/dm/views/{view_id}/",
    )

    assert response.status_code == 200, response.content
    assert response.json()["data"] == updated_payload["data"]

    # reset
    response = business_client.delete(
        f"/api/dm/views/reset", data=json.dumps(dict(project=project_id)), content_type='application/json'
    )

    assert response.status_code == 204, response.content
    response = business_client.get("/api/dm/views/")
    assert response.json() == []


@pytest.mark.django_db
def test_views_api_filter_project(business_client):
    # create project
    response = business_client.post(
        "/api/projects/", data=json.dumps(dict(title="test_project1")), content_type="application/json"
    )
    project1_id = response.json()["id"]
    business_client.post("/api/dm/views/", data=json.dumps(dict(project=project1_id)), content_type="application/json")

    response = business_client.post(
        "/api/projects/", data=json.dumps(dict(title="test_project2")), content_type="application/json"
    )
    project2_id = response.json()["id"]
    business_client.post("/api/dm/views/", data=json.dumps(dict(project=project2_id)), content_type="application/json")

    # list all
    response = business_client.get("/api/dm/views/")
    assert response.status_code == 200, response.content
    assert len(response.json()) == 2

    # filtered list
    response = business_client.get(f"/api/dm/views/?project={project1_id}")
    assert response.status_code == 200, response.content
    assert response.json()[0]["project"] == project1_id

    # filtered reset
    response = business_client.delete(
        f"/api/dm/views/reset/", data=json.dumps(dict(project=project1_id)), content_type="application/json"
    )
    assert response.status_code == 204, response.content

    # filtered list
    response = business_client.get(f"/api/dm/views/?project={project2_id}")
    assert len(response.json()) == 1
    assert response.json()[0]["project"] == project2_id


@pytest.mark.django_db
def test_views_api_filters(business_client, project_id):
    # create
    payload = dict(
        project=project_id,
        data={
            "filters": {
                "conjunction": "or",
                "items": [
                    {
                        "filter": "filter:tasks:data.image",
                        "operator": "contains",
                        "type": "Image",
                        "value": {},
                    },
                    {
                        "filter": "filter:tasks:data.image",
                        "operator": "equal",
                        "type": "Image",
                        "value": {},
                    },
                ],
            }
        },
    )

    response = business_client.post(
        "/api/dm/views/",
        data=json.dumps(payload),
        content_type="application/json",
    )

    assert response.status_code == 201, response.content
    view_id = response.json()["id"]

    # retrieve
    response = business_client.get(
        f"/api/dm/views/{view_id}/",
    )

    assert response.status_code == 200, response.content
    assert response.json()["data"] == payload["data"]

    updated_payload = dict(
        project=project_id,
        data={
            "filters": {
                "conjunction": "and",
                "items": [
                    {
                        "filter": "filter:tasks:data.text",
                        "operator": "equal",
                        "type": "Text",
                        "value": {},
                    },
                    {
                        "filter": "filter:tasks:data.text",
                        "operator": "contains",
                        "type": "Text",
                        "value": {},
                    },
                ],
            }
        },
    )

    response = business_client.put(
        f"/api/dm/views/{view_id}/",
        data=json.dumps(updated_payload),
        content_type="application/json",
    )
    assert response.status_code == 200, response.content

    # check after update
    response = business_client.get(
        f"/api/dm/views/{view_id}/",
    )

    assert response.status_code == 200, response.content
    assert response.json()["data"] == updated_payload["data"]

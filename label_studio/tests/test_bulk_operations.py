"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import pytest
import os
import datetime

from users.models import User
from projects.models import Project
from tests.test_data.gen_tasks_and_annotations import gen_tasks


@pytest.mark.django_db
def test_load_tasks_and_annotations(business_client, annotator_client, configured_project):
    """
        this test loads tasks_and_annotations.json
        with 1000 tasks and 5000 annotations and recalc accuracy
        with bulk_update
        goal is to be under time limit to ensure operations
        are fast enough

        this project has p.data_types_json() as
        {text: '', meta_info:''}
        json should be generated as item = {data:{}}

        one could check results with
        tasks = Task.objects.all()
        print('annotations', [(t.id, t.annotations.count()) for t in tasks])
        print('accuracy', [(t.id, t.accuracy) for t in tasks])

    :param annotator_client:
    :param configured_project:
    :return:
    """
    p = Project.objects.get(id=configured_project.id)
    project_id = configured_project.id

    user = User.objects.get(email='annotator@pytest.net')
    p.created_by.active_organization.add_user(user)
    p.add_collaborator(user)

    gen_tasks(user.id)

    dt1 = datetime.datetime.now()
    filename = 'tasks_and_annotations.json'
    filepath = os.path.join(os.path.dirname(__file__), 'test_data/', filename)

    data = { filename: (open(filepath, 'rb'), filename) }
    url = '/api/projects/{}/tasks/bulk/'.format(project_id)
    r = business_client.post( url, data=data, format='multipart')
    assert r.status_code == 201, r.content

    dt2 = datetime.datetime.now()
    # time depends on aws machine cpu
    # around 15-30 secs for 1000 tasks each w 5 annotations
    assert (dt2-dt1).seconds < 150

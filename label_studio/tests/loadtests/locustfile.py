"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import json
import random

from uuid import uuid4
from locust import HttpUser, TaskSet, task, between  # type: ignore[import]


class UserWorksWithProject(TaskSet):  # type: ignore[misc]

    def on_start(self):  # type: ignore[no-untyped-def]
        # user creates the new project
        title = str(uuid4())
        payload = json.dumps({
            'title': title,
            'is_published': True,
            'skip_onboarding': True,
            'label_config': "<View><Text name=\"my_text\" value=\"$text\"/><Choices name=\"my_class\" toName=\"my_text\"><Choice value=\"pos\"/><Choice value=\"neg\"/></Choices></View>"
        })
        with self.client.post(
            '/api/projects',
            data=payload,
            headers={
                'content-type': 'application/json',
                'Authorization': f'Token {self.client.token}'
            },
            catch_response=True
        ) as r:
            if r.status_code != 201:
                r.failure(r.status_code)
            else:
                self.project_id = r.json()['id']
                print(f'Project {self.project_id} has been created by user {self.client.name}')

    @task(5)
    def project_list(self):  # type: ignore[no-untyped-def]
        self.client.get('/projects/')

    @task(5)
    def project_dashboard(self):  # type: ignore[no-untyped-def]
        self.client.get('/projects/%i' % self.project_id, name='/projects/<id>')

    @task(5)
    def project_data(self):  # type: ignore[no-untyped-def]
        self.client.get('/projects/%i/data' % self.project_id, name='/projects/<id>/data')

    @task(20)
    def label_stream(self):  # type: ignore[no-untyped-def]
        self.client.get('/projects/%i/label-stream' % self.project_id, name='/projects/<id>/label-stream')

    @task(5)
    def expert_page(self):
        self.client.get('/projects/%i/experts' % self.project_id, name='/projects/<id>/experts')

    @task(5)  # type: ignore[no-redef]
    def expert_page(self):
        self.client.get('/projects/%i/experts' % self.project_id, name='/projects/<id>/experts')

    @task(5)
    def stats(self):  # type: ignore[no-untyped-def]
        self.client.get('/business/stats')

    @task(5)
    def project_stats(self):  # type: ignore[no-untyped-def]
        self.client.get('/projects/%i/plots' % self.project_id, name='/projects/<id>/plots')

    @task(5)
    def experts(self):  # type: ignore[no-untyped-def]
        self.client.get('/business/experts')

    @task(5)
    def import_tasks(self):  # type: ignore[no-untyped-def]
        payload = json.dumps([{"text": "example positive review"}, {"text": "example negative review"}])
        headers = {'content-type': 'application/json', 'Authorization': f'Token {self.client.token}'}
        self.client.post('/api/projects/%i/tasks/bulk' % self.project_id, payload, headers=headers, name='/api/projects/<id>/tasks/bulk')

    @task(20)
    def complete_task_via_api(self):  # type: ignore[no-untyped-def]
        r = self.client.get('/api/projects/%i/tasks' % self.project_id, headers={'Authorization': f'Token {self.client.token}'}, name='/api/projects/<id>/tasks')
        tasks_list = r.json()
        if len(tasks_list):
            any_task = random.choice(tasks_list)
            payload = json.dumps({"result": [{"type": "choices", "from_name": "my_class", "to_name": "my_text", "value": {"choices": [random.choice(['pos', 'neg'])]}}]})
            headers = {'content-type': 'application/json', 'Authorization': f'Token {self.client.token}'}
            self.client.post('/api/tasks/%i/annotations' % any_task["id"], payload, headers=headers, name='/api/tasks/<id>/annotations')

    @task(1)
    def stop(self):  # type: ignore[no-untyped-def]
        self.interrupt()


class WebsiteUser(HttpUser):  # type: ignore[misc]
    wait_time = between(3, 9)
    tasks = {UserWorksWithProject: 10}

    def on_start(self):  # type: ignore[no-untyped-def]
        self.signup()  # type: ignore[no-untyped-call]

    def signup(self):  # type: ignore[no-untyped-def]
        response = self.client.get('/')
        csrftoken = response.cookies['csrftoken']
        username = str(uuid4())
        payload = {
            'email': f'{username}@loadtest.me',
            'password': '12345678',
            'title': username.upper()
        }
        r = self.client.post('/user/signup', payload, headers={'X-CSRFToken': csrftoken})
        response = self.client.get('/api/current-user/token').json()
        self.client.token = response['detail']
        self.client.name = username
        print(f'Client {username} successfully signed up. Token: {self.client.token}')
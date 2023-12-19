"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import json
import random
import string
from uuid import uuid4

from locust import HttpUser, TaskSet, between, task


def randomString(stringLength):
    """Generate a random string of fixed length"""
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(stringLength))


class UserWorksWithProject(TaskSet):
    def on_start(self):
        # user creates the new project
        title = str(uuid4())
        payload = json.dumps(
            {
                'title': title,
                'is_published': True,
                'skip_onboarding': True,
                'label_config': '<View><Text name="my_text" value="$text"/><Choices name="my_class" toName="my_text"><Choice value="pos"/><Choice value="neg"/></Choices></View>',
            }
        )
        with self.client.post(
            '/api/projects',
            data=payload,
            headers={'content-type': 'application/json', 'Authorization': f'Token {self.client.token}'},
            catch_response=True,
        ) as r:
            if r.status_code != 201:
                r.failure(r.status_code)
            else:
                self.project_id = r.json()['id']
                print(f'Project {self.project_id} has been created by user {self.client.name}')

        # let this user import tasks with annotations
        tasks = []
        for i in range(10000):
            one_task = {
                'data': {'text': randomString(random.randint(5, 200))},
                'annotations': [
                    {
                        'ground_truth': False,
                        'result': [
                            {
                                'type': 'choices',
                                'from_name': 'my_class',
                                'to_name': 'my_text',
                                'value': {'choices': [random.choice(['pos', 'neg'])]},
                            }
                        ],
                    }
                ],
                'predictions': [
                    {
                        'result': [
                            {
                                'type': 'choices',
                                'from_name': 'my_class',
                                'to_name': 'my_text',
                                'value': {'choices': [random.choice(['pos', 'neg'])]},
                            }
                        ],
                        'score': random.uniform(0, 1),
                    }
                ],
            }
            tasks.append(one_task)

        self.import_tasks(tasks, name='Initial tasks upload')

    @task(5)
    def project_list(self):
        self.client.get('/projects/')

    @task(5)
    def project_dashboard(self):
        self.client.get('/projects/%i' % self.project_id, name='/projects/<id>')

    @task(5)
    def project_data(self):
        self.client.get('/projects/%i/data' % self.project_id, name='/projects/<id>/data')

    @task(20)
    def label_stream(self):
        self.client.get('/projects/%i/label-stream' % self.project_id, name='/projects/<id>/label-stream')

    @task(5)
    def expert_page(self):
        self.client.get('/projects/%i/experts' % self.project_id, name='/projects/<id>/experts')

    @task(5)
    def ml_page(self):
        self.client.get('/projects/%i/ml' % self.project_id, name='/projects/<id>/ml')

    @task(5)
    def stats(self):
        self.client.get('/business/stats')

    @task(5)
    def project_stats(self):
        self.client.get('/projects/%i/plots' % self.project_id, name='/projects/<id>/plots')

    @task(5)
    def experts(self):
        self.client.get('/business/experts')

    @task(5)
    def import_tasks(self, tasks=None, name=None):
        if tasks is None:
            payload = json.dumps([{'text': 'example positive review'}, {'text': 'example negative review'}])
        else:
            payload = json.dumps(tasks)
        headers = {'content-type': 'application/json', 'Authorization': f'Token {self.client.token}'}
        self.client.post(
            '/api/projects/%i/tasks/bulk' % self.project_id,
            payload,
            headers=headers,
            name=name or '/api/projects/<id>/tasks/bulk',
        )

    @task(20)
    def complete_task_via_api(self):
        r = self.client.get(
            '/api/projects/%i/tasks' % self.project_id,
            headers={'Authorization': f'Token {self.client.token}'},
            name='/api/projects/<id>/tasks',
        )
        tasks_list = r.json()
        if len(tasks_list):
            any_task = random.choice(tasks_list)
            payload = json.dumps(
                {
                    'result': [
                        {
                            'type': 'choices',
                            'from_name': 'my_class',
                            'to_name': 'my_text',
                            'value': {'choices': [random.choice(['pos', 'neg'])]},
                        }
                    ]
                }
            )
            headers = {'content-type': 'application/json', 'Authorization': f'Token {self.client.token}'}
            self.client.post(
                '/api/tasks/%i/annotations' % any_task['id'],
                payload,
                headers=headers,
                name='/api/tasks/<id>/annotations',
            )

    @task(1)
    def stop(self):
        self.interrupt()


class WebsiteUser(HttpUser):
    wait_time = between(3, 9)

    tasks = {UserWorksWithProject: 10}

    def on_start(self):
        self.signup()

    def signup(self):
        response = self.client.get('/')
        csrftoken = response.cookies['csrftoken']
        username = str(uuid4())
        payload = {'email': f'{username}@loadtest.me', 'password': '12345678', 'title': username.upper()}
        self.client.post('/user/signup', payload, headers={'X-CSRFToken': csrftoken})
        response = self.client.get('/api/current-user/token').json()
        self.client.token = response['detail']
        self.client.name = username
        print(f'Client {username} successfully signed up. Token: {self.client.token}')

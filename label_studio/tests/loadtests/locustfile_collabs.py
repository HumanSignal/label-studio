"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import json
import random
import string

from locust import HttpUser, TaskSet, between, task


def randomString(stringLength):
    """Generate a random string of fixed length"""
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(stringLength))


all_labels = [
    'Person',
    'Organization',
    'Fact',
    'Money',
    'Date',
    'Time',
    'Ordinal',
    'Percent',
    'Product',
    'Language',
    'Location',
]


def get_result(text):
    start = random.randint(0, len(text))
    end = min(len(text), start + random.randint(3, 30))
    results = []
    for i in range(random.randint(1, 10)):
        results.append(
            {
                'type': 'labels',
                'from_name': 'ner',
                'to_name': 'text',
                'value': {'labels': [random.choice(all_labels)], 'start': start, 'end': end},
            }
        )
    return results


class UserWorksWithProject(TaskSet):
    def on_start(self):
        r = self.client.get('/api/annotator/projects')
        all_projects = r.json()
        self.project_id = random.choice(all_projects)

    @task(100)
    def complete_task_via_api(self):
        r = self.client.get('/api/projects/%i/next/' % self.project_id, name='/api/projects/<id>/next')
        task = r.json()
        task_id = task['id']
        task_text = task['data']['text']
        results = get_result(task_text)
        payload = json.dumps({'result': results})
        headers = {'content-type': 'application/json'}
        self.client.post(
            '/api/tasks/%i/annotations' % task_id, payload, headers=headers, name='/api/tasks/<id>/annotations'
        )

    @task(1)
    def stop(self):
        self.interrupt()


class WebsiteUser(HttpUser):
    wait_time = between(3, 9)

    tasks = {UserWorksWithProject: 10}

    def on_start(self):
        self.login()

    def login(self):
        response = self.client.get('/')
        csrftoken = response.cookies['csrftoken']
        num_collabs = 100
        payload = {'email': f'collab_{random.randint(0, num_collabs)}@loadtests.me', 'password': '123456789'}
        self.client.post('/annotator/login', payload, headers={'X-CSRFToken': csrftoken})

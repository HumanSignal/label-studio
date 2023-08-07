import os
import random
import string
import pandas as pd
import numpy as np

from uuid import uuid4
from locust import HttpUser, between, constant, task, tag, events  # type: ignore[import]


def get_project_id(client):  # type: ignore[no-untyped-def]
    with client.get('/api/projects', catch_response=True) as r:
        if r.status_code != 200:
            print(r.status_code)
            r.failure(r.status_code)
        else:
            project_list = r.json()
            print(project_list)
            ids = [p['id'] for p in project_list]
            if not ids:
                return
            return random.choice(ids)


def signup(client):  # type: ignore[no-untyped-def]
    username = str(uuid4())[:8]
    response = client.get('/')
    csrftoken = response.cookies['csrftoken']
    r = client.post(
        '/user/signup',
        {'email': f'{username}@heartex.com', 'password': 'password'},
        headers={'X-CSRFToken': csrftoken},
        catch_response=True)
    print(f'User {username} signup response: {r.status_code}')
    return username


class Admin(HttpUser):  # type: ignore[misc]
    weight = 1
    wait_time = constant(10)

    def on_start(self):  # type: ignore[no-untyped-def]
        username = signup(self.client)  # type: ignore[no-untyped-call]
        with self.client.post(
            '/api/projects',
            json={
                'title': f'{username}\'s project',
                'label_config': '<View><Text name="text" value="$text"/><Choices name="label" toName="text"><Choice value="1"/><Choice value="2"/></Choices></View>'
            },
            catch_response=True
        ) as r:
            if r.status_code != 201:
                r.failure(r.status_code)
            rdata = r.json()
            print('Get response: ', rdata)
            self.project_id = rdata['id']
            print(f'Project {self.project_id} has been created by user {self.client}')
            self.import_data()  # type: ignore[no-untyped-call]

    @task
    def view_data_manager(self):  # type: ignore[no-untyped-def]
        self.client.get(
            f'/projects/{self.project_id}/data',
            name='projects/<pk>/data'
        )

    # @tag('import')
    # @task
    def import_data(self):  # type: ignore[no-untyped-def]
        self.client.post(
            '/api/projects/%i/import' % self.project_id,
            name='/api/projects/<pk>/import',
            files={'csv': open('data.csv', 'rb')})
            # headers={'content-type': 'multipart/form-data'})


class Annotator(HttpUser):  # type: ignore[misc]
    weight = int(os.environ.get('LOCUST_USERS')) - 1  # type: ignore[arg-type]
    wait_time = between(1, 3)

    def on_start(self):  # type: ignore[no-untyped-def]
        signup(self.client)  # type: ignore[no-untyped-call]

    @tag('select project')
    @task(1)
    def select_project(self):  # type: ignore[no-untyped-def]
        self.project_id = get_project_id(self.client)  # type: ignore[no-untyped-call]

    @tag('labeling')
    @task(10)
    def do_labeling(self):  # type: ignore[no-untyped-def]
        if not hasattr(self, 'project_id') or not self.project_id:
            print('No projects yet...')
            return
        with self.client.get(
            f'/api/projects/{self.project_id}/next',
            name='/api/projects/<pk>/next',
            catch_response=True
        ) as r:
            task = r.json()
            self.client.post(
                f'/api/tasks/{task["id"]}/annotations',
                name='/api/tasks/<pk>/annotations',
                json={'result': [{'from_name': 'label', 'to_name': 'text', 'type': 'choices', 'value': {'choices': [random.choice(['1', '2'])]}}]}
            )


def randomString(stringLength):  # type: ignore[no-untyped-def]
    """Generate a random string of fixed length """
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(stringLength))


@events.test_start.add_listener
def on_test_start(environment, **kwargs):  # type: ignore[no-untyped-def]
    rows = int(os.environ.get('IMPORTED_TASKS', 50000))
    print(f'Generating file with {rows} rows...')
    numbers = np.random.randint(low=0, high=100, size=(rows, 10)).tolist()
    columns = ['text'] + [f'col_{i}' for i in range(9)]
    pd.DataFrame(numbers, columns=columns).to_csv('data.csv')

import json


def check_export_storage_type_annotation(_, annotation_pk):
    with open(f'/tmp/export_test/{annotation_pk}.json') as f:
        annotation = json.loads(f.read())
        assert 'task' in annotation


def check_export_storage_type_task(_, task_pk):
    with open(f'/tmp/export_test/{task_pk}.json') as f:
        task = json.loads(f.read())
        assert 'annotations' in task

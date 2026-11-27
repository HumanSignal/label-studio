from unittest.mock import patch

import pytest
from data_import.serializers import ImportApiSerializer
from ml.models import MLBackend
from projects.tests.factories import ProjectFactory
from tasks.models import AnnotationDraft, Task
from tasks.serializers import NextTaskSerializer
from tasks.tests.factories import PredictionFactory, TaskFactory


@pytest.mark.django_db
def test_get_predictions_with_int_model_version_from_ml_backend():
    # Reproduces: ENTERPRISE-V2-BACKEND-64G
    #
    # When collaborative pre-labeling is enabled and the project's ML backend
    # returns predictions, Task.get_predictions_for_prelabeling() forwards
    # whatever MLBackend.predict_tasks() returns straight to the serializer
    # unless it's a `str` (the model_version fast-path). If the ML backend's
    # setup response reports `model_version` as an integer, predict_tasks()
    # returns that int (when every task already has a matching prediction),
    # get_predictions_for_prelabeling() returns it as-is, and the serializer
    # tries to iterate over it with many=True.
    #
    # On unpatched code this raises the exact Sentry error:
    #   TypeError: 'int' object is not iterable
    # Once fixed, get_predictions() should degrade gracefully to a list.
    project = ProjectFactory(show_collab_predictions=True, model_version='mymodel')
    # ml_backend_in_model_version is True when a backend's title matches model_version
    MLBackend.objects.create(project=project, url='http://ml.test', title='mymodel')
    task = TaskFactory(project=project)

    serializer = NextTaskSerializer(task, context={})

    # Simulate the ML backend reporting an integer model_version, which
    # propagates back through predict_tasks() unchanged.
    with patch.object(MLBackend, 'predict_tasks', return_value=1):
        predictions = serializer.get_predictions(task)

    # Serialized predictions must always be an iterable list of prediction dicts.
    assert isinstance(predictions, list)


@pytest.mark.django_db
def test_get_predictions_when_project_model_version_is_empty():
    # FIT-1710: with no model version selected (project.model_version == ''),
    # next_task filtered predictions to model_version='' and returned none,
    # while GET /api/tasks/:id/ and total_predictions still showed them.
    project = ProjectFactory(show_collab_predictions=True, model_version='')
    task = TaskFactory(project=project)
    PredictionFactory(task=task, model_version='v1')

    predictions = NextTaskSerializer(task, context={}).get_predictions(task)

    assert [p['model_version'] for p in predictions] == ['v1']


@pytest.mark.django_db
def test_import_draft_referencing_unknown_annotation_does_not_raise(monkeypatch):
    # Reproduces + regression-guards: ENTERPRISE-V2-BACKEND-6G5
    #
    # During (streaming re-)import, BaseTaskSerializerBulk.create() builds
    #   annotation_mapping = {annotation.import_id: annotation.id for ...} (+ {None: None})
    # from the annotations imported in the same batch. add_drafts() then looked up
    # the mapping directly: annotation_mapping[draft.get('annotation')]. When an
    # imported draft references an annotation id that is NOT present in the batch
    # (e.g. a snapshot whose parent annotation was dropped/never imported), the
    # lookup raised the exact Sentry error:
    #   KeyError: 99435637
    #
    # After the fix add_drafts() uses annotation_mapping.get(...), so an orphaned
    # draft degrades to an unlinked draft (annotation_id=None) and the import
    # succeeds instead of crashing the whole batch.
    #
    # The drafts import path is gated on this feature flag; flag_set() reads env
    # first, so setting it to "true" enables the code path without LaunchDarkly.
    monkeypatch.setenv('fflag_feat_back_lsdv_5307_import_reviews_drafts_29062023_short', 'true')

    project = ProjectFactory()
    user = project.created_by

    missing_annotation_id = 99435637
    payload = [
        {
            'data': {'text': 'hello'},
            # No annotations in this task, so annotation_mapping won't contain the
            # id the draft below points at.
            'annotations': [],
            'drafts': [
                {
                    'id': 555,
                    'annotation': missing_annotation_id,
                    'result': [],
                }
            ],
        }
    ]

    serializer = ImportApiSerializer(data=payload, many=True, context={'project': project, 'user': user})
    serializer.is_valid(raise_exception=True)

    # Must not raise KeyError: 99435637 anymore.
    db_tasks = serializer.save(project_id=project.id)

    # The orphaned draft is still imported, just unlinked from any annotation.
    assert len(db_tasks) == 1
    drafts = AnnotationDraft.objects.filter(task=db_tasks[0])
    assert drafts.count() == 1
    assert drafts.first().annotation_id is None


def _import(project, items):
    serializer = ImportApiSerializer(data=items, many=True, context={'project': project, 'user': project.created_by})
    serializer.is_valid(raise_exception=True)
    serializer.save(project_id=project.id)
    return list(Task.objects.filter(project=project).order_by('id'))


@pytest.mark.django_db
def test_import_keeps_source_task_id_as_import_id():
    """The root `id` of an imported task (e.g. from a JSON export) is kept as import_id, never reused as the id."""
    project = ProjectFactory()
    source = TaskFactory(project=ProjectFactory(organization=project.organization))

    tasks = _import(project, [{'id': source.id, 'data': {'text': 'exported'}}, {'data': {'text': 'no id'}}])

    assert [task.import_id for task in tasks] == [source.id, None]
    assert tasks[0].id != source.id


@pytest.mark.django_db
@pytest.mark.parametrize('task_id', ['17', 'a3f5c2d1-uuid', True, 1.5, 2**63, -(2**63) - 1, None, {'id': 1}])
def test_import_ignores_task_id_that_is_not_a_bigint(task_id):
    """A root `id` that is not an integer fitting the column is ignored, as before, and the import succeeds."""
    project = ProjectFactory()

    (task,) = _import(project, [{'id': task_id, 'data': {'text': 'from another tool'}}])

    assert task.import_id is None


@pytest.mark.django_db
@pytest.mark.parametrize('task_id', [2**63 - 1, -(2**63), 0])
def test_import_keeps_task_id_at_bigint_bounds(task_id):
    project = ProjectFactory()

    (task,) = _import(project, [{'id': task_id, 'data': {'text': 'bounds'}}])

    assert task.import_id == task_id


@pytest.mark.django_db
def test_import_of_data_only_item_treats_id_as_data():
    """Without a "data" key the whole item is task data, so its "id" is a data field, not a source task id."""
    project = ProjectFactory()

    (task,) = _import(project, [{'id': 7, 'text': 'flat'}])

    assert task.import_id is None
    assert task.data == {'id': 7, 'text': 'flat'}

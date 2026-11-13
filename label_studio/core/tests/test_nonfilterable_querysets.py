import pytest
from core.utils.iterators import iterate_queryset
from data_manager.actions.data_columns import _set_data_value
from django.db import connection
from django.db.models import F
from django.test.utils import CaptureQueriesContext
from projects.tests.factories import ProjectFactory
from tasks.models import Task
from tasks.tests.factories import TaskFactory
from users.tests.factories import UserFactory


@pytest.fixture
def users(db):
    return [UserFactory(first_name=str(index)) for index in range(7)]


@pytest.mark.parametrize('chunk_size', [1, 2, 4])
@pytest.mark.parametrize('limits', [(1, 6), (0, 1), (3, None), (2, 2)])
def test_sliced_querysets_preserve_limits_order_annotations_and_values(users, chunk_size, limits):
    model = type(users[0])
    queryset = (
        model.objects.filter(pk__in=[user.pk for user in users])
        .annotate(source_id=F('pk'))
        .order_by('-pk')
        .values('pk', 'first_name', 'source_id')[slice(*limits)]
    )
    expected = list(queryset.all())
    with CaptureQueriesContext(connection) as queries:
        actual = list(iterate_queryset(queryset, chunk_size=chunk_size))
    assert actual == expected
    assert all('LIMIT' in query['sql'].upper() for query in queries)


@pytest.mark.parametrize('operation', ['union', 'union_all', 'intersection', 'difference'])
@pytest.mark.parametrize('chunk_size', [1, 3])
def test_combined_querysets_preserve_rows_and_duplicate_multiplicity(users, operation, chunk_size):
    model = type(users[0])
    first = model.objects.filter(pk__in=[user.pk for user in users[:5]]).order_by()
    second = model.objects.filter(pk__in=[user.pk for user in users[2:]]).order_by()
    if operation == 'union_all':
        queryset = first.union(second, all=True)
        expected = sorted([user.pk for user in users[:5]] + [user.pk for user in users[2:]])
    else:
        queryset = getattr(first, operation)(second)
        selected = {'union': users, 'intersection': users[2:5], 'difference': users[:2]}[operation]
        expected = [user.pk for user in selected]
    queryset = queryset.order_by('pk')
    assert [user.pk for user in iterate_queryset(queryset, chunk_size=chunk_size)] == expected


def test_combined_values_queryset_can_also_be_sliced(users):
    model = type(users[0])
    left = model.objects.filter(pk__in=[user.pk for user in users[:5]]).order_by().values_list('pk', flat=True)
    right = model.objects.filter(pk__in=[user.pk for user in users[2:]]).order_by().values_list('pk', flat=True)
    queryset = left.union(right, all=True).order_by('-pk')[2:7]
    expected = sorted([user.pk for user in users[:5]] + [user.pk for user in users[2:]], reverse=True)[2:7]
    assert list(iterate_queryset(queryset, chunk_size=2)) == expected


@pytest.mark.django_db
def test_real_data_column_update_respects_a_limited_task_selection(settings):
    project = ProjectFactory()
    tasks = [TaskFactory(project=project, data={'text': str(index)}) for index in range(6)]
    settings.UPDATE_COLUMN_BATCH_SIZE = 2
    queryset = Task.objects.filter(project=project).order_by('-pk')[1:4]
    assert _set_data_value(queryset, 'reviewed', True) == 3
    selected_ids = {task.pk for task in tasks[-4:-1]}
    for index, task in enumerate(tasks):
        task.refresh_from_db()
        assert task.data.get('reviewed', False) is (task.pk in selected_ids)
        assert task.data['text'] == str(index)


def test_normal_queryset_keeps_existing_behavior(users):
    model = type(users[0])
    queryset = model.objects.filter(pk__in=[user.pk for user in users]).order_by('-pk')
    assert [user.pk for user in iterate_queryset(queryset, chunk_size=2)] == [user.pk for user in reversed(users)]


@pytest.mark.parametrize('chunk_size', [0, -1])
def test_invalid_chunk_sizes_still_raise_for_sliced_queries(users, chunk_size):
    queryset = type(users[0]).objects.all()[:1]
    with pytest.raises(ValueError, match='chunk_size must be positive'):
        list(iterate_queryset(queryset, chunk_size=chunk_size))

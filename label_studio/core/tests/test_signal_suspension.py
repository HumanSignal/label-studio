import pytest
from core.utils.common import temporary_disconnect_list_signal
from django.db.models.signals import pre_delete
from django.dispatch import Signal


@pytest.mark.parametrize('dispatch_uid', [None, 'counter'])
def test_connected_receiver_is_restored(dispatch_uid):
    signal = Signal()
    sender = object()
    calls = []

    def receiver(**kwargs):
        calls.append(kwargs['sender'])

    signal.connect(receiver, sender=sender, dispatch_uid=dispatch_uid)
    with temporary_disconnect_list_signal([(signal, receiver, sender, dispatch_uid)]):
        signal.send(sender)
        assert calls == []
    signal.send(sender)
    assert calls == [sender]


@pytest.mark.parametrize('dispatch_uid', [None, 'counter'])
def test_absent_receiver_is_not_connected_on_exit(dispatch_uid):
    signal = Signal()
    sender = object()
    calls = []

    def receiver(**kwargs):
        calls.append(kwargs['sender'])

    with temporary_disconnect_list_signal([(signal, receiver, sender, dispatch_uid)]):
        assert signal.send(sender) == []
    assert signal.send(sender) == []
    assert calls == []


@pytest.mark.parametrize('dispatch_uid', [None, 'counter'])
@pytest.mark.parametrize('reuse_context', [False, True])
def test_nested_context_does_not_end_outer_suspension(dispatch_uid, reuse_context):
    signal = Signal()
    sender = object()
    calls = []

    def receiver(**kwargs):
        calls.append(kwargs['sender'])

    signal.connect(receiver, sender=sender, dispatch_uid=dispatch_uid)
    entries = [(signal, receiver, sender, dispatch_uid)]
    outer = temporary_disconnect_list_signal(entries)
    inner = outer if reuse_context else temporary_disconnect_list_signal(entries)

    with outer:
        with inner:
            signal.send(sender)
            assert calls == []
        signal.send(sender)
        assert calls == []
    signal.send(sender)
    assert calls == [sender]


@pytest.mark.parametrize('dispatch_uid', [None, 'counter'])
def test_inner_exception_preserves_outer_suspension(dispatch_uid):
    signal = Signal()
    sender = object()
    calls = []

    def receiver(**kwargs):
        calls.append(kwargs['sender'])

    signal.connect(receiver, sender=sender, dispatch_uid=dispatch_uid)
    entries = [(signal, receiver, sender, dispatch_uid)]
    with temporary_disconnect_list_signal(entries):
        with pytest.raises(ValueError, match='operation failed'):
            with temporary_disconnect_list_signal(entries):
                raise ValueError('operation failed')
        signal.send(sender)
        assert calls == []
    signal.send(sender)
    assert calls == [sender]


def test_generator_entries_are_restored():
    signal = Signal()
    sender = object()
    calls = []

    def receiver(**kwargs):
        calls.append(kwargs['sender'])

    signal.connect(receiver, sender=sender)
    entries = ((signal, receiver, sender) for _ in range(1))
    with temporary_disconnect_list_signal(entries):
        assert signal.send(sender) == []
    signal.send(sender)
    assert calls == [sender]


def test_duplicate_entries_only_restore_one_registration():
    signal = Signal()
    sender = object()
    calls = []

    def receiver(**kwargs):
        calls.append(kwargs['sender'])

    signal.connect(receiver, sender=sender)
    with temporary_disconnect_list_signal([(signal, receiver, sender)] * 2):
        assert signal.send(sender) == []
    signal.send(sender)
    assert calls == [sender]


@pytest.mark.parametrize('dispatch_uid', [None, 'counter'])
def test_reusing_context_does_not_restore_a_later_absent_receiver(dispatch_uid):
    signal = Signal()
    sender = object()

    def receiver(**kwargs):
        pass

    signal.connect(receiver, sender=sender, dispatch_uid=dispatch_uid)
    context = temporary_disconnect_list_signal([(signal, receiver, sender, dispatch_uid)])
    with context:
        assert signal.send(sender) == []
    assert len(signal.send(sender)) == 1
    signal.disconnect(receiver, sender=sender, dispatch_uid=dispatch_uid)
    with context:
        assert signal.send(sender) == []
    assert signal.send(sender) == []


def test_suspension_preserves_unrelated_sender():
    signal = Signal()
    sender, other = object(), object()
    calls = []

    def receiver(**kwargs):
        calls.append(kwargs['sender'])

    signal.connect(receiver, sender=sender)
    signal.connect(receiver, sender=other)
    with temporary_disconnect_list_signal([(signal, receiver, sender)]):
        signal.send(sender)
        signal.send(other)
        assert calls == [other]
    signal.send(sender)
    assert calls == [other, sender]


@pytest.mark.django_db
def test_bulk_task_delete_preserves_outer_summary_suspension():
    from projects.tests.factories import ProjectFactory
    from tasks.models import Task, remove_data_columns
    from tasks.tests.factories import TaskFactory

    project = ProjectFactory()
    tasks = [TaskFactory(project=project, data={'text': str(i)}) for i in range(3)]
    project.summary.refresh_from_db()
    original_columns = dict(project.summary.all_data_columns)
    assert original_columns == {'text': 3}

    # A surrounding bulk operation owns the deferred summary update. The
    # nested task deletion must not resume per-task accounting prematurely.
    with temporary_disconnect_list_signal([(pre_delete, remove_data_columns, Task)]):
        Task.delete_tasks_without_signals(Task.objects.filter(pk=tasks[0].pk))
        Task.objects.filter(pk=tasks[1].pk).delete()
        project.summary.refresh_from_db()
        assert project.summary.all_data_columns == original_columns

    Task.objects.filter(pk=tasks[2].pk).delete()
    project.summary.refresh_from_db()
    assert project.summary.all_data_columns == {'text': 2}
    assert project.tasks.count() == 0

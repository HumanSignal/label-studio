import pytest
from core.utils.iterators import iterate_queryset_in_keyset_batches
from users.tests.factories import UserFactory


@pytest.mark.django_db
def test_iterate_queryset_in_keyset_batches_orders_by_key_field():
    users = [UserFactory() for _ in range(5)]
    queryset = type(users[0]).objects.filter(id__in=[user.id for user in users]).order_by('-id')

    batches = list(iterate_queryset_in_keyset_batches(queryset, chunk_size=2))
    batch_ids = [[user.id for user in batch] for batch in batches]

    assert [len(batch) for batch in batches] == [2, 2, 1]
    assert [user_id for batch in batch_ids for user_id in batch] == sorted(user.id for user in users)


@pytest.mark.django_db
def test_iterate_queryset_in_keyset_batches_respects_start_after_and_stop_at():
    users = [UserFactory() for _ in range(5)]
    ordered_ids = sorted(user.id for user in users)
    queryset = type(users[0]).objects.filter(id__in=ordered_ids)

    batches = list(
        iterate_queryset_in_keyset_batches(
            queryset,
            chunk_size=2,
            key_field='id',
            start_after=ordered_ids[1],
            stop_at=ordered_ids[3],
        )
    )

    assert [[user.id for user in batch] for batch in batches] == [ordered_ids[2:4]]


@pytest.mark.django_db
def test_iterate_queryset_in_keyset_batches_accepts_empty_queryset():
    queryset = UserFactory._meta.model.objects.filter(email='missing@example.com')

    assert list(iterate_queryset_in_keyset_batches(queryset, chunk_size=2)) == []


@pytest.mark.django_db
def test_iterate_queryset_in_keyset_batches_rejects_invalid_chunk_size():
    queryset = UserFactory._meta.model.objects.all()

    with pytest.raises(ValueError, match='chunk_size must be positive'):
        list(iterate_queryset_in_keyset_batches(queryset, chunk_size=0))

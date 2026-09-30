import pytest
from data_export.serializers import CompletedBySerializer
from users.serializers import UserSimpleSerializer
from users.tests.factories import UserFactory


@pytest.mark.django_db
@pytest.mark.parametrize(
    'first, second', [(CompletedBySerializer, UserSimpleSerializer), (UserSimpleSerializer, CompletedBySerializer)]
)
def test_user_serializers_sharing_a_context_keep_their_own_fields(first, second):
    user = UserFactory()
    context = {}

    first(user, context=context).data
    data = second(user, context=context).data

    assert set(data) == set(second(user, context={}).data)

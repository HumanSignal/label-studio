"""The open-source firewall is a no-op: it never anonymizes anyone.

Enterprise behaviour (activation, role labels, id-less stubs) is covered in LSE's
``lse_users/tests/test_firewall.py``.
"""

from types import SimpleNamespace

from users.firewall import AnnotatorReviewerFirewall


class FakeUser(SimpleNamespace):
    pass


def test_is_active_always_false():
    user = FakeUser(id=1, is_authenticated=True)
    assert AnnotatorReviewerFirewall.is_active(user) is False
    assert AnnotatorReviewerFirewall.is_active(None) is False


def test_should_anonymize_always_false():
    requester = FakeUser(id=1)
    other = FakeUser(id=2)
    assert AnnotatorReviewerFirewall.should_anonymize(user=other, requester=requester) is False
    assert AnnotatorReviewerFirewall.should_anonymize(user=requester, requester=requester) is False


def test_should_anonymize_user_id_always_false():
    requester = FakeUser(id=1)
    assert AnnotatorReviewerFirewall.should_anonymize_user_id(2, requester=requester) is False
    assert AnnotatorReviewerFirewall.should_anonymize_user_id(1, requester=requester) is False


def test_anonymize_user_data_is_identity():
    data = {'id': 5, 'email': 'a@b.com', 'first_name': 'Ann'}
    assert AnnotatorReviewerFirewall.anonymize_user_data(data, user=FakeUser(id=5), requester=FakeUser(id=1)) == data


def test_anonymized_user_id_returns_real_id():
    # The no-op firewall never anonymizes, so it exposes the user's real id unchanged.
    assert AnnotatorReviewerFirewall.anonymized_user_id(user=FakeUser(id=7), requester=FakeUser(id=1)) == 7

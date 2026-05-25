"""Tests for BROS-1092: tolerant ``completed_by`` handling on import.

Covers two layers:

1. Pure unit tests for :func:`tasks.serializers.resolve_completed_by_id` — the
   shared resolver used by both file imports and storage syncs.
2. Integration tests through :class:`data_import.serializers.ImportApiSerializer`
   that exercise :meth:`tasks.serializers.BaseTaskSerializerBulk._insert_valid_completed_by`
   under both feature-flag states.

Feature flag toggled via ``monkeypatch.setenv``: ``flag_set`` reads env first, so
setting the env var to ``"false"`` disables the new behavior without touching
LaunchDarkly. Default registration in ``feature_flags.json`` is ON, so the
"flag enabled" tests rely on the stock state.
"""

from unittest.mock import patch

import pytest
from data_import.serializers import ImportApiSerializer
from organizations.models import OrganizationMember
from organizations.tests.factories import OrganizationFactory
from projects.tests.factories import ProjectFactory
from rest_framework.exceptions import ValidationError
from tasks.serializers import resolve_completed_by_id
from users.tests.factories import UserFactory

FF_KEY = 'fflag_fix_back_bros_1092_import_unknown_completed_by_short'


# ---------------------------------------------------------------------------
# Pure unit tests for resolve_completed_by_id (no DB access).
# ---------------------------------------------------------------------------


class TestResolveCompletedById:
    """Unit tests for the resolver shared by file imports and storage syncs.

    Validates each input shape supported by :func:`resolve_completed_by_id`:
    ``None``, ``int``, ``dict`` with ``email``/``id``, junk values, and the
    ``bool``-as-``int`` corner case. The resolver must never raise; on any
    unresolvable input it returns the supplied ``default_user_id``.
    """

    DEFAULT_ID = 999
    MEMBERS = {'a@example.com': 1, 'b@example.com': 2}
    MEMBER_IDS = {1, 2, 3}

    def test_none_returns_default(self):
        """None means "annotation had no annotator"; fall back to default."""
        assert resolve_completed_by_id(None, self.MEMBERS, self.MEMBER_IDS, self.DEFAULT_ID) == self.DEFAULT_ID

    def test_int_member_returns_as_is(self):
        """Int that belongs to the org is preserved."""
        assert resolve_completed_by_id(2, self.MEMBERS, self.MEMBER_IDS, self.DEFAULT_ID) == 2

    def test_int_not_in_org_falls_back(self):
        """Int that does not belong to the org falls back to default."""
        assert resolve_completed_by_id(42, self.MEMBERS, self.MEMBER_IDS, self.DEFAULT_ID) == self.DEFAULT_ID

    def test_dict_email_in_org(self):
        """Dict with a known email resolves to that org member's id."""
        assert resolve_completed_by_id({'email': 'a@example.com'}, self.MEMBERS, self.MEMBER_IDS, self.DEFAULT_ID) == 1

    def test_dict_email_not_in_org_falls_back(self):
        """Dict with an unknown email falls back to default."""
        assert (
            resolve_completed_by_id({'email': 'ghost@example.com'}, self.MEMBERS, self.MEMBER_IDS, self.DEFAULT_ID)
            == self.DEFAULT_ID
        )

    def test_dict_export_shape_id_in_org(self):
        """Export API ``?expand=annotations.completed_by`` shape with id-only.

        The dict has ``id`` but no email; if the id is an org member it wins.
        """
        assert (
            resolve_completed_by_id({'id': 3, 'first_name': 'X'}, self.MEMBERS, self.MEMBER_IDS, self.DEFAULT_ID) == 3
        )

    def test_dict_export_shape_id_not_in_org_falls_back(self):
        """Export shape dict with id outside the org falls back."""
        assert resolve_completed_by_id({'id': 77}, self.MEMBERS, self.MEMBER_IDS, self.DEFAULT_ID) == self.DEFAULT_ID

    def test_dict_email_takes_precedence_over_id(self):
        """When both are present, email wins (matches dict shape from Export)."""
        # email maps to 1; id is not a member but should not be considered.
        result = resolve_completed_by_id(
            {'email': 'a@example.com', 'id': 77}, self.MEMBERS, self.MEMBER_IDS, self.DEFAULT_ID
        )
        assert result == 1

    def test_dict_unknown_email_falls_back_to_id_when_in_org(self):
        """Unknown email plus a known-member id should still resolve via the id."""
        result = resolve_completed_by_id(
            {'email': 'ghost@example.com', 'id': 2}, self.MEMBERS, self.MEMBER_IDS, self.DEFAULT_ID
        )
        assert result == 2

    def test_garbage_string_falls_back(self):
        """Random string input falls back to default with a warning."""
        assert resolve_completed_by_id('garbage', self.MEMBERS, self.MEMBER_IDS, self.DEFAULT_ID) == self.DEFAULT_ID

    def test_bool_true_does_not_match_id_one(self):
        """``True`` is an int subclass; guard against accidental match on id=1."""
        members_ids = {1}
        members_email = {}
        assert resolve_completed_by_id(True, members_email, members_ids, self.DEFAULT_ID) == self.DEFAULT_ID

    def test_bool_id_in_dict_ignored(self):
        """``{"id": True}`` must not match user id 1 either."""
        members_ids = {1}
        members_email = {}
        assert resolve_completed_by_id({'id': True}, members_email, members_ids, self.DEFAULT_ID) == self.DEFAULT_ID

    def test_default_user_id_none_returns_none(self):
        """If no fallback id is available, return None so callers can drop the field."""
        assert resolve_completed_by_id(None, {}, set(), None) is None
        assert resolve_completed_by_id(42, {}, set(), None) is None
        assert resolve_completed_by_id({'email': 'x@x'}, {}, set(), None) is None


# ---------------------------------------------------------------------------
# Integration tests via ImportApiSerializer (FF on by default in feature_flags.json).
# ---------------------------------------------------------------------------


def _import_one(project, user, completed_by):
    """Run a single-task import through ImportApiSerializer and return the saved Task."""
    payload = [
        {
            'data': {'text': 'hello'},
            'annotations': [{'completed_by': completed_by, 'result': []}],
        }
    ]
    serializer = ImportApiSerializer(data=payload, many=True, context={'project': project, 'user': user})
    serializer.is_valid(raise_exception=True)
    [task] = serializer.save(project_id=project.id)
    return task


@pytest.mark.django_db
class TestImportCompletedByFFOn:
    """End-to-end coverage for FF-on path: unknown completed_by -> importer.

    For every shape the resolver supports we assert that:
    - the import succeeds (no ValidationError),
    - the resulting annotation is attributed to the importer (or to a known
      member when the input legitimately resolves to one).
    """

    @pytest.fixture(autouse=True)
    def setup(self):
        """Set up two organizations with three distinct member roles.

        Critically, ``importer`` and ``project.created_by`` are different users so
        that assertions can tell apart "fallback to importer" from "fallback to
        project.created_by" — otherwise tests would silently pass for the wrong
        reason whenever the two collapse onto the same id.
        """
        # Project creator is the org owner — this is what BROS-1092 falls back to
        # when no importer is in the serializer context (e.g. legacy async path).
        self.project_creator = UserFactory()
        self.organization = OrganizationFactory(created_by=self.project_creator)
        self.project_creator.active_organization = self.organization
        self.project_creator.save(update_fields=['active_organization'])

        # Importer is a separate org member who actually triggers the import.
        self.importer = UserFactory()
        OrganizationMember.objects.create(user=self.importer, organization=self.organization)
        self.importer.active_organization = self.organization
        self.importer.save(update_fields=['active_organization'])

        # Generic org member — used to verify "known member id is preserved".
        self.member = UserFactory()
        OrganizationMember.objects.create(user=self.member, organization=self.organization)

        # User in a separate organization — should never leak into our annotations.
        self.foreign_user = UserFactory()
        self.foreign_org = OrganizationFactory(created_by=self.foreign_user)

        self.project = ProjectFactory(
            title='BROS-1092 import test',
            organization=self.organization,
            created_by=self.project_creator,
            label_config='<View><Text name="text" value="$text"/></View>',
        )

        # Sanity: distinct ids (otherwise tests below would not distinguish fallbacks).
        assert self.importer.id != self.project_creator.id
        assert self.importer.id != self.member.id
        assert self.importer.id != self.foreign_user.id

    def test_unknown_int_falls_back_to_importer(self):
        """An int id outside the org silently re-attributes to the importer."""
        task = _import_one(self.project, self.importer, completed_by=99999)
        annotation = task.annotations.get()
        assert annotation.completed_by_id == self.importer.id

    def test_foreign_org_user_id_falls_back_to_importer(self):
        """Existing user from a foreign org is rewritten to the importer.

        Without the fix, AnnotationSerializer would silently keep the foreign
        user id because it validates against ``User.objects.all()``.
        """
        task = _import_one(self.project, self.importer, completed_by=self.foreign_user.id)
        annotation = task.annotations.get()
        assert annotation.completed_by_id == self.importer.id

    def test_unknown_email_falls_back_to_importer(self):
        """Dict with an unknown email re-attributes to the importer."""
        task = _import_one(self.project, self.importer, completed_by={'email': 'ghost@example.com'})
        annotation = task.annotations.get()
        assert annotation.completed_by_id == self.importer.id

    def test_export_shape_dict_falls_back_to_importer(self):
        """Export-shaped dict (``{id, email, first_name, last_name}``) with non-member values."""
        task = _import_one(
            self.project,
            self.importer,
            completed_by={'id': 99999, 'email': 'ghost@example.com', 'first_name': 'X'},
        )
        annotation = task.annotations.get()
        assert annotation.completed_by_id == self.importer.id

    def test_dict_id_only_resolves_member(self):
        """Dict with only ``id`` of a known member attributes to that member."""
        task = _import_one(self.project, self.importer, completed_by={'id': self.member.id})
        annotation = task.annotations.get()
        assert annotation.completed_by_id == self.member.id

    def test_dict_email_resolves_member(self):
        """Dict with ``email`` of a known member attributes to that member."""
        task = _import_one(self.project, self.importer, completed_by={'email': self.member.email})
        annotation = task.annotations.get()
        assert annotation.completed_by_id == self.member.id

    def test_garbage_string_falls_back_to_importer(self):
        """Garbage string value does not 400 — it re-attributes to the importer."""
        task = _import_one(self.project, self.importer, completed_by='garbage')
        annotation = task.annotations.get()
        assert annotation.completed_by_id == self.importer.id

    def test_bool_true_does_not_match_id_one(self):
        """``True`` must fall back, not match a member just because ``True == 1``.

        Pure-logic coverage lives in :meth:`TestResolveCompletedById.test_bool_true_does_not_match_id_one`;
        here we just confirm the integration path also re-attributes to the importer.
        """
        task = _import_one(self.project, self.importer, completed_by=True)
        annotation = task.annotations.get()
        assert annotation.completed_by_id == self.importer.id
        # importer is guaranteed distinct from any user with id=1 if such exists,
        # because importer.id is allocated fresh by Factory Boy after id=1.

    def test_known_member_id_preserved(self):
        """A plain int that is already a member must be preserved unchanged."""
        task = _import_one(self.project, self.importer, completed_by=self.member.id)
        annotation = task.annotations.get()
        assert annotation.completed_by_id == self.member.id

    def test_no_user_in_context_falls_back_to_project_creator(self):
        """When the importer is not passed via context, default_user is project.created_by.

        This guards the legacy async path: before BROS-1092, the async code in
        ``data_import.functions`` did not pass ``user`` into the serializer
        context, so unknown completed_by attributed to ``project.created_by``
        (not the importer). The new code only changes that under the FF; without
        ``user`` in context the bulk serializer must still fall back to
        ``project.created_by`` deterministically.
        """
        payload = [
            {
                'data': {'text': 'no-user'},
                'annotations': [{'completed_by': 99999, 'result': []}],
            }
        ]
        # Note: user intentionally absent — exercises the async-no-FF code path.
        serializer = ImportApiSerializer(data=payload, many=True, context={'project': self.project})
        serializer.is_valid(raise_exception=True)
        [task] = serializer.save(project_id=self.project.id)
        annotation = task.annotations.get()
        # project.created_by is project_creator, NOT importer — distinct ids in setup().
        assert annotation.completed_by_id == self.project_creator.id
        assert annotation.completed_by_id != self.importer.id


# ---------------------------------------------------------------------------
# Legacy (FF off) behavior — strict validation must still raise.
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestImportCompletedByFFOff:
    """FF-off path keeps the historical strict validation as a rollback safety net.

    We disable the flag via ``patch('tasks.serializers.flag_set')`` so that the
    bulk serializer takes the legacy branches that raise ``ValidationError``.
    """

    @pytest.fixture(autouse=True)
    def setup(self):
        self.importer = UserFactory()
        self.organization = OrganizationFactory(created_by=self.importer)
        self.importer.active_organization = self.organization
        self.importer.save(update_fields=['active_organization'])

        self.project = ProjectFactory(
            title='BROS-1092 import test (FF off)',
            organization=self.organization,
            created_by=self.importer,
            label_config='<View><Text name="text" value="$text"/></View>',
        )

    @staticmethod
    def _flag_set_off(name, *args, **kwargs):
        """Replacement for flag_set that disables only BROS-1092 and leaves others on."""
        if name == FF_KEY:
            return False
        return True

    def test_unknown_int_raises(self):
        """Legacy: unknown int falls into the ``else`` branch and raises 400."""
        with patch('tasks.serializers.flag_set', side_effect=self._flag_set_off):
            with pytest.raises(ValidationError):
                _import_one(self.project, self.importer, completed_by=99999)

    def test_unknown_email_raises(self):
        """Legacy: unknown email raises (ALLOW_IMPORT_TASKS_WITH_UNKNOWN_EMAILS is False by default)."""
        with patch('tasks.serializers.flag_set', side_effect=self._flag_set_off):
            with pytest.raises(ValidationError):
                _import_one(self.project, self.importer, completed_by={'email': 'ghost@example.com'})

    def test_known_member_id_preserved(self):
        """Legacy: a member's id still passes through unchanged."""
        with patch('tasks.serializers.flag_set', side_effect=self._flag_set_off):
            task = _import_one(self.project, self.importer, completed_by=self.importer.id)
            annotation = task.annotations.get()
            assert annotation.completed_by_id == self.importer.id

    def test_none_falls_back_to_default_user(self):
        """Legacy: missing completed_by falls back to default user (importer)."""
        with patch('tasks.serializers.flag_set', side_effect=self._flag_set_off):
            task = _import_one(self.project, self.importer, completed_by=None)
            annotation = task.annotations.get()
            assert annotation.completed_by_id == self.importer.id

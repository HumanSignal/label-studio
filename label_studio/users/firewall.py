"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

"""Annotator/reviewer firewall hooks.

When the firewall is active, the API must not return any identifying information
about *other* users to a requester who is an annotator or reviewer. The requester
always sees their own real identity.

Hidden users keep a numeric id, but it is replaced by a stable, *role-keyed
negative* id (e.g. ``-1`` for every annotator, ``-2`` for every reviewer): negative
so it never collides with a real (positive, auto-increment) user id, and shared
across every user of the same role so anonymized users are intentionally
indistinguishable. Keeping a numeric id means the frontend treats a hidden user
exactly like any other user (no special id-less handling required).

This module provides the LSO (open source) default, which is a no-op: the firewall
is never active and all anonymization helpers are identity functions. LSE swaps in
an enterprise implementation via ``settings.ANNOTATOR_REVIEWER_FIREWALL``.

Enterprise implementations should subclass :class:`AnnotatorReviewerFirewall` and
override :meth:`is_active`, :meth:`role_label`, :meth:`anonymized_user_id`, and
(optionally) :meth:`anonymize_user_data`.
"""


class AnnotatorReviewerFirewall:
    """No-op firewall. Never anonymizes anything."""

    @classmethod
    def is_active(cls, requester) -> bool:
        """Whether the firewall is active for ``requester`` (the user making the request)."""
        return False

    @classmethod
    def should_anonymize(cls, user, requester) -> bool:
        """Whether ``user`` must be hidden from ``requester``.

        Other users are anonymized only when the firewall is active and ``user``
        is not the requester themselves.
        """
        if user is None:
            return False
        return cls.should_anonymize_user_id(getattr(user, 'id', None), requester)

    @classmethod
    def should_anonymize_user_id(cls, user_id, requester) -> bool:
        """Like :meth:`should_anonymize`, but for callers that only have a bare user
        id (e.g. a ``PrimaryKeyRelatedField``) rather than the full user object."""
        if requester is None or user_id is None:
            return False
        if not cls.is_active(requester):
            return False
        return user_id != getattr(requester, 'id', None)

    @classmethod
    def role_label(cls, user, requester) -> str:
        """Human-readable role label shown in place of a hidden user's name."""
        return ''

    @classmethod
    def anonymized_user_id(cls, user, requester) -> int | None:
        """Stable, role-keyed id to expose for a hidden user.

        Enterprise implementations return a negative id derived from the user's
        role so anonymized users keep a numeric id without leaking their real one
        (and collapse together per role). The no-op default returns the real id.
        """
        return getattr(user, 'id', None)

    @classmethod
    def anonymize_user_data(cls, data: dict, user, requester) -> dict:
        """Replace a serialized user dict with a role-labelled, role-keyed-id stub."""
        return data

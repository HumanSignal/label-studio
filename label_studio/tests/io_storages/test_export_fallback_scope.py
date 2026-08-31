"""Export-storage resolution is scoped to the project's own collection folder.

Storage matching is bucket-wide, and export targets are routinely shared across
an organization, so a client-supplied `fileuri` naming the bucket must not be
enough to read arbitrary keys out of it.
"""

from types import SimpleNamespace
from unittest.mock import patch

from io_storages.functions import resolve_own_collection_export_storage
from io_storages.utils import is_own_collection_key


def test_own_collection_keys_are_recognised():
    assert is_own_collection_key('collection/org-7/project-42/submissions/task-1/user-2/a-clip.mp4', 7, 42)
    assert is_own_collection_key('collection/org-7/project-42/approved/task-1-2-clip.mp4', 7, 42)
    # a configured connection prefix sits in front of the reserved folder
    assert is_own_collection_key('exports/collection/org-7/project-42/submissions/x.mp4', 7, 42)


def test_other_projects_and_loose_keys_are_rejected():
    # another project in the same organization — the shared-bucket case
    assert not is_own_collection_key('collection/org-7/project-43/submissions/task-1/user-2/a-clip.mp4', 7, 42)
    # another organization entirely
    assert not is_own_collection_key('collection/org-8/project-42/submissions/task-1/user-2/a-clip.mp4', 7, 42)
    # every other project's annotation JSON living in the same export target
    assert not is_own_collection_key('project-42/annotations/1.json', 7, 42)
    assert not is_own_collection_key('', 7, 42)
    # a project id that merely starts the same must not match
    assert not is_own_collection_key('collection/org-7/project-420/submissions/x.mp4', 7, 42)


def _project():
    return SimpleNamespace(id=42, organization_id=7, get_all_export_storage_objects=[object()])


def test_export_fallback_returns_storage_only_for_own_collection_keys():
    project = _project()
    storage = SimpleNamespace(bucket='shared-export')
    uri = SimpleNamespace(bucket='shared-export', path='collection/org-7/project-42/submissions/task-1/u.mp4')

    with (
        patch('io_storages.functions.get_storage_by_url', return_value=storage),
        patch('io_storages.utils.parse_bucket_uri', return_value=uri),
    ):
        assert resolve_own_collection_export_storage('s3://shared-export/' + uri.path, project) is storage


def test_export_fallback_refuses_a_key_outside_the_project():
    """The escalation this guards: a task viewer crafting a URI for someone
    else's exported data in the same bucket."""
    project = _project()
    storage = SimpleNamespace(bucket='shared-export')
    uri = SimpleNamespace(bucket='shared-export', path='project-99/annotations/secret.json')

    with (
        patch('io_storages.functions.get_storage_by_url', return_value=storage),
        patch('io_storages.utils.parse_bucket_uri', return_value=uri),
    ):
        assert resolve_own_collection_export_storage('s3://shared-export/' + uri.path, project) is None


def test_export_fallback_ignores_non_string_uris():
    assert resolve_own_collection_export_storage({'not': 'a string'}, _project()) is None

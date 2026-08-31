"""Tests for edge cases where storage POST 201 succeeds but storage is not displayed in list.

These tests reproduce the scenario described in TRIAG-2148: a source cloud storage
connection is created successfully (POST 201), but it does not appear in the storage
list for the project afterward.

Production root cause:
  A storage stuck in status='queued' with last_sync_job=None causes
  job_health_check() to call Job.fetch(None, ...), which raises TypeError
  inside rq's parse_job_id(). The except clause only catches NoSuchJobError,
  so the TypeError propagates up through ensure_storage_statuses() and crashes
  the entire list endpoint. AllImportStorageListAPI._get_response() silently
  catches the exception and returns [], so the UI shows no error — ALL storages
  of that type simply disappear.

Additional defensive edge cases tested:
  - meta=None (allowed by DB schema) crashes health_check()
  - Invalid time_last_ping in meta crashes health_check()
"""

import json
from unittest.mock import patch

import pytest
from io_storages.models import S3ImportStorage
from tests.utils import make_project


@pytest.mark.django_db
class TestStorageCreateThenListEdgeCases:
    """Verify that a storage created via POST is visible in GET list for the same project."""

    def _create_s3_storage(self, client, project_id, bucket='pytest-s3-images', title='Test Storage'):
        """Helper to create an S3 import storage via API."""
        data = {
            'project': project_id,
            'title': title,
            'bucket': bucket,
            'presign': True,
            'presign_ttl': 15,
        }
        response = client.post(
            '/api/storages/s3/',
            data=json.dumps(data),
            content_type='application/json',
        )
        return response

    def _list_s3_storages(self, client, project_id):
        """Helper to list S3 import storages for a project."""
        return client.get(f'/api/storages/s3/?project={project_id}')

    def _list_all_storages(self, client, project_id):
        """Helper to list all import storages for a project."""
        return client.get(f'/api/storages/?project={project_id}')

    # ── Happy path ──────────────────────────────────────────────────────

    def test_created_storage_visible_in_type_specific_list(self, business_client):
        """After POST 201 to /api/storages/s3/, the storage must appear in GET list."""
        project = make_project({}, business_client.user, use_ml_backend=False)

        create_resp = self._create_s3_storage(business_client, project.id)
        assert create_resp.status_code == 201, f'Create failed: {create_resp.content}'
        created_id = create_resp.json()['id']

        list_resp = self._list_s3_storages(business_client, project.id)
        assert list_resp.status_code == 200
        storage_ids = [s['id'] for s in list_resp.json()]
        assert created_id in storage_ids, (
            f'Storage {created_id} created with 201 but not found in list. List returned: {list_resp.json()}'
        )

    def test_created_storage_visible_in_all_storages_list(self, business_client):
        """After POST 201, storage must appear in GET /api/storages/ (all types)."""
        project = make_project({}, business_client.user, use_ml_backend=False)

        create_resp = self._create_s3_storage(business_client, project.id)
        assert create_resp.status_code == 201
        created_id = create_resp.json()['id']

        list_resp = self._list_all_storages(business_client, project.id)
        assert list_resp.status_code == 200
        storage_ids = [s['id'] for s in list_resp.json()]
        assert created_id in storage_ids, f'Storage {created_id} created with 201 but missing from all-storages list.'

    # ── Production scenario (TRIAG-2148 exact reproduction) ─────────────

    def test_list_survives_queued_storage_with_null_last_sync_job(self, business_client):
        """Exact TRIAG-2148 production scenario: storage stuck in status='queued'
        with last_sync_job=None crashes job_health_check() when Redis is connected.

        Production data (project 226976, storage 30632):
            status='queued', last_sync_job=None, meta={'attempts': 340, ...}

        Crash path:
            health_check() → redis_connected()=True → job_health_check()
            → Job.fetch(None, ...) → parse_job_id(None) → ':' in None
            → TypeError (not caught by except NoSuchJobError)
            → ensure_storage_statuses crashes → list returns 500 or empty
        """
        project = make_project({}, business_client.user, use_ml_backend=False)

        create_resp = self._create_s3_storage(business_client, project.id, title='Good Storage')
        assert create_resp.status_code == 201
        good_storage_id = create_resp.json()['id']

        # Reproduce the exact production state: queued with null job ID
        S3ImportStorage.objects.create(
            project=project,
            title='Stuck queued storage',
            bucket='pytest-s3-images',
            status='queued',
            last_sync_job=None,
            meta={'attempts': 340, 'time_queued': '2026-02-27 17:53:59.426492+00:00'},
        )

        with patch('io_storages.base_models.redis_connected', return_value=True):
            list_resp = self._list_s3_storages(business_client, project.id)

        assert list_resp.status_code == 200, (
            f'List endpoint failed with status {list_resp.status_code} when a storage '
            f'is stuck in queued with last_sync_job=None (TRIAG-2148 production scenario). '
            f'Response: {list_resp.content}'
        )
        storage_ids = [s['id'] for s in list_resp.json()]
        assert good_storage_id in storage_ids, (
            f'Good storage {good_storage_id} disappeared from list because another '
            f'storage has status=queued with last_sync_job=None. '
            f'job_health_check() calls Job.fetch(None) which raises TypeError. '
            f'This is the exact TRIAG-2148 production crash.'
        )

    def test_job_health_check_with_null_last_sync_job(self, business_client):
        """job_health_check() should handle last_sync_job=None gracefully.

        Production crash: Job.fetch(None, ...) → parse_job_id(None)
        → ':' in None → TypeError, not caught by except NoSuchJobError.
        """
        project = make_project({}, business_client.user, use_ml_backend=False)

        storage = S3ImportStorage.objects.create(
            project=project,
            title='Queued storage',
            bucket='pytest-s3-images',
            status='queued',
            last_sync_job=None,
            meta={'attempts': 340, 'time_queued': '2026-02-27 17:53:59.426492+00:00'},
        )
        storage.refresh_from_db()

        try:
            with patch('io_storages.base_models.redis_connected', return_value=True):
                storage.health_check()
        except TypeError as exc:
            pytest.fail(
                f'health_check() raised TypeError: {exc} when last_sync_job=None '
                f'and status=queued. job_health_check() passes Job.fetch(None) which '
                f'crashes in rq parse_job_id(). This is the exact TRIAG-2148 production crash.'
            )

    def test_all_storages_list_with_queued_null_job_storage(self, business_client):
        """AllImportStorageListAPI silently drops entire storage type when
        job_health_check crashes on a queued storage with null job ID.

        _get_response catches all exceptions and returns []. The user sees
        no error, but ALL storages of that type disappear from the list.
        """
        project = make_project({}, business_client.user, use_ml_backend=False)

        create_resp = self._create_s3_storage(business_client, project.id, title='Visible Storage')
        assert create_resp.status_code == 201
        created_id = create_resp.json()['id']

        S3ImportStorage.objects.create(
            project=project,
            title='Stuck queued storage',
            bucket='pytest-s3-images',
            status='queued',
            last_sync_job=None,
            meta={'attempts': 340, 'time_queued': '2026-02-27 17:53:59.426492+00:00'},
        )

        with patch('io_storages.base_models.redis_connected', return_value=True):
            list_resp = self._list_all_storages(business_client, project.id)

        assert list_resp.status_code == 200
        storage_ids = [s['id'] for s in list_resp.json()]
        assert created_id in storage_ids, (
            f'Storage {created_id} was silently dropped from the all-storages list. '
            f'_get_response caught the TypeError from job_health_check(None) and returned []. '
            f'The UI shows no error but ALL S3 storages are invisible. '
            f'This is the exact TRIAG-2148 production bug.'
        )

    def test_list_after_create_with_existing_queued_null_job_storage(self, business_client):
        """End-to-end TRIAG-2148 reproduction:
        1. Project has an old storage stuck in queued with last_sync_job=None
        2. User creates a new storage via UI (POST 201 succeeds)
        3. UI calls GET list → crashes internally → returns empty
        4. User sees no storages even though creation succeeded
        """
        project = make_project({}, business_client.user, use_ml_backend=False)

        # Old storage from prior API import, stuck in queued (340 attempts, no job)
        old_storage = S3ImportStorage.objects.create(
            project=project,
            title='Old API-created storage',
            bucket='pytest-s3-images',
            status='queued',
            last_sync_job=None,
            meta={'attempts': 340, 'time_queued': '2026-02-27 17:53:59.426492+00:00'},
        )

        # User creates a new storage via UI — succeeds
        create_resp = self._create_s3_storage(business_client, project.id, title='New UI Storage')
        assert create_resp.status_code == 201
        new_storage_id = create_resp.json()['id']

        # UI fetches the list — should show the new storage
        with patch('io_storages.base_models.redis_connected', return_value=True):
            list_resp = self._list_s3_storages(business_client, project.id)

        assert list_resp.status_code == 200, (
            f'List endpoint crashed because old storage (id={old_storage.id}) is stuck in '
            f'queued with last_sync_job=None. Response: {list_resp.content}'
        )
        storage_ids = [s['id'] for s in list_resp.json()]
        assert new_storage_id in storage_ids, (
            f'Newly created storage {new_storage_id} is invisible because old storage '
            f'(id={old_storage.id}) has status=queued, last_sync_job=None. '
            f'job_health_check(None) raises TypeError → list crashes. TRIAG-2148.'
        )

    def test_ensure_storage_statuses_handles_queued_null_job(self, business_client):
        """ensure_storage_statuses must not propagate TypeError when a storage
        is queued with last_sync_job=None and Redis is connected.
        """
        project = make_project({}, business_client.user, use_ml_backend=False)

        S3ImportStorage.objects.create(
            project=project,
            title='Good storage',
            bucket='pytest-s3-images',
            meta={},
        )
        bad_storage = S3ImportStorage.objects.create(
            project=project,
            title='Stuck queued storage',
            bucket='pytest-s3-images',
            status='queued',
            last_sync_job=None,
            meta={'attempts': 340, 'time_queued': '2026-02-27 17:53:59.426492+00:00'},
        )

        storages = S3ImportStorage.objects.filter(project=project)

        try:
            with patch('io_storages.base_models.redis_connected', return_value=True):
                S3ImportStorage.ensure_storage_statuses(storages)
        except TypeError as exc:
            pytest.fail(
                f'ensure_storage_statuses raised TypeError: {exc} '
                f'due to storage id={bad_storage.id} having status=queued with '
                f'last_sync_job=None. job_health_check passes None to Job.fetch(). TRIAG-2148.'
            )

    # ── Defensive edge cases (meta corruption) ─────────────────────────

    def test_list_survives_storage_with_null_meta(self, business_client):
        """A storage with meta=None should not crash the list endpoint.

        The DB schema allows meta=null. If a storage record has meta=None,
        health_check() calls self.meta.get(...) which raises AttributeError.
        """
        project = make_project({}, business_client.user, use_ml_backend=False)

        create_resp = self._create_s3_storage(business_client, project.id, title='Good Storage')
        assert create_resp.status_code == 201
        good_storage_id = create_resp.json()['id']

        create_resp2 = self._create_s3_storage(business_client, project.id, title='Bad Meta Storage')
        assert create_resp2.status_code == 201
        bad_storage_id = create_resp2.json()['id']

        S3ImportStorage.objects.filter(id=bad_storage_id).update(meta=None)

        list_resp = self._list_s3_storages(business_client, project.id)
        assert list_resp.status_code == 200, (
            f'List endpoint failed with status {list_resp.status_code} '
            f'when a storage has meta=None. Response: {list_resp.content}'
        )
        storage_ids = [s['id'] for s in list_resp.json()]
        assert good_storage_id in storage_ids, (
            f'Good storage {good_storage_id} disappeared from list because another '
            f'storage has meta=None. This is a TRIAG-2148 variant.'
        )

    def test_list_survives_storage_with_corrupt_meta_time(self, business_client):
        """A storage with invalid time_last_ping in meta should not crash the list.

        health_check() calls datetime.fromisoformat(self.meta.get('time_last_ping', ...))
        which can fail if time_last_ping is an invalid datetime string.
        """
        project = make_project({}, business_client.user, use_ml_backend=False)

        create_resp = self._create_s3_storage(business_client, project.id, title='Good Storage')
        assert create_resp.status_code == 201
        good_storage_id = create_resp.json()['id']

        create_resp2 = self._create_s3_storage(business_client, project.id, title='Corrupt Time Storage')
        assert create_resp2.status_code == 201
        bad_storage_id = create_resp2.json()['id']

        S3ImportStorage.objects.filter(id=bad_storage_id).update(
            meta={'time_last_ping': 'not-a-valid-datetime'},
            status='in_progress',
        )

        list_resp = self._list_s3_storages(business_client, project.id)
        assert list_resp.status_code == 200, (
            f'List endpoint failed with status {list_resp.status_code} '
            f'when a storage has corrupt time_last_ping. Response: {list_resp.content}'
        )
        storage_ids = [s['id'] for s in list_resp.json()]
        assert good_storage_id in storage_ids, (
            f'Good storage {good_storage_id} disappeared from list because another '
            f'storage has corrupt meta. This is a TRIAG-2148 variant.'
        )

    def test_all_storages_list_survives_backend_exception_from_null_meta(self, business_client):
        """AllImportStorageListAPI must not silently drop storages when a backend
        errors due to meta=None.
        """
        project = make_project({}, business_client.user, use_ml_backend=False)

        create_resp = self._create_s3_storage(business_client, project.id)
        assert create_resp.status_code == 201
        created_id = create_resp.json()['id']

        S3ImportStorage.objects.filter(id=created_id).update(meta=None)

        list_resp = self._list_all_storages(business_client, project.id)
        assert list_resp.status_code == 200

        storage_ids = [s['id'] for s in list_resp.json()]
        assert created_id in storage_ids, (
            f'Storage {created_id} was silently dropped from the all-storages list '
            f'because _get_response caught the exception and returned []. '
            f'The UI shows no error but the storage is invisible. TRIAG-2148 variant.'
        )

    def test_list_after_create_with_existing_null_meta_storage(self, business_client):
        """New storage invisible when project has existing storage with meta=None."""
        project = make_project({}, business_client.user, use_ml_backend=False)

        old_storage = S3ImportStorage.objects.create(
            project=project,
            title='Old API-created storage',
            bucket='pytest-s3-images',
            meta=None,
        )

        create_resp = self._create_s3_storage(business_client, project.id, title='New UI Storage')
        assert create_resp.status_code == 201
        new_storage_id = create_resp.json()['id']

        list_resp = self._list_s3_storages(business_client, project.id)
        assert list_resp.status_code == 200, (
            f'List endpoint failed because project has a storage with meta=None. Response: {list_resp.content}'
        )
        storage_ids = [s['id'] for s in list_resp.json()]
        assert new_storage_id in storage_ids, (
            f'Newly created storage {new_storage_id} is invisible in the list because '
            f'an older storage (id={old_storage.id}) has meta=None, causing '
            f'ensure_storage_statuses to crash. TRIAG-2148 variant.'
        )

    def test_health_check_with_none_meta_does_not_raise(self, business_client):
        """health_check() should handle meta=None gracefully without raising."""
        project = make_project({}, business_client.user, use_ml_backend=False)

        storage = S3ImportStorage.objects.create(
            project=project,
            title='Test storage',
            bucket='pytest-s3-images',
            meta=None,
        )
        storage.refresh_from_db()

        try:
            storage.health_check()
        except (AttributeError, TypeError) as exc:
            pytest.fail(
                f'health_check() raised {type(exc).__name__}: {exc} when meta=None. '
                f'This causes ensure_storage_statuses to crash and the list endpoint '
                f'to return empty for the entire storage type. TRIAG-2148 variant.'
            )

    def test_ensure_storage_statuses_handles_null_meta_gracefully(self, business_client):
        """ensure_storage_statuses should not crash when one storage has meta=None."""
        project = make_project({}, business_client.user, use_ml_backend=False)

        S3ImportStorage.objects.create(
            project=project,
            title='Good storage',
            bucket='pytest-s3-images',
            meta={},
        )
        bad_storage = S3ImportStorage.objects.create(
            project=project,
            title='Bad storage',
            bucket='pytest-s3-images',
            meta=None,
        )

        storages = S3ImportStorage.objects.filter(project=project)

        try:
            S3ImportStorage.ensure_storage_statuses(storages)
        except (AttributeError, TypeError) as exc:
            pytest.fail(
                f'ensure_storage_statuses raised {type(exc).__name__}: {exc} '
                f'due to storage id={bad_storage.id} having meta=None. '
                f'This crashes the list endpoint. TRIAG-2148 variant.'
            )

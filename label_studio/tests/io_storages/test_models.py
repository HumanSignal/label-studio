import pytest

from io_storages.s3.models import S3ImportStorage


pytestmark = pytest.mark.django_db


class MockedJob:
    def __init__(self, method, *args, **kwargs) -> None:
        self.method = method
        self.kwargs = kwargs

    @property
    def id(self):
        return 1

    @property
    def func(self):
        return self.method


class LowQueue:
    def __init__(self) -> None:
        self.queue = []

    def get_jobs(self):
        return self.queue

    def enqueue(self, method, *args, **kwargs):
        job = MockedJob(method, *args, **kwargs)
        self.queue.append(job)

        return job


class TestImportStorage:
    @pytest.fixture
    def import_storage(self, configured_project):
        return S3ImportStorage.objects.create(project=configured_project)

    def test_sync_enqueue_one_job(self, mocker, import_storage):
        low_queue = LowQueue()

        mocker.patch("io_storages.base_models.redis_connected", return_value=True)
        mocker.patch("io_storages.base_models.django_rq.get_queue", return_value=low_queue)

        import_storage.sync()
        assert len(low_queue.get_jobs()) == 1
        assert low_queue.get_jobs()[0].func.__name__ == 'sync_background'

        import_storage.sync()
        assert len(low_queue.get_jobs()) == 1

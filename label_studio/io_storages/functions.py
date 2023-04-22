import logging
import django_rq
import rq.exceptions
from rq.job import Job

from .s3.api import S3ImportStorageListAPI, S3ExportStorageListAPI
from .gcs.api import GCSImportStorageListAPI, GCSExportStorageListAPI
from .azure_blob.api import AzureBlobImportStorageListAPI, AzureBlobExportStorageListAPI
from .redis.api import RedisImportStorageListAPI, RedisExportStorageListAPI
from label_studio.core.redis import redis_connected


logger = logging.getLogger(__name__)


def get_storage_list():
    return [
        {'name': 's3', 'title': 'AWS S3', 'import_list_api': S3ImportStorageListAPI, 'export_list_api': S3ExportStorageListAPI},
        {'name': 'gcs', 'title': 'Google Cloud Storage', 'import_list_api': GCSImportStorageListAPI, 'export_list_api': GCSExportStorageListAPI},
        {'name': 'azure', 'title': 'Microsoft Azure', 'import_list_api': AzureBlobImportStorageListAPI, 'export_list_api': AzureBlobExportStorageListAPI},
        {'name': 'redis', 'title': 'Redis', 'import_list_api': RedisImportStorageListAPI, 'export_list_api': RedisExportStorageListAPI}
    ]


def ensure_job_and_storage_status(storages):
    """ Check failed jobs and set storage status as failed if job is failed
    :param storages: Import or Export storages
    """
    # check redis connection
    if not redis_connected():
        return

    # iterate over all storages
    storages = storages.only('id', 'last_sync_job', 'status')
    for storage in storages:
        Status = storage.Status
        queue = django_rq.get_queue('low')
        try:
            job = Job.fetch(storage.last_sync_job, connection=queue.connection)
            status = job.get_status()
        except rq.exceptions.NoSuchJobError:
            status = 'not found'

        # broken synchronization between storage and job
        # this might happen when job was stopped because of OOM and on_failure wasn't called
        if status == 'failed' and storage.status != storage.Status.FAILED:
            storage.status = storage.Status.FAILED
            storage.traceback = "It appears the job was terminated unexpectedly, " \
                                "and no traceback information is available.\n" \
                                "This typically occurs due to an out-of-memory (OOM) error."
            storage.save(update_fields=['status', 'traceback'])
            logger.info(f'Storage {storage} status moved to `failed` '
                        f'because of the failed job {storage.last_sync_job}')

        # job is not found in redis (maybe deleted while redeploy), storage status is still active
        elif status == 'not found' and storage.status in [Status.IN_PROGRESS, Status.QUEUED]:
            storage.status = storage.Status.FAILED
            storage.traceback = "It appears the job was not found in redis, " \
                                "and no traceback information is available.\n" \
                                "This typically occurs if job was manually removed " \
                                "or workers reloaded unexpectedly"
            storage.save(update_fields=['status', 'traceback'])
            logger.info(f'Storage {storage} status moved to `failed` '
                        f'because the job {storage.last_sync_job} was not found')

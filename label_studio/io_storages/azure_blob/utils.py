import fnmatch
import logging
import re
import types

from azure.storage.blob import BlobServiceClient
from core.utils.params import get_env
from django.conf import settings
from io_storages.utils import parse_range

logger = logging.getLogger(__name__)


class AZURE(object):
    @staticmethod
    def download_stream_response(blob_client, total_size, content_type, range_header, properties, max_range_size=None):
        """Prepare Azure blob streaming response with unified range handling.

        Shared Azure Blob streaming helper used by both OSS Azure Blob and Enterprise Azure SPI providers.

        Responsibilities:
        - Parse and normalize HTTP Range requests (including special probes)
        - Configure Azure SDK streaming parameters
        - Generate a downloader with a unified ``iter_chunks`` API
        - Build response metadata (Content-Range, Content-Length, ETag, Last-Modified)

        Args:
            blob_client: Azure Blob SDK client for the target blob.
            total_size (int): Size of the blob in bytes.
            content_type (str|None): Blob content type.
            range_header (str|None): Incoming HTTP Range header, e.g. 'bytes=0-'.
            properties: Blob properties (for ETag/Last-Modified extraction).
            max_range_size (int|None): Optional override for initial open-ended range size.

        Returns:
            tuple: (downloader, resolved_content_type, metadata)
        """
        resolved_content_type = content_type or 'application/octet-stream'

        streaming = True
        start, end = parse_range(range_header)

        if start is None and end is None:
            streaming = False
            start, end = 0, total_size
        elif start == 0 and end == 0:
            start, end = 0, 1
        elif start == 0 and (end == '' or end is None):
            mr = max_range_size if max_range_size is not None else settings.RESOLVER_PROXY_MAX_RANGE_SIZE
            end = start + mr

        if start is None:
            start = 0

        try:
            blob_client._config.max_single_get_size = 1024  # 1KB
        except Exception:
            pass

        if end is not None and end != '':
            length = end - start
        else:
            length = None

        if streaming:
            downloader = blob_client.download_blob(offset=start, length=length)
        else:
            length = total_size
            downloader = blob_client.download_blob()

        def _iter_chunks(self_downloader, chunk_size=1024 * 1024):
            try:
                self_downloader._config.max_chunk_get_size = chunk_size
            except Exception:
                pass
            total = 0
            for chunk in self_downloader.chunks():
                yield chunk
                total += len(chunk)
                if length is not None and total >= length:
                    return

        downloader.iter_chunks = types.MethodType(_iter_chunks, downloader)
        downloader.close = types.MethodType(lambda self: None, downloader)

        if streaming and length is not None:
            actual_length = min(length, max(0, total_size - start))
            content_length = actual_length
        else:
            content_length = length if length is not None else max(0, total_size - start)

        if length is not None:
            actual_end = min(start + length - 1, max(0, total_size - 1))
        else:
            actual_end = max(0, total_size - 1)

        status_code = 206 if streaming else 200

        metadata = {
            'ETag': getattr(properties, 'etag', ''),
            'ContentLength': content_length,
            'ContentRange': f'bytes {start}-{actual_end}/{total_size or 0}',
            'LastModified': getattr(properties, 'last_modified', None),
            'StatusCode': status_code,
        }

        return downloader, resolved_content_type, metadata

    @classmethod
    def get_client_and_container(cls, container, account_name=None, account_key=None):
        # get account name and key from params or from environment variables
        account_name = str(account_name) if account_name else get_env('AZURE_BLOB_ACCOUNT_NAME')
        account_key = str(account_key) if account_key else get_env('AZURE_BLOB_ACCOUNT_KEY')
        # check that both account name and key are set
        if not account_name or not account_key:
            raise ValueError(
                'Azure account name and key must be set using '
                'environment variables AZURE_BLOB_ACCOUNT_NAME and AZURE_BLOB_ACCOUNT_KEY'
            )
        connection_string = (
            'DefaultEndpointsProtocol=https;AccountName='
            + account_name
            + ';AccountKey='
            + account_key
            + ';EndpointSuffix=core.windows.net'
        )
        client = BlobServiceClient.from_connection_string(conn_str=connection_string)
        container = client.get_container_client(str(container))
        return client, container

    @classmethod
    def get_blob_metadata(cls, url: str, container: str, account_name: str = None, account_key: str = None) -> dict:
        """
        Get blob metadata by url
        :param url: Object key
        :param container: Azure container name
        :param account_name: Azure account name
        :param account_key: Azure account key
        :return: Object metadata dict("name": "value")
        """
        _, container = cls.get_client_and_container(container, account_name=account_name, account_key=account_key)
        blob = container.get_blob_client(url)
        return dict(blob.get_blob_properties())

    @classmethod
    def validate_pattern(cls, storage, pattern, glob_pattern=True):
        """
        Validate pattern against Azure Blob Storage
        :param storage: AzureBlobStorage instance
        :param pattern: Pattern to validate
        :param glob_pattern: If True, pattern is a glob pattern, otherwise it is a regex pattern
        :return: Message if pattern is not valid, empty string otherwise
        """
        logger.debug('Validating Azure Blob Storage pattern.')
        client, container = storage.get_client_and_container()
        if storage.prefix:
            generator = container.list_blob_names(
                name_starts_with=storage.prefix,
                results_per_page=settings.CLOUD_STORAGE_CHECK_FOR_RECORDS_PAGE_SIZE,
                timeout=settings.CLOUD_STORAGE_CHECK_FOR_RECORDS_TIMEOUT,
            )
        else:
            generator = container.list_blob_names(
                results_per_page=settings.CLOUD_STORAGE_CHECK_FOR_RECORDS_PAGE_SIZE,
                timeout=settings.CLOUD_STORAGE_CHECK_FOR_RECORDS_TIMEOUT,
            )
        # compile pattern to regex
        if glob_pattern:
            pattern = fnmatch.translate(pattern)
        regex = re.compile(str(pattern))
        # match pattern against all keys in the container
        for key in generator:
            # skip directories
            if key.endswith('/'):
                logger.debug(key + ' is skipped because it is a folder')
                continue
            if regex and regex.match(key):
                logger.debug(key + ' matches file pattern')
                return ''
        return 'No objects found matching the provided glob pattern'

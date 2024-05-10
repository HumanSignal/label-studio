import fnmatch
import logging
import re
from azure.storage.blob import BlobServiceClient
from core.utils.params import get_env
from django.conf import settings
from azure.identity import ClientSecretCredential

logger = logging.getLogger(__name__)


class AZURE(object):
    @classmethod
    def get_client_and_container(cls, container, account_name=None, account_key=None, account_client_secret=None, account_client_id=None,  account_tenant_id=None):
        # get account name and key from params or from environment variables
        account_name = str(account_name) if account_name else get_env('AZURE_BLOB_ACCOUNT_NAME')
        account_key = str(account_key) if account_key else get_env('AZURE_BLOB_ACCOUNT_KEY')
        account_client_id = str(account_client_id) if account_client_id else get_env('AZURE_CLIENT_ID')
        account_client_secret  = account_client_secret if account_client_secret else get_env('AZURE_CLIENT_SECRET')
        account_tenant_id  = account_tenant_id if account_tenant_id else get_env('AZURE_TENANT_ID')
        if (not account_name or not account_key) or (not account_name or not (account_client_secret and account_client_id and account_tenant_id)):
            raise ValueError(
                'Two authentications supported: '
                '1) Azure account name and key are set '
                'with environment variables AZURE_BLOB_ACCOUNT_NAME and AZURE_BLOB_ACCOUNT_KEY '
                'or account_name and account_key fields.'

                '2) Azure account serivce principle tenant, id, and secret are set '
                'with environment variables AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID'
                'or account_tenant_id, account_client_secret and account_client_id fields.'

            )
        if account_key:
            connection_string = (
                'DefaultEndpointsProtocol=https;AccountName='
                + account_name
                + ';AccountKey='
                + account_key
                + ';EndpointSuffix=core.windows.net'
            )
            client = BlobServiceClient.from_connection_string(conn_str=connection_string)
            container = client.get_container_client(str(container))
        elif account_client_secret:
            credential = ClientSecretCredential(
                tenant_id=account_tenant_id,
                client_id=account_client_id,
                client_secret=account_client_secret
            )
            client = BlobServiceClient(
                    account_url=f"https://{account_name}.blob.core.windows.net",
                    credential=credential)
            container = client.get_container_client(str(container))

        return client, container

    @classmethod
    def get_blob_metadata(cls, url: str, container: str, account_name=None, account_key=None, account_client_secret=None, account_client_id=None,  account_tenant_id=None) -> dict:
        """
        Get blob metadata by url
        :param url: Object key
        :param container: Azure container name
        :param account_name: Azure account name
        :param account_key: Azure account key
        :return: Object metadata dict("name": "value")
        """
        _, container = cls.get_client_and_container(container, account_name=account_name, account_key=account_key, account_client_secret=account_client_secret, account_client_id=account_client_id,  account_tenant_id=account_tenant_id)
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
        for index, key in enumerate(generator):
            # skip directories
            if key.endswith('/'):
                logger.debug(key + ' is skipped because it is a folder')
                continue
            if regex and regex.match(key):
                logger.debug(key + ' matches file pattern')
                return ''
        return 'No objects found matching the provided glob pattern'

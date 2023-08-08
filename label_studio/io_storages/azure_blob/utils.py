import logging

from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
from azure.core.exceptions import ResourceNotFoundError

from core.utils.params import get_env

logger = logging.getLogger(__name__)


class AZURE(object):
    @classmethod
    def get_client_and_container(cls, container, account_name=None, account_key=None):  # type: ignore[no-untyped-def]
        # get account name and key from params or from environment variables
        account_name = str(account_name) if account_name else get_env('AZURE_BLOB_ACCOUNT_NAME')  # type: ignore[no-untyped-call]
        account_key = str(account_key) if account_key else get_env('AZURE_BLOB_ACCOUNT_KEY')  # type: ignore[no-untyped-call]
        # check that both account name and key are set
        if not account_name or not account_key:
            raise ValueError('Azure account name and key must be set using '
                             'environment variables AZURE_BLOB_ACCOUNT_NAME and AZURE_BLOB_ACCOUNT_KEY')
        connection_string = "DefaultEndpointsProtocol=https;AccountName=" + account_name + \
                            ";AccountKey=" + account_key + ";EndpointSuffix=core.windows.net"
        client = BlobServiceClient.from_connection_string(conn_str=connection_string)
        container = client.get_container_client(str(container))
        return client, container

    @classmethod
    def get_blob_metadata(cls,
                          url: str,
                          container: str,
                          account_name: str = None,  # type: ignore[assignment]
                          account_key: str = None) -> dict:  # type: ignore[assignment, type-arg]
        """
        Get blob metadata by url
        :param url: Object key
        :param container: Azure container name
        :param account_name: Azure account name
        :param account_key: Azure account key
        :return: Object metadata dict("name": "value")
        """
        _, container = cls.get_client_and_container(container, account_name=account_name, account_key=account_key)  # type: ignore[no-untyped-call]
        blob = container.get_blob_client(url)  # type: ignore[attr-defined]
        return dict(blob.get_blob_properties())

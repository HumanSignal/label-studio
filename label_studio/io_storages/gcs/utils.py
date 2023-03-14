import re
import logging
import google.cloud.storage as gcs
import json
import base64
import google.auth

from enum import Enum
from urllib.parse import urlparse
from datetime import timedelta
from typing import Union
from google.oauth2 import service_account
from google.auth.exceptions import DefaultCredentialsError


logger = logging.getLogger(__name__)

Base64 = bytes


class GCS(object):
    _client_cache = {}
    _credentials_cache = {}
    DEFAULT_GOOGLE_PROJECT_ID = gcs.client._marker

    class ConvertBlobTo(Enum):
        NOTHING = 1
        JSON = 2
        JSON_DICT = 3
        BASE64 = 4

    @classmethod
    def get_client(
        cls,
        google_project_id: str = None,
        google_application_credentials: Union[str, dict] = None
    ) -> gcs.Client:
        """
        :param google_project_id:
        :param google_application_credentials:
        :return:
        """
        google_project_id = google_project_id or GCS.DEFAULT_GOOGLE_PROJECT_ID
        if google_application_credentials:
            cache_key = google_application_credentials
            if cache_key in GCS._client_cache:
                return GCS._client_cache[cache_key]
            if isinstance(google_application_credentials, str):
                google_application_credentials = json.loads(google_application_credentials)
            credentials = service_account.Credentials.from_service_account_info(google_application_credentials)
            client = gcs.Client(project=google_project_id, credentials=credentials)
            GCS._client_cache[cache_key] = client
            return client

        return gcs.Client(project=google_project_id)

    @classmethod
    def validate_connection(
        cls,
        bucket_name: str,
        google_project_id: str = None,
        google_application_credentials: Union[str, dict] = None
    ):
        logger.debug('Validating GCS connection')
        client = cls.get_client(
            google_application_credentials=google_application_credentials,
            google_project_id=google_project_id
        )
        logger.debug('Validating GCS bucket')
        client.get_bucket(bucket_name)

    @classmethod
    def iter_blobs(
        cls,
        client: gcs.Client,
        bucket_name: str,
        prefix: str = None,
        regex_filter: str = None,
        limit: int = None,
        return_key: bool = False
    ):
        """
        Iterate files on the bucket. Optionally return limited number of files that match provided extensions
        :param client: GCS Client obj
        :param bucket_name: bucket name
        :param prefix: bucket prefix
        :param regex_filter: RegEx filter
        :param limit: specify limit for max files
        :param return_key: return object key string instead of gcs.Blob object
        :return: Iterator object
        """
        total_read = 0
        blob_iter = client.list_blobs(bucket_name, prefix=prefix)
        prefix = str(prefix) if prefix else ''
        regex = re.compile(str(regex_filter)) if regex_filter else None
        for blob in blob_iter:
            # skip dir level
            if blob.name == (prefix.rstrip('/') + '/'):
                continue
            # check regex pattern filter
            if regex and not regex.match(blob.name):
                logger.debug(blob.name + ' is skipped by regex filter')
                continue
            if return_key:
                yield blob.name
            else:
                yield blob
            total_read += 1
            if limit and total_read == limit:
                break

    @classmethod
    def _get_signing_kwargs(cls, google_application_credentials):
        try:
            cache_key = google_application_credentials
            credentials = GCS._credentials_cache.get(cache_key)
            if credentials is None or credentials.expired:
                credentials, _ = google.auth.default(['https://www.googleapis.com/auth/cloud-platform'])
                auth_req = google.auth.transport.requests.Request()
                credentials.refresh(auth_req)
                GCS._credentials_cache[cache_key] = credentials
            out = {
                "service_account_email": credentials.service_account_email,
                "access_token": credentials.token,
                "credentials": credentials
            }
        except DefaultCredentialsError as exc:
            logger.error(f"Label studio couldn't load default GCS credentials from env. {exc}",
                         exc_info=True)
            out = {}
        return out

    @classmethod
    def generate_http_url(
        cls,
        url: str,
        google_application_credentials: Union[str, dict] = None,
        google_project_id: str = None,
        presign_ttl: int = 1
    ) -> str:
        """
        Gets gs:// like URI string and returns presigned https:// URL
        :param url: input URI
        :param google_application_credentials:
        :param google_project_id:
        :param presign_ttl: Presign TTL in minutes
        :return: Presigned URL string
        """
        r = urlparse(url, allow_fragments=False)
        bucket_name = r.netloc
        blob_name = r.path.lstrip('/')
        """Generates a v4 signed URL for downloading a blob.

        Note that this method requires a service account key file. You can not use
        this if you are using Application Default Credentials from Google Compute
        Engine or from the Google Cloud SDK.
        """
        # bucket_name = 'your-bucket-name'
        # blob_name = 'your-object-name'

        client = cls.get_client(
            google_application_credentials=google_application_credentials,
            google_project_id=google_project_id
        )
        bucket = client.get_bucket(bucket_name)
        blob = bucket.blob(blob_name)

        url = blob.generate_signed_url(
            version="v4",
            # This URL is valid for 15 minutes
            expiration=timedelta(minutes=presign_ttl),
            # Allow GET requests using this URL.
            method="GET",
            **cls._get_signing_kwargs(google_application_credentials)
        )

        logger.debug('Generated GCS signed url: ' + url)
        return url

    @classmethod
    def iter_images_base64(cls, client, bucket_name, max_files):
        for image in cls.iter_blobs(client, bucket_name, max_files):
            yield GCS.read_base64(image)

    @classmethod
    def iter_images_filename(cls, client, bucket_name, max_files):
        for image in cls.iter_blobs(client, bucket_name, max_files):
            yield image.name

    @classmethod
    def get_uri(cls, bucket_name, key):
        return f'gs://{bucket_name}/{key}'

    @classmethod
    def _try_read_json(cls, blob_str):
        try:
            data = json.loads(blob_str)
        except ValueError:
            logger.error(f"Can't parse JSON from {blob_str}")
            return
        return data

    @classmethod
    def read_file(
        cls,
        client: gcs.Client,
        bucket_name: str,
        key: str,
        convert_to: ConvertBlobTo = ConvertBlobTo.NOTHING
    ):
        bucket = client.get_bucket(bucket_name)
        blob = bucket.blob(key)
        blob_str = blob.download_as_bytes()
        if convert_to == cls.ConvertBlobTo.NOTHING:
            return blob_str
        elif convert_to == cls.ConvertBlobTo.JSON:
            return cls._try_read_json(blob_str)
        elif convert_to == cls.ConvertBlobTo.JSON_DICT:
            json_data = cls._try_read_json(blob_str)
            if not isinstance(json_data, dict):
                raise ValueError(
                    f"Error on key {key}: For {self.__class__.__name__} your JSON file must be a dictionary with one task.")  # noqa
            return json_data
        elif convert_to == cls.ConvertBlobTo.BASE64:
            return base64.b64encode(blob_str)

        return blob_str

    @classmethod
    def read_base64(cls, f: gcs.Blob) -> Base64:
        return base64.b64encode(f.download_as_bytes())
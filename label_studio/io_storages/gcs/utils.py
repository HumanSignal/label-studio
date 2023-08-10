import re
import logging
from json import JSONDecodeError

import json
import base64
import google.auth
import google.cloud.storage as gcs

from enum import Enum
from urllib.parse import urlparse
from datetime import timedelta
from typing import Union
from google.oauth2 import service_account
from google.auth.exceptions import DefaultCredentialsError
from django.conf import settings

logger = logging.getLogger(__name__)

Base64 = bytes


class GCS(object):
    _client_cache = {}
    _credentials_cache = None
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
        cache_key = google_application_credentials

        if cache_key not in GCS._client_cache:

            # use credentials from LS Cloud Storage settings
            if google_application_credentials:
                if isinstance(google_application_credentials, str):
                    try:
                        google_application_credentials = json.loads(google_application_credentials)
                    except JSONDecodeError as e:
                        # change JSON error to human-readable format
                        raise ValueError(f'Google Application Credentials must be valid JSON string. {e}')
                credentials = service_account.Credentials.from_service_account_info(google_application_credentials)
                GCS._client_cache[cache_key] = gcs.Client(project=google_project_id, credentials=credentials)

            # use Google Application Default Credentials (ADC)
            else:
                GCS._client_cache[cache_key] = gcs.Client(project=google_project_id)

        return GCS._client_cache[cache_key]

    @classmethod
    def validate_connection(
        cls,
        bucket_name: str,
        google_project_id: str = None,
        google_application_credentials: Union[str, dict] = None,
        prefix: str = None,
        use_glob_syntax: bool = False
    ):
        logger.debug('Validating GCS connection')
        client = cls.get_client(
            google_application_credentials=google_application_credentials,
            google_project_id=google_project_id
        )
        logger.debug('Validating GCS bucket')
        bucket = client.get_bucket(bucket_name)

        # Dataset storages uses glob syntax and we want to add explicit checks
        # In the future when GCS lib supports it
        if use_glob_syntax:
            pass
        else:
            if prefix:
                blobs = list(bucket.list_blobs(prefix=prefix, max_results=1))
                if not blobs:
                    raise ValueError(f"No blobs found in {bucket_name}/{prefix} or prefix doesn't exist")

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
    def _get_default_credentials(cls):
        """ Get default GCS credentials for LS Cloud Storages
        """
        # TODO: remove this func with fflag_fix_back_lsdv_4902_force_google_adc_16052023_short
        try:
            # check if GCS._credentials_cache is None, we don't want to try getting default credentials again
            credentials = GCS._credentials_cache.get('credentials') if GCS._credentials_cache else None
            if GCS._credentials_cache is None or (credentials and credentials.expired):
                # try to get credentials from the current environment
                credentials, _ = google.auth.default(['https://www.googleapis.com/auth/cloud-platform'])
                # apply & refresh credentials
                auth_req = google.auth.transport.requests.Request()
                credentials.refresh(auth_req)
                # set cache
                GCS._credentials_cache = {
                    "service_account_email": credentials.service_account_email,
                    "access_token": credentials.token,
                    "credentials": credentials
                }

        except DefaultCredentialsError as exc:
            logger.warning(
                f"Label studio could not load default GCS credentials from env. {exc}",
                exc_info=True
            )
            GCS._credentials_cache = {}

        return GCS._credentials_cache

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
        client = cls.get_client(
            google_application_credentials=google_application_credentials,
            google_project_id=google_project_id
        )
        bucket = client.get_bucket(bucket_name)
        blob = bucket.blob(blob_name)

        # this flag should be OFF, maybe we need to enable it for 1-2 customers, we have to check it
        if settings.GCS_CLOUD_STORAGE_FORCE_DEFAULT_CREDENTIALS:
            # google_application_credentials has higher priority,
            # use Application Default Credentials (ADC) when google_application_credentials is empty only
            kwargs = {} if google_application_credentials else cls._get_default_credentials()
        else:
            kwargs = {}

        url = blob.generate_signed_url(
            version="v4",
            # This URL is valid for 15 minutes
            expiration=timedelta(minutes=presign_ttl),
            # Allow GET requests using this URL.
            method="GET",
            **kwargs
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
                    f"Error on key {key}: For {cls.__name__} your JSON file must be a dictionary with one task.")  # noqa
            return json_data
        elif convert_to == cls.ConvertBlobTo.BASE64:
            return base64.b64encode(blob_str)

        return blob_str

    @classmethod
    def read_base64(cls, f: gcs.Blob) -> Base64:
        return base64.b64encode(f.download_as_bytes())

    @classmethod
    def get_blob_metadata(cls,
                          url: str,
                          google_application_credentials: Union[str, dict] = None,
                          google_project_id: str = None,
                          properties_name: list = []) -> dict:
        """
        Gets object metadata like size and updated date from GCS in dict format
        :param url: input URI
        :param google_application_credentials:
        :param google_project_id:
        :return: Object metadata dict("name": "value")
        """
        r = urlparse(url, allow_fragments=False)
        bucket_name = r.netloc
        blob_name = r.path.lstrip('/')

        client = cls.get_client(
            google_application_credentials=google_application_credentials,
            google_project_id=google_project_id
        )
        bucket = client.get_bucket(bucket_name)
        # Get blob instead of Blob() is used to make an http request and get metadata
        blob = bucket.get_blob(blob_name)
        if not properties_name:
            return blob._properties
        return {key: value for key, value in blob._properties.items() if key in properties_name}

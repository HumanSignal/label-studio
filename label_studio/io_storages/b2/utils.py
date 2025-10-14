"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import base64
import fnmatch
import logging
import re
from typing import Optional, Tuple
from urllib.parse import urlparse

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError, EndpointConnectionError
from core.utils.params import get_env
from django.conf import settings
from tldextract import TLDExtract

logger = logging.getLogger(__name__)

# B2 Connection Configuration
B2_CONNECT_TIMEOUT = int(get_env('B2_CONNECT_TIMEOUT', 60))  # Connection timeout in seconds
B2_READ_TIMEOUT = int(get_env('B2_READ_TIMEOUT', 60))  # Read timeout in seconds
B2_MAX_RETRIES = int(get_env('B2_MAX_RETRIES', 3))  # Maximum number of retry attempts


def get_client_and_resource(
    b2_access_key_id: Optional[str] = None,
    b2_secret_access_key: Optional[str] = None,
    b2_endpoint_url: Optional[str] = None,
    region_name: Optional[str] = None,
) -> Tuple:
    """
    Create boto3 client and resource for Backblaze B2 Cloud Storage with production-ready configuration.
    
    B2 is S3-compatible, so we use boto3 with a custom endpoint URL.
    Includes timeout, retry, and connection pool configuration for reliability.
    
    Args:
        b2_access_key_id: B2 Application Key ID (equivalent to AWS access key)
        b2_secret_access_key: B2 Application Key (equivalent to AWS secret key)
        b2_endpoint_url: B2 endpoint URL (e.g., https://s3.us-west-004.backblazeb2.com)
        region_name: B2 region name (e.g., us-west-004)
    
    Returns:
        Tuple[boto3.client, boto3.resource]: Tuple of (boto3 S3 client, boto3 S3 resource)
    
    Raises:
        ValueError: If credentials or endpoint URL are missing
        EndpointConnectionError: If unable to connect to B2 endpoint
    """
    # Read from environment variables if not provided
    b2_access_key_id = b2_access_key_id or get_env('B2_ACCESS_KEY_ID')
    b2_secret_access_key = b2_secret_access_key or get_env('B2_SECRET_ACCESS_KEY')
    b2_endpoint_url = b2_endpoint_url or get_env('B2_ENDPOINT_URL')
    region_name = region_name or get_env('B2_REGION') or 'us-west-004'
    
    # Validate required credentials
    if not b2_access_key_id or not b2_secret_access_key:
        raise ValueError(
            'B2 credentials are required. Please provide B2_ACCESS_KEY_ID and B2_SECRET_ACCESS_KEY '
            'either as parameters or environment variables.'
        )
    
    logger.info(
        f'Initializing Backblaze B2 connection: '
        f'endpoint={b2_endpoint_url}, '
        f'region={region_name}, '
        f'key_id={b2_access_key_id[:10]}***'
    )
    
    # Create boto3 session with B2 credentials
    try:
        session = boto3.Session(
            aws_access_key_id=b2_access_key_id,
            aws_secret_access_key=b2_secret_access_key,
        )
    except Exception as e:
        logger.error(f'Failed to create boto3 session: {e}', exc_info=True)
        raise ValueError(f'Invalid B2 credentials: {e}') from e
    
    # B2 requires explicit endpoint URL
    if not b2_endpoint_url:
        # Default endpoint pattern for B2
        b2_endpoint_url = f'https://s3.{region_name}.backblazeb2.com'
        logger.warning(
            f'No B2 endpoint URL provided, using default: {b2_endpoint_url}. '
            'For production, set B2_ENDPOINT_URL environment variable.'
        )
    
    # Configure boto3 with timeout, retry, and connection pooling
    boto_config = Config(
        signature_version='s3v4',
        connect_timeout=B2_CONNECT_TIMEOUT,
        read_timeout=B2_READ_TIMEOUT,
        retries={
            'max_attempts': B2_MAX_RETRIES,
            'mode': 'adaptive',  # Adaptive retry mode for better resilience
        },
        max_pool_connections=50,  # Connection pooling for performance
    )
    
    settings_dict = {
        'region_name': region_name,
        'endpoint_url': b2_endpoint_url,
    }
    
    try:
        # Create S3-compatible client and resource for B2
        client = session.client('s3', config=boto_config, **settings_dict)
        resource = session.resource('s3', config=boto_config, **settings_dict)
        
        logger.info(
            f'B2 client created successfully with timeout={B2_CONNECT_TIMEOUT}s, '
            f'max_retries={B2_MAX_RETRIES}'
        )
        
        return client, resource
        
    except EndpointConnectionError as e:
        logger.error(
            f'Failed to connect to B2 endpoint {b2_endpoint_url}: {e}. '
            'Please verify the endpoint URL is correct and accessible.',
            exc_info=True
        )
        raise
    except Exception as e:
        logger.error(f'Unexpected error creating B2 client: {e}', exc_info=True)
        raise


def resolve_b2_url(url: str, client, presign: bool = True, expires_in: int = 3600) -> str:
    """
    Resolve B2 URL to either presigned URL or base64 encoded data.
    
    This function handles conversion of b2:// URLs to accessible HTTP(S) URLs or inline data.
    
    Args:
        url: The b2:// URL to resolve (e.g., "b2://my-bucket/path/to/file.jpg")
        client: boto3 S3 client for B2
        presign: If True, generate presigned URL; if False, return base64 data
        expires_in: Presigned URL expiration time in seconds (default: 3600 = 1 hour)
    
    Returns:
        str: Either a presigned HTTPS URL or base64-encoded data URL
    
    Raises:
        ClientError: If unable to access the object in B2
    """
    try:
        r = urlparse(url, allow_fragments=False)
        bucket_name = r.netloc
        key = r.path.lstrip('/')
        
        logger.debug(f'Resolving B2 URL: bucket={bucket_name}, key={key}, presign={presign}')

        # Return blob as base64 encoded string if presigned urls are disabled
        if not presign:
            logger.info(f'Fetching object from B2 for base64 encoding: {bucket_name}/{key}')
            obj = client.get_object(Bucket=bucket_name, Key=key)
            content_type = obj['ResponseMetadata']['HTTPHeaders'].get('content-type', 'application/octet-stream')
            object_data = obj['Body'].read()
            object_b64 = 'data:' + content_type + ';base64,' + base64.b64encode(object_data).decode('utf-8')
            logger.debug(f'Generated base64 data URL for {key} ({len(object_data)} bytes)')
            return object_b64

        # Otherwise try to generate presigned url
        try:
            presigned_url = client.generate_presigned_url(
                ClientMethod='get_object',
                Params={'Bucket': bucket_name, 'Key': key},
                ExpiresIn=expires_in
            )
            logger.info(f'Generated presigned URL for {bucket_name}/{key} (expires in {expires_in}s)')
            return presigned_url
        except ClientError as exc:
            logger.warning(
                f"Failed to generate presigned URL for B2 object {bucket_name}/{key}: {exc}. "
                "Returning original URL as fallback."
            )
            return url
            
    except Exception as e:
        logger.error(f'Error resolving B2 URL {url}: {e}', exc_info=True)
        return url  # Fallback to original URL


class B2(object):
    """Helper class for Backblaze B2 Cloud Storage operations."""
    
    @classmethod
    def get_blob_metadata(
        cls,
        url: str,
        bucket_name: str,
        client=None,
        b2_access_key_id=None,
        b2_secret_access_key=None,
        b2_endpoint_url=None,
        region_name=None,
    ):
        """
        Get blob metadata from B2 by URL.
        
        Args:
            url: Object key
            bucket_name: B2 bucket name
            client: B2 client for batch processing (optional)
            b2_access_key_id: B2 Application Key ID
            b2_secret_access_key: B2 Application Key
            b2_endpoint_url: B2 endpoint URL
            region_name: B2 region name
        
        Returns:
            Object metadata dict
        """
        if client is None:
            client, _ = get_client_and_resource(
                b2_access_key_id=b2_access_key_id,
                b2_secret_access_key=b2_secret_access_key,
                b2_endpoint_url=b2_endpoint_url,
                region_name=region_name,
            )
        obj = client.get_object(Bucket=bucket_name, Key=url)
        metadata = dict(obj)
        # remove unused fields
        metadata.pop('Body', None)
        metadata.pop('ResponseMetadata', None)
        return metadata

    @classmethod
    def validate_pattern(cls, storage, pattern, glob_pattern=True):
        """
        Validate pattern against B2 Storage.
        
        Args:
            storage: B2 Storage instance
            pattern: Pattern to validate
            glob_pattern: If True, pattern is a glob pattern, otherwise it is a regex pattern
        
        Returns:
            Message if pattern is not valid, empty string otherwise
        """
        client, bucket = storage.get_client_and_bucket()
        if glob_pattern:
            pattern = fnmatch.translate(pattern)
        regex = re.compile(pattern)

        if storage.prefix:
            list_kwargs = {'Prefix': storage.prefix.rstrip('/') + '/'}
            if not storage.recursive_scan:
                list_kwargs['Delimiter'] = '/'
            bucket_iter = bucket.objects.filter(**list_kwargs)
        else:
            bucket_iter = bucket.objects

        bucket_iter = bucket_iter.page_size(settings.CLOUD_STORAGE_CHECK_FOR_RECORDS_PAGE_SIZE).all()

        for index, obj in enumerate(bucket_iter):
            key = obj.key
            # skip directories
            if key.endswith('/'):
                logger.debug(key + ' is skipped because it is a folder')
                continue
            if regex and regex.match(key):
                logger.debug(key + ' matches file pattern')
                return ''
        return 'No objects found matching the provided glob pattern'


class B2StorageError(Exception):
    """Exception raised for B2 storage-specific errors."""
    pass


# see https://github.com/john-kurkowski/tldextract?tab=readme-ov-file#note-about-caching
# prevents network call on first use
extractor = TLDExtract(suffix_list_urls=())


def catch_and_reraise_from_none(func):
    """
    For B2 storages - if b2_endpoint_url is not on a known domain, catch exception and
    raise a new one with the previous context suppressed. See also: https://peps.python.org/pep-0409/
    
    This decorator is specifically designed for B2 Cloud Storage to handle errors gracefully
    when using custom endpoint URLs.
    """

    def wrapper(self, *args, **kwargs):
        try:
            return func(self, *args, **kwargs)
        except Exception as e:
            if self.b2_endpoint_url and (
                domain := extractor.extract_urllib(urlparse(self.b2_endpoint_url)).registered_domain.lower()
            ) not in [trusted_domain.lower() for trusted_domain in settings.B2_TRUSTED_STORAGE_DOMAINS]:
                logger.error(f'Exception from unrecognized B2 domain: {e}', exc_info=True)
                raise B2StorageError(
                    f'Debugging info is not available for B2 endpoints on domain: {domain}. '
                    'Please contact your Label Studio devops team if you require detailed error reporting for this domain.'
                ) from None
            else:
                raise e

    return wrapper


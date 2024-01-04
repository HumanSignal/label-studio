"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import base64
import fnmatch
import logging
import re
from urllib.parse import urlparse

import boto3
from botocore.exceptions import ClientError
from core.utils.params import get_env
from django.conf import settings

logger = logging.getLogger(__name__)


def get_client_and_resource(
    aws_access_key_id=None, aws_secret_access_key=None, aws_session_token=None, region_name=None, s3_endpoint=None
):
    aws_access_key_id = aws_access_key_id or get_env('AWS_ACCESS_KEY_ID')
    aws_secret_access_key = aws_secret_access_key or get_env('AWS_SECRET_ACCESS_KEY')
    aws_session_token = aws_session_token or get_env('AWS_SESSION_TOKEN')
    logger.debug(
        f'Create boto3 session with '
        f'access key id={aws_access_key_id}, '
        f'secret key={aws_secret_access_key[:4] + "..." if aws_secret_access_key else None}, '
        f'session token={aws_session_token}'
    )
    session = boto3.Session(
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        aws_session_token=aws_session_token,
    )
    settings = {'region_name': region_name or get_env('S3_region') or 'us-east-1'}
    s3_endpoint = s3_endpoint or get_env('S3_ENDPOINT')
    if s3_endpoint:
        settings['endpoint_url'] = s3_endpoint
    client = session.client('s3', config=boto3.session.Config(signature_version='s3v4'), **settings)
    resource = session.resource('s3', config=boto3.session.Config(signature_version='s3v4'), **settings)
    return client, resource


def resolve_s3_url(url, client, presign=True, expires_in=3600):
    r = urlparse(url, allow_fragments=False)
    bucket_name = r.netloc
    key = r.path.lstrip('/')

    # Return blob as base64 encoded string if presigned urls are disabled
    if not presign:
        object = client.get_object(Bucket=bucket_name, Key=key)
        content_type = object['ResponseMetadata']['HTTPHeaders']['content-type']
        object_b64 = 'data:' + content_type + ';base64,' + base64.b64encode(object['Body'].read()).decode('utf-8')
        return object_b64

    # Otherwise try to generate presigned url
    try:
        presigned_url = client.generate_presigned_url(
            ClientMethod='get_object', Params={'Bucket': bucket_name, 'Key': key}, ExpiresIn=expires_in
        )
    except ClientError as exc:
        logger.warning(f"Can't generate presigned URL. Reason: {exc}")
        return url
    else:
        logger.debug('Presigned URL {presigned_url} generated for {url}'.format(presigned_url=presigned_url, url=url))
        return presigned_url


class AWS(object):
    @classmethod
    def get_blob_metadata(
        cls,
        url: str,
        bucket_name: str,
        client=None,
        aws_access_key_id=None,
        aws_secret_access_key=None,
        aws_session_token=None,
        region_name=None,
        s3_endpoint=None,
    ):
        """
        Get blob metadata by url
        :param url: Object key
        :param bucket_name: AWS bucket name
        :param client: AWS client for batch processing
        :param account_key: Azure account key
        :return: Object metadata dict("name": "value")
        """
        if client is None:
            client, _ = get_client_and_resource(
                aws_access_key_id=aws_access_key_id,
                aws_secret_access_key=aws_secret_access_key,
                aws_session_token=aws_session_token,
                region_name=region_name,
                s3_endpoint=s3_endpoint,
            )
        object = client.get_object(Bucket=bucket_name, Key=url)
        metadata = dict(object)
        # remove unused fields
        metadata.pop('Body', None)
        metadata.pop('ResponseMetadata', None)
        return metadata

    @classmethod
    def validate_pattern(cls, storage, pattern, glob_pattern=True):
        """
        Validate pattern against S3 Storage
        :param storage: S3 Storage instance
        :param pattern: Pattern to validate
        :param glob_pattern: If True, pattern is a glob pattern, otherwise it is a regex pattern
        :return: Message if pattern is not valid, empty string otherwise
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

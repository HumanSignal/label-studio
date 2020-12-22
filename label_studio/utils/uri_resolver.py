import base64
import logging
import re
import socket
from datetime import datetime, timedelta
from urllib.parse import urlparse

import boto3
import google.auth
from botocore.exceptions import ClientError
from google.auth import compute_engine
from google.auth.transport import requests
from google.cloud import storage as gs

from label_studio.storage.s3 import get_client_and_resource

logger = logging.getLogger(__name__)

PRESIGNED_URL_TTL_MINUTES = 1


def resolve_task_data_uri(task, **kwargs):
    out = {}
    for key, data in task['data'].items():
        if not isinstance(data, str):
            out[key] = data
        elif data.startswith('s3://'):
            out[key] = resolve_s3(data, **kwargs)
        elif data.startswith('gs://'):
            out[key] = resolve_gs(data, **kwargs)
        # Can be simplified with := for python version >= 3.8
        elif _get_uri_via_regex(data):
            uri, storage = _get_uri_via_regex(data)
            logger.debug("Found matching storage uri in task data value: {uri}".format(uri=uri))
            if storage == "s3":
                out[key] = data.replace(uri, resolve_s3(uri, **kwargs))
            if storage == "gs":
                out[key] = data.replace(uri, resolve_gs(uri, **kwargs))
        else:
            out[key] = data
    task['data'] = out
    return task


def _get_uri_via_regex(data):
    uri_regex = r"[\s\'\"]?(?P<uri>(?P<storage>s3|gs)://([^/\s]+)/(.*?[^/\s]+/?[^\s\'\">]+))[\s\'\"]?"
    r_match = re.search(uri_regex, data)
    if r_match is None:
        logger.warning("{data} does not match uri regex {uri_regex}".format(data=data, uri_regex=uri_regex))
        return
    return r_match.group("uri"), r_match.group("storage")


def _get_s3_params_from_project(project):
    params = {}
    if not hasattr(project, 'source_storage'):
        return params
    storage = project.source_storage
    if hasattr(storage, 'aws_access_key_id'):
        params['aws_access_key_id'] = storage.aws_access_key_id
    if hasattr(storage, 'aws_secret_access_key'):
        params['aws_secret_access_key'] = storage.aws_secret_access_key
    if hasattr(storage, 'aws_session_token'):
        params['aws_session_token'] = storage.aws_session_token
    if hasattr(storage, 'region'):
        params['region'] = storage.region
    if hasattr(storage, 'presign'):
        params['presign'] = storage.presign
    return params


def resolve_s3(url, s3_client=None, **kwargs):
    r = urlparse(url, allow_fragments=False)
    bucket_name = r.netloc
    key = r.path.lstrip('/')
    if s3_client is None:
        if 'project' in kwargs:
            params = _get_s3_params_from_project(kwargs['project'])
        else:
            params = kwargs
        s3_client, _ = get_client_and_resource(**params)

    presign = True
    if 'project' in kwargs:
        params = _get_s3_params_from_project(kwargs['project'])
        if 'presign' in params:
            presign = params['presign']

    # Return blob as base64 encoded string if presigned urls are disabled
    if not presign:
        object = s3_client.get_object(Bucket=bucket_name, Key=key)
        content_type = object['ResponseMetadata']['HTTPHeaders']['content-type']
        object_b64 = "data:" + content_type + ";base64," + base64.b64encode(object['Body'].read()).decode('utf-8')
        return object_b64

    # Otherwise try to generate presigned url
    try:
        presigned_url = s3_client.generate_presigned_url(
            ClientMethod='get_object',
            Params={'Bucket': bucket_name, 'Key': key}
        )
    except ClientError as exc:
        logger.warning('Can\'t generate presigned URL for {url}'.format(url=url))
        return url
    else:
        logger.debug('Presigned URL {presigned_url} generated for {url}'.format(
            presigned_url=presigned_url, url=url))
        return presigned_url


def resolve_gs(url, **kwargs):
    r = urlparse(url, allow_fragments=False)
    bucket_name = r.netloc
    key = r.path.lstrip('/')
    if is_gce_instance():
        logger.debug('Generate signed URL for GCE instance')
        return python_cloud_function_get_signed_url(bucket_name, key)
    else:
        logger.debug('Generate signed URL for local instance')
        return generate_download_signed_url_v4(bucket_name, key)


def is_gce_instance():
    """Check if it's GCE instance via DNS lookup to metadata server"""
    try:
      socket.getaddrinfo('metadata.google.internal', 80)
    except socket.gaierror:
      return False
    return True


def generate_download_signed_url_v4(bucket_name, blob_name):
    """Generates a v4 signed URL for downloading a blob.

    Note that this method requires a service account key file. You can not use
    this if you are using Application Default Credentials from Google Compute
    Engine or from the Google Cloud SDK.
    """
    # bucket_name = 'your-bucket-name'
    # blob_name = 'your-object-name'

    storage_client = gs.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_name)

    url = blob.generate_signed_url(
        version="v4",
        # This URL is valid for 15 minutes
        expiration=timedelta(minutes=PRESIGNED_URL_TTL_MINUTES),
        # Allow GET requests using this URL.
        method="GET",
    )

    logger.debug('Generated GCS signed url: ' + url)
    return url


def python_cloud_function_get_signed_url(bucket_name, blob_name):
    # https://gist.github.com/jezhumble/91051485db4462add82045ef9ac2a0ec
    # Copyright 2019 Google LLC.
    # SPDX-License-Identifier: Apache-2.0
    # This snippet shows you how to use Blob.generate_signed_url() from within compute engine / cloud functions
    # as described here: https://cloud.google.com/functions/docs/writing/http#uploading_files_via_cloud_storage
    # (without needing access to a private key)
    # Note: as described in that page, you need to run your function with a service account
    # with the permission roles/iam.serviceAccountTokenCreator
    auth_request = requests.Request()
    credentials, project = google.auth.default()
    storage_client = gs.Client(project, credentials)
    data_bucket = storage_client.lookup_bucket(bucket_name)
    signed_blob_path = data_bucket.blob(blob_name)
    expires_at_ms = datetime.now() + timedelta(minutes=PRESIGNED_URL_TTL_MINUTES)
    # This next line is the trick!
    signing_credentials = compute_engine.IDTokenCredentials(auth_request, "", service_account_email=credentials.service_account_email)
    signed_url = signed_blob_path.generate_signed_url(expires_at_ms, credentials=signing_credentials, version="v4")
    return signed_url

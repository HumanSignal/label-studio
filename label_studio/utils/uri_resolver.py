import boto3
import logging
import datetime


from botocore.exceptions import ClientError
from urllib.parse import urlparse
from google.cloud import storage as gs


logger = logging.getLogger(__name__)


def resolve_task_data_uri(task, **kwargs):
    out = {}
    for key, data in task['data'].items():
        if not isinstance(data, str):
            out[key] = data
        elif data.startswith('s3://'):
            out[key] = resolve_s3(data, **kwargs)
        elif data.startswith('gs://'):
            out[key] = resolve_gs(data, **kwargs)
        else:
            out[key] = data
    task['data'] = out
    return task


def resolve_s3(url, s3_client=None, **kwargs):
    r = urlparse(url, allow_fragments=False)
    bucket_name = r.netloc
    key = r.path.lstrip('/')
    if s3_client is None:
        s3_client = boto3.client('s3')
    try:
        presigned_url = s3_client.generate_presigned_url(
            ClientMethod='get_object',
            Params={'Bucket': bucket_name, 'Key': key}
        )
    except ClientError as exc:
        logger.warning('Can\'t generate presigned URL from ' + url)
        return url
    else:
        logger.debug('Presigned URL {presigned_url} generated for {url}'.format(
            presigned_url=presigned_url, url=url))
        return presigned_url


def resolve_gs(url, **kwargs):
    r = urlparse(url, allow_fragments=False)
    bucket_name = r.netloc
    key = r.path.lstrip('/')
    return generate_download_signed_url_v4(bucket_name, key)


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
        expiration=datetime.timedelta(minutes=15),
        # Allow GET requests using this URL.
        method="GET",
    )

    logger.debug('Generated GCS signed url: ' + url)
    return url
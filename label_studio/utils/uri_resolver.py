import boto3
import logging


from botocore.exceptions import ClientError
from urllib.parse import urlparse


logger = logging.getLogger(__name__)


def resolve_task_data_uri(task):
    out = {}
    for key, data in task['data'].items():
        if not isinstance(data, str):
            out[key] = data
        elif data.startswith('s3://'):
            out[key] = resolve_s3(data)
        else:
            out[key] = data
    task['data'] = out
    return task


def resolve_s3(url):
    r = urlparse(url, allow_fragments=False)
    bucket_name = r.netloc
    key = r.path.lstrip('/')
    client = boto3.client('s3')
    try:
        presigned_url = client.generate_presigned_url(
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

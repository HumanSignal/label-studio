"""Tests for the S3 client user agent.

Verifies get_client_and_resource attaches a label-studio user agent to both the
client and resource while preserving signature_version and a custom endpoint_url
(the path used for Amazon S3 and any S3-compatible object store such as
Backblaze B2, Cloudflare R2, or MinIO).
"""

import unittest

from io_storages.s3.utils import _get_user_agent_extra, get_client_and_resource


class TestS3ClientUserAgent(unittest.TestCase):
    def test_user_agent_extra_format(self):
        ua = _get_user_agent_extra()
        assert ua.startswith('label-studio/')

    def test_client_and_resource_carry_user_agent(self):
        client, resource = get_client_and_resource()
        expected = _get_user_agent_extra()
        assert expected in (client.meta.config.user_agent_extra or '')
        assert expected in (resource.meta.client.meta.config.user_agent_extra or '')

    def test_signature_version_preserved(self):
        client, _ = get_client_and_resource()
        assert client.meta.config.signature_version == 's3v4'

    def test_custom_endpoint_preserved(self):
        endpoint = 'https://your-s3-endpoint.example.com'
        client, resource = get_client_and_resource(s3_endpoint=endpoint)
        assert client.meta.endpoint_url == endpoint
        assert resource.meta.client.meta.endpoint_url == endpoint
        assert _get_user_agent_extra() in (client.meta.config.user_agent_extra or '')

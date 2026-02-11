"""Tests for resolve_s3_url content type handling.

Verifies that presigned URLs include ResponseContentType based on file extension,
so S3 returns the correct MIME type even if objects were uploaded without one.
"""
import unittest
from unittest.mock import MagicMock

from io_storages.s3.utils import resolve_s3_url


class TestResolveS3UrlContentType(unittest.TestCase):
    """Test that resolve_s3_url adds ResponseContentType to presigned URL params."""

    def setUp(self):
        self.mock_client = MagicMock()
        self.mock_client.generate_presigned_url.return_value = 'https://bucket.s3.amazonaws.com/presigned'

    def test_jpeg_gets_response_content_type(self):
        """Presigned URL for .jpg should include ResponseContentType=image/jpeg"""
        resolve_s3_url('s3://bucket/path/image.jpg', self.mock_client, presign=True)

        call_args = self.mock_client.generate_presigned_url.call_args
        params = (
            call_args[1]['Params']
            if 'Params' in call_args[1]
            else call_args[0][1]
            if len(call_args[0]) > 1
            else call_args[1].get('Params')
        )
        assert params['ResponseContentType'] == 'image/jpeg'

    def test_png_gets_response_content_type(self):
        """Presigned URL for .png should include ResponseContentType=image/png"""
        resolve_s3_url('s3://bucket/path/image.png', self.mock_client, presign=True)

        call_args = self.mock_client.generate_presigned_url.call_args
        params = call_args[1]['Params']
        assert params['ResponseContentType'] == 'image/png'

    def test_mp4_gets_response_content_type(self):
        """Presigned URL for .mp4 should include ResponseContentType=video/mp4"""
        resolve_s3_url('s3://bucket/videos/clip.mp4', self.mock_client, presign=True)

        call_args = self.mock_client.generate_presigned_url.call_args
        params = call_args[1]['Params']
        assert params['ResponseContentType'] == 'video/mp4'

    def test_unknown_extension_no_response_content_type(self):
        """Presigned URL for unknown extension should NOT include ResponseContentType"""
        resolve_s3_url('s3://bucket/data/file.xyz123', self.mock_client, presign=True)

        call_args = self.mock_client.generate_presigned_url.call_args
        params = call_args[1]['Params']
        assert 'ResponseContentType' not in params

    def test_no_extension_no_response_content_type(self):
        """Presigned URL for file without extension should NOT include ResponseContentType"""
        resolve_s3_url('s3://bucket/data/README', self.mock_client, presign=True)

        call_args = self.mock_client.generate_presigned_url.call_args
        params = call_args[1]['Params']
        assert 'ResponseContentType' not in params

    def test_json_gets_response_content_type(self):
        """Presigned URL for .json should include ResponseContentType=application/json"""
        resolve_s3_url('s3://bucket/data/tasks.json', self.mock_client, presign=True)

        call_args = self.mock_client.generate_presigned_url.call_args
        params = call_args[1]['Params']
        assert params['ResponseContentType'] == 'application/json'

    def test_tiff_gets_response_content_type(self):
        """Presigned URL for .tiff should include ResponseContentType=image/tiff"""
        resolve_s3_url('s3://bucket/scans/scan.tiff', self.mock_client, presign=True)

        call_args = self.mock_client.generate_presigned_url.call_args
        params = call_args[1]['Params']
        assert params['ResponseContentType'] == 'image/tiff'

    def test_presign_false_does_not_use_response_content_type(self):
        """When presign=False, blob is returned directly - no presigned URL generated"""
        mock_body = MagicMock()
        mock_body.read.return_value = b'fake image data'
        self.mock_client.get_object.return_value = {
            'ResponseMetadata': {'HTTPHeaders': {'content-type': 'binary/octet-stream'}},
            'Body': mock_body,
        }

        result = resolve_s3_url('s3://bucket/image.jpg', self.mock_client, presign=False)

        # Should return base64 data, not call generate_presigned_url
        self.mock_client.generate_presigned_url.assert_not_called()
        assert result.startswith('data:binary/octet-stream;base64,')

    def test_bucket_and_key_always_present(self):
        """Bucket and Key should always be in params regardless of content type detection"""
        resolve_s3_url('s3://my-bucket/path/to/file.jpg', self.mock_client, presign=True)

        call_args = self.mock_client.generate_presigned_url.call_args
        params = call_args[1]['Params']
        assert params['Bucket'] == 'my-bucket'
        assert params['Key'] == 'path/to/file.jpg'

    def test_expires_in_passed_through(self):
        """ExpiresIn parameter should be passed through to generate_presigned_url"""
        resolve_s3_url('s3://bucket/file.jpg', self.mock_client, presign=True, expires_in=120)

        call_args = self.mock_client.generate_presigned_url.call_args
        assert call_args[1]['ExpiresIn'] == 120

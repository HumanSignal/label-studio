from django.test import TestCase
from io_storages.utils import get_all_uris_via_regex


class TestGetAllUrisViaRegex(TestCase):
    """Unit tests for the get_all_uris_via_regex helper in io_storages/utils.py."""

    def test_bare_s3_uri(self):
        """A bare s3:// URI with no surrounding markup is returned as-is via the fast path."""
        result = get_all_uris_via_regex('s3://bucket/file.jpg', prefixes=['s3'])
        assert result == [('s3://bucket/file.jpg', 's3')]

    def test_bare_gs_uri(self):
        """A bare gs:// URI is detected when 'gs' is in the prefix list."""
        result = get_all_uris_via_regex('gs://bucket/file.jpg', prefixes=['gs'])
        assert result == [('gs://bucket/file.jpg', 'gs')]

    def test_bare_azure_uri(self):
        """A bare azure-blob:// URI is detected when 'azure-blob' is in the prefix list."""
        result = get_all_uris_via_regex('azure-blob://container/file.jpg', prefixes=['azure-blob'])
        assert result == [('azure-blob://container/file.jpg', 'azure-blob')]

    def test_single_embedded_uri(self):
        """A single URI embedded in an HTML attribute is extracted correctly."""
        html = '<img src="s3://bucket/file.jpg" alt="test" />'
        result = get_all_uris_via_regex(html, prefixes=['s3'])
        assert result == [('s3://bucket/file.jpg', 's3')]

    def test_multiple_same_scheme_uris(self):
        """Multiple URIs with the same scheme are all returned in document order."""
        html = (
            '<div>'
            '<img src="s3://bucket/img1.jpg" alt="Image 1" />'
            '<img src="s3://bucket/img2.jpg" alt="Image 2" />'
            '</div>'
        )
        result = get_all_uris_via_regex(html, prefixes=['s3'])
        assert result == [
            ('s3://bucket/img1.jpg', 's3'),
            ('s3://bucket/img2.jpg', 's3'),
        ]

    def test_multiple_different_scheme_uris(self):
        """URIs of different schemes are all returned when both prefixes are specified."""
        html = (
            '<div>'
            '<img src="s3://bucket/img1.jpg" alt="Image 1" />'
            '<img src="gs://bucket/img2.jpg" alt="Image 2" />'
            '</div>'
        )
        result = get_all_uris_via_regex(html, prefixes=['s3', 'gs'])
        assert result == [
            ('s3://bucket/img1.jpg', 's3'),
            ('gs://bucket/img2.jpg', 'gs'),
        ]

    def test_single_prefix_ignores_other_schemes(self):
        """When only one prefix is given, URIs of other schemes are excluded."""
        html = '<img src="s3://bucket/img1.jpg" alt="1" /><img src="gs://bucket/img2.jpg" alt="2" />'
        result = get_all_uris_via_regex(html, prefixes=['s3'])
        assert result == [('s3://bucket/img1.jpg', 's3')]

    def test_no_matching_uris(self):
        """Plain text with no URIs returns an empty list."""
        result = get_all_uris_via_regex('no uris here', prefixes=['s3'])
        assert result == []

    def test_empty_string(self):
        """An empty string returns an empty list."""
        result = get_all_uris_via_regex('', prefixes=['s3'])
        assert result == []

    def test_empty_prefixes(self):
        """An empty prefixes list returns an empty list even when URIs are present."""
        result = get_all_uris_via_regex('s3://bucket/file.jpg', prefixes=[])
        assert result == []

    def test_empty_string_prefix_filtered(self):
        """An empty-string prefix is filtered out and does not produce matches."""
        result = get_all_uris_via_regex('anything', prefixes=[''])
        assert result == []

    def test_three_uris_same_scheme(self):
        """Three URIs of the same scheme are all extracted in order."""
        html = '<img src="s3://b/a.jpg" alt="a" /><img src="s3://b/b.jpg" alt="b" /><img src="s3://b/c.jpg" alt="c" />'
        result = get_all_uris_via_regex(html, prefixes=['s3'])
        assert len(result) == 3
        assert result[0] == ('s3://b/a.jpg', 's3')
        assert result[1] == ('s3://b/b.jpg', 's3')
        assert result[2] == ('s3://b/c.jpg', 's3')

    def test_uri_with_special_characters_in_path(self):
        """Percent-encoded characters in the URI path are preserved."""
        html = '<img src="s3://bucket/path/to/file%20name.jpg" alt="test" />'
        result = get_all_uris_via_regex(html, prefixes=['s3'])
        assert result == [('s3://bucket/path/to/file%20name.jpg', 's3')]

    def test_bare_uri_with_spaces_in_path(self):
        """A bare URI with literal spaces in the path is resolved via the fast-path startswith check."""
        uri = 's3://my-bucket/images/some directory/sub folder/image.jpg'
        result = get_all_uris_via_regex(uri, prefixes=['s3'])
        assert result == [(uri, 's3')]

    def test_embedded_uri_with_spaces_in_path(self):
        """A quoted URI embedded in HTML is extracted when its path contains literal spaces."""
        html = '<img src="s3://my-bucket/images/some directory/sub folder/image.jpg" alt="test" />'
        result = get_all_uris_via_regex(html, prefixes=['s3'])
        assert result == [('s3://my-bucket/images/some directory/sub folder/image.jpg', 's3')]

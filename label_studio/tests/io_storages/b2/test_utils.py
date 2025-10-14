from unittest.mock import patch

import pytest
from django.test import override_settings
from io_storages.b2.utils import B2StorageError, catch_and_reraise_from_none


@override_settings(B2_TRUSTED_STORAGE_DOMAINS=['backblazeb2.com', 'backblaze.com'])
def test_catch_and_reraise_from_none_with_untrusted_domain():
    class TestClass:
        b2_endpoint_url = 'http://untrusted-domain.com'

    instance = TestClass()

    @catch_and_reraise_from_none
    def function_to_test(self):
        raise Exception('Original Exception')

    with patch('io_storages.b2.utils.extractor.extract_urllib') as mock_extract:
        mock_extract.return_value.registered_domain = 'untrusted-domain.com'
        with pytest.raises(B2StorageError) as excinfo:
            function_to_test(instance)
        assert 'Debugging info is not available for b2 endpoints on domain: untrusted-domain.com' in str(
            excinfo.value
        )


@override_settings(B2_TRUSTED_STORAGE_DOMAINS=['backblazeb2.com', 'backblaze.com'])
def test_catch_and_reraise_from_none_with_trusted_domain():
    class TestClass:
        b2_endpoint_url = 'https://s3.us-west-004.backblazeb2.com'

    instance = TestClass()

    @catch_and_reraise_from_none
    def function_to_test(self):
        raise Exception('Original Exception')

    with patch('io_storages.b2.utils.extractor.extract_urllib') as mock_extract:
        mock_extract.return_value.registered_domain = 'backblazeb2.com'
        with pytest.raises(Exception) as excinfo:
            function_to_test(instance)
        assert 'Original Exception' in str(excinfo.value)


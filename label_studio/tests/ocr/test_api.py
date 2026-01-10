"""
OCR API Tests - Test-first development for OCR endpoints.

These tests define expected behavior for the OCR API.
Tests are expected to fail until implementation is complete.
"""

import json
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    """API client fixture."""
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, django_user_model):
    """Authenticated API client fixture."""
    user = django_user_model.objects.create_user(
        email='testuser@example.com',
        password='testpass123'
    )
    api_client.force_authenticate(user=user)
    return api_client


class TestOcrPagesAPI:
    """Tests for OCR pages metadata endpoint."""

    def test_get_ocr_pages_requires_auth(self, api_client):
        """Anonymous users should be denied access."""
        url = reverse('ocr:ocr-pages', kwargs={'task_id': 1})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_ocr_pages_returns_metadata(self, authenticated_client, mocker):
        """Should return OCR metadata for a task."""
        # Mock the OCR data fetching
        mock_ocr_data = {
            'document_id': 'doc123',
            'total_pages': 5,
            'ocr_available': True,
            'ocr_engine': 'tesseract',
            'ocr_version': '5.0.0',
        }
        mocker.patch('ocr.utils.fetch_ocr_metadata', return_value=mock_ocr_data)

        url = reverse('ocr:ocr-pages', kwargs={'task_id': 1})
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['total_pages'] == 5
        assert data['ocr_available'] is True

    def test_get_ocr_pages_not_found(self, authenticated_client, mocker):
        """Should return 404 if OCR data not available."""
        mocker.patch('ocr.utils.fetch_ocr_metadata', return_value=None)

        url = reverse('ocr:ocr-pages', kwargs={'task_id': 999})
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestOcrTokensAPI:
    """Tests for OCR tokens endpoint."""

    def test_get_page_tokens_returns_tokens(self, authenticated_client, mocker):
        """Should return tokens for a specific page."""
        mock_tokens = {
            'page_index': 0,
            'width': 612,
            'height': 792,
            'tokens': [
                {
                    'id': 't1',
                    'text': 'Hello',
                    'bbox': [0.1, 0.1, 0.2, 0.05],
                    'confidence': 0.98,
                },
                {
                    'id': 't2',
                    'text': 'World',
                    'bbox': [0.35, 0.1, 0.2, 0.05],
                    'confidence': 0.95,
                },
            ],
        }
        mocker.patch('ocr.utils.fetch_page_tokens', return_value=mock_tokens)

        url = reverse('ocr:ocr-tokens', kwargs={'task_id': 1, 'page_index': 0})
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data['tokens']) == 2
        assert data['tokens'][0]['text'] == 'Hello'

    def test_get_page_tokens_invalid_page(self, authenticated_client, mocker):
        """Should return 404 for invalid page index."""
        mocker.patch('ocr.utils.fetch_page_tokens', return_value=None)

        url = reverse('ocr:ocr-tokens', kwargs={'task_id': 1, 'page_index': 999})
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestOcrRegionTokensAPI:
    """Tests for OCR region tokens endpoint."""

    def test_get_region_tokens_returns_intersecting(self, authenticated_client, mocker):
        """Should return tokens intersecting with a region."""
        mock_result = {
            'tokens': [
                {
                    'id': 't1',
                    'text': 'Hello',
                    'bbox': [0.1, 0.1, 0.2, 0.05],
                },
            ],
            'suggested_text': 'Hello',
        }
        mocker.patch('ocr.utils.get_region_tokens', return_value=mock_result)

        url = reverse('ocr:ocr-region-tokens', kwargs={'task_id': 1, 'page_index': 0})
        response = authenticated_client.get(url, {
            'x': 0.05,
            'y': 0.05,
            'width': 0.3,
            'height': 0.1,
        })

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data['tokens']) == 1
        assert data['suggested_text'] == 'Hello'

    def test_get_region_tokens_with_threshold(self, authenticated_client, mocker):
        """Should respect intersection threshold parameter."""
        mock_result = {
            'tokens': [],
            'suggested_text': '',
        }
        mocker.patch('ocr.utils.get_region_tokens', return_value=mock_result)

        url = reverse('ocr:ocr-region-tokens', kwargs={'task_id': 1, 'page_index': 0})
        response = authenticated_client.get(url, {
            'x': 0.5,
            'y': 0.5,
            'width': 0.01,
            'height': 0.01,
            'threshold': 0.9,
        })

        assert response.status_code == status.HTTP_200_OK


class TestOcrImportAPI:
    """Tests for OCR data import endpoint."""

    def test_import_ocr_data_creates_records(self, authenticated_client, mocker):
        """Should import OCR data for a task."""
        ocr_data = {
            'pages': [
                {
                    'page_index': 0,
                    'width': 612,
                    'height': 792,
                    'tokens': [
                        {'id': 't1', 'text': 'Test', 'bbox': [0.1, 0.1, 0.1, 0.05]},
                    ],
                },
            ],
        }

        mocker.patch('ocr.utils.import_ocr_data', return_value=True)

        url = reverse('ocr:ocr-import', kwargs={'task_id': 1})
        response = authenticated_client.post(
            url,
            data=json.dumps(ocr_data),
            content_type='application/json'
        )

        assert response.status_code == status.HTTP_201_CREATED

    def test_import_ocr_data_invalid_format(self, authenticated_client):
        """Should reject invalid OCR data format."""
        invalid_data = {'invalid': 'structure'}

        url = reverse('ocr:ocr-import', kwargs={'task_id': 1})
        response = authenticated_client.post(
            url,
            data=json.dumps(invalid_data),
            content_type='application/json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestOcrCoordinateNormalization:
    """Tests for coordinate normalization utilities."""

    def test_normalize_coordinates_to_0_1_range(self):
        """Coordinates should be normalized to 0-1 range."""
        from ocr.utils import normalize_bbox

        # Page dimensions: 612x792 (letter size in points)
        page_width = 612
        page_height = 792

        # Token at (100, 200) with size (50, 20)
        bbox = [100, 200, 50, 20]
        normalized = normalize_bbox(bbox, page_width, page_height)

        assert normalized[0] == pytest.approx(100 / 612, rel=1e-3)
        assert normalized[1] == pytest.approx(200 / 792, rel=1e-3)
        assert normalized[2] == pytest.approx(50 / 612, rel=1e-3)
        assert normalized[3] == pytest.approx(20 / 792, rel=1e-3)

    def test_denormalize_coordinates_to_percentage(self):
        """Normalized coords should convert to 0-100 percentage range."""
        from ocr.utils import denormalize_bbox_to_percent

        # Normalized coordinates
        normalized = [0.1, 0.2, 0.3, 0.4]
        percent = denormalize_bbox_to_percent(normalized)

        assert percent[0] == 10.0
        assert percent[1] == 20.0
        assert percent[2] == 30.0
        assert percent[3] == 40.0


class TestOcrReadingOrder:
    """Tests for reading order utilities."""

    def test_sort_tokens_by_reading_order(self):
        """Tokens should be sorted in reading order (top-to-bottom, left-to-right)."""
        from ocr.utils import sort_tokens_by_reading_order

        tokens = [
            {'id': 't1', 'text': 'C', 'bbox': [0.5, 0.1, 0.1, 0.05]},
            {'id': 't2', 'text': 'A', 'bbox': [0.1, 0.1, 0.1, 0.05]},
            {'id': 't3', 'text': 'B', 'bbox': [0.3, 0.1, 0.1, 0.05]},
            {'id': 't4', 'text': 'D', 'bbox': [0.1, 0.3, 0.1, 0.05]},
        ]

        sorted_tokens = sort_tokens_by_reading_order(tokens)

        # Same line tokens should be sorted left-to-right
        assert sorted_tokens[0]['text'] == 'A'
        assert sorted_tokens[1]['text'] == 'B'
        assert sorted_tokens[2]['text'] == 'C'
        # Next line token should come after
        assert sorted_tokens[3]['text'] == 'D'

    def test_join_tokens_to_text(self):
        """Tokens should be joined into readable text."""
        from ocr.utils import join_tokens_to_text

        tokens = [
            {'id': 't1', 'text': 'Hello', 'bbox': [0.1, 0.1, 0.2, 0.05]},
            {'id': 't2', 'text': 'World', 'bbox': [0.35, 0.1, 0.2, 0.05]},
        ]

        text = join_tokens_to_text(tokens)
        assert text == 'Hello World'

# This file and its contents are licensed under the Apache License 2.0.
# Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
Test fixtures for OCR module.
"""

import pytest
from django.contrib.auth import get_user_model
from projects.models import Project
from tasks.models import Task

User = get_user_model()


@pytest.fixture
def sample_ocr_tokens():
    """Sample OCR tokens for a single page."""
    return [
        {
            'id': 'p0_t0',
            'text': 'INVOICE',
            'bbox': [0.1, 0.05, 0.15, 0.03],
            'confidence': 0.99,
            'line_id': 'p0_l0',
            'block_id': 'p0_b0',
            'is_bold': True,
        },
        {
            'id': 'p0_t1',
            'text': '#12345',
            'bbox': [0.26, 0.05, 0.1, 0.03],
            'confidence': 0.97,
            'line_id': 'p0_l0',
            'block_id': 'p0_b0',
        },
        {
            'id': 'p0_t2',
            'text': 'Date:',
            'bbox': [0.1, 0.1, 0.08, 0.025],
            'confidence': 0.98,
            'line_id': 'p0_l1',
            'block_id': 'p0_b1',
        },
        {
            'id': 'p0_t3',
            'text': '2026-01-10',
            'bbox': [0.19, 0.1, 0.15, 0.025],
            'confidence': 0.96,
            'line_id': 'p0_l1',
            'block_id': 'p0_b1',
        },
    ]


@pytest.fixture
def sample_ocr_page(sample_ocr_tokens):
    """Sample OCR page data."""
    return {
        'page_index': 0,
        'width': 612,
        'height': 792,
        'rotation': 0,
        'tokens': sample_ocr_tokens,
    }


@pytest.fixture
def sample_ocr_document(sample_ocr_page):
    """Sample complete OCR document."""
    return {
        'document_id': 'test-doc-001',
        'pages': [sample_ocr_page],
        'ocr_engine': 'tesseract',
        'ocr_version': '5.3.0',
        'created_at': '2026-01-10T12:00:00Z',
    }


@pytest.fixture
def sample_table_tokens():
    """Sample OCR tokens representing a simple table."""
    # 3x3 table
    tokens = []
    headers = ['Item', 'Qty', 'Price']
    row1 = ['Widget', '10', '$5.00']
    row2 = ['Gadget', '5', '$10.00']

    # Header row
    for i, text in enumerate(headers):
        tokens.append({
            'id': f'p0_t{i}',
            'text': text,
            'bbox': [0.1 + i * 0.25, 0.3, 0.2, 0.03],
            'confidence': 0.99,
            'line_id': 'p0_l10',
        })

    # Data row 1
    for i, text in enumerate(row1):
        tokens.append({
            'id': f'p0_t{3 + i}',
            'text': text,
            'bbox': [0.1 + i * 0.25, 0.35, 0.2, 0.03],
            'confidence': 0.97,
            'line_id': 'p0_l11',
        })

    # Data row 2
    for i, text in enumerate(row2):
        tokens.append({
            'id': f'p0_t{6 + i}',
            'text': text,
            'bbox': [0.1 + i * 0.25, 0.4, 0.2, 0.03],
            'confidence': 0.95,
            'line_id': 'p0_l12',
        })

    return tokens


@pytest.fixture
def test_user(db):
    """Create a test user."""
    user = User.objects.create_user(
        email='test@example.com',
        password='testpassword123',
    )
    return user


@pytest.fixture
def test_project(db, test_user):
    """Create a test project."""
    project = Project.objects.create(
        title='Test PDF Project',
        created_by=test_user,
        label_config='''
        <View>
          <PdfOcr name="pdf" value="$pdf_url" ocrValue="$ocr_url"/>
          <OcrTokenLabels name="label" toName="pdf">
            <Label value="HEADER" background="#FF0000"/>
            <Label value="PARAGRAPH" background="#00FF00"/>
          </OcrTokenLabels>
        </View>
        ''',
    )
    return project


@pytest.fixture
def test_task(db, test_project):
    """Create a test task with PDF and OCR URLs."""
    task = Task.objects.create(
        project=test_project,
        data={
            'pdf_url': '/data/local-files/?d=documents/test.pdf',
            'ocr_url': '/data/local-files/?d=ocr/test.json',
        },
        meta={
            'document_id': 'test-doc-001',
        },
    )
    return task


@pytest.fixture
def test_task_no_ocr(db, test_project):
    """Create a test task without OCR URL."""
    task = Task.objects.create(
        project=test_project,
        data={
            'pdf_url': '/data/local-files/?d=documents/test.pdf',
        },
    )
    return task

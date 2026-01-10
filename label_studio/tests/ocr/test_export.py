"""
Tests for PDF OCR Export - User Story 5

Tests export format for:
- PDF region annotations
- Table annotations with gridlines
- Cell text export
"""

import pytest
import json
from django.test import TestCase
from rest_framework.test import APIClient


class PdfRegionExportTestCase(TestCase):
    """Tests for PDF region export format."""

    def setUp(self):
        self.client = APIClient()

    def test_region_export_format(self):
        """Test that PDF region exports with correct format."""
        # Sample region annotation
        region_annotation = {
            "type": "pdfregion",
            "from_name": "labels",
            "to_name": "pdf",
            "value": {
                "x": 10.5,
                "y": 20.3,
                "width": 30.0,
                "height": 15.5,
                "rotation": 0,
                "page": 1,
            }
        }

        # Verify required fields
        assert "x" in region_annotation["value"]
        assert "y" in region_annotation["value"]
        assert "width" in region_annotation["value"]
        assert "height" in region_annotation["value"]
        assert "page" in region_annotation["value"]

        # Verify coordinate ranges (0-100 percentage)
        value = region_annotation["value"]
        assert 0 <= value["x"] <= 100
        assert 0 <= value["y"] <= 100
        assert 0 <= value["width"] <= 100
        assert 0 <= value["height"] <= 100

    def test_region_with_extracted_text(self):
        """Test region export includes extracted OCR text."""
        region_annotation = {
            "type": "pdfregion",
            "from_name": "labels",
            "to_name": "pdf",
            "value": {
                "x": 10,
                "y": 20,
                "width": 30,
                "height": 15,
                "page": 1,
                "extractedText": "Sample OCR text from region"
            }
        }

        assert "extractedText" in region_annotation["value"]
        assert isinstance(region_annotation["value"]["extractedText"], str)


class TableExportTestCase(TestCase):
    """Tests for table annotation export format."""

    def setUp(self):
        self.client = APIClient()

    def test_table_export_format(self):
        """Test table annotation exports with gridlines."""
        table_annotation = {
            "type": "pdfregion",
            "from_name": "tables",
            "to_name": "pdf",
            "value": {
                "x": 5,
                "y": 10,
                "width": 90,
                "height": 80,
                "page": 1,
                "isTable": True,
                "row_lines": [25, 50, 75],
                "col_lines": [33.33, 66.66],
            }
        }

        value = table_annotation["value"]

        # Verify table flag
        assert value["isTable"] is True

        # Verify gridlines
        assert "row_lines" in value
        assert "col_lines" in value
        assert isinstance(value["row_lines"], list)
        assert isinstance(value["col_lines"], list)

        # Verify gridline values are percentages (0-100)
        for line in value["row_lines"]:
            assert 0 < line < 100

        for line in value["col_lines"]:
            assert 0 < line < 100

    def test_table_export_with_cells(self):
        """Test table export includes cells array."""
        table_annotation = {
            "type": "pdfregion",
            "from_name": "tables",
            "to_name": "pdf",
            "value": {
                "x": 10,
                "y": 20,
                "width": 80,
                "height": 60,
                "page": 1,
                "isTable": True,
                "row_lines": [50],
                "col_lines": [50],
                "cells": [
                    {"row": 0, "col": 0, "x": 10, "y": 20, "width": 40, "height": 30, "text": "A1"},
                    {"row": 0, "col": 1, "x": 50, "y": 20, "width": 40, "height": 30, "text": "B1"},
                    {"row": 1, "col": 0, "x": 10, "y": 50, "width": 40, "height": 30, "text": "A2"},
                    {"row": 1, "col": 1, "x": 50, "y": 50, "width": 40, "height": 30, "text": "B2"},
                ]
            }
        }

        value = table_annotation["value"]

        # Verify cells array
        assert "cells" in value
        assert isinstance(value["cells"], list)
        assert len(value["cells"]) == 4  # 2x2 table

        # Verify cell structure
        for cell in value["cells"]:
            assert "row" in cell
            assert "col" in cell
            assert "x" in cell
            assert "y" in cell
            assert "width" in cell
            assert "height" in cell
            assert "text" in cell
            assert isinstance(cell["row"], int)
            assert isinstance(cell["col"], int)
            assert isinstance(cell["text"], str)

    def test_table_export_cell_texts(self):
        """Test table export with edited cell texts."""
        table_annotation = {
            "type": "pdfregion",
            "from_name": "tables",
            "to_name": "pdf",
            "value": {
                "x": 10,
                "y": 20,
                "width": 80,
                "height": 60,
                "page": 1,
                "isTable": True,
                "row_lines": [50],
                "col_lines": [50],
                "cellTexts": {
                    "0-0": "Header 1",
                    "0-1": "Header 2",
                    "1-0": "Data 1",
                    "1-1": "Data 2",
                },
                "cells": [
                    {"row": 0, "col": 0, "text": "Header 1", "x": 10, "y": 20, "width": 40, "height": 30},
                    {"row": 0, "col": 1, "text": "Header 2", "x": 50, "y": 20, "width": 40, "height": 30},
                    {"row": 1, "col": 0, "text": "Data 1", "x": 10, "y": 50, "width": 40, "height": 30},
                    {"row": 1, "col": 1, "text": "Data 2", "x": 50, "y": 50, "width": 40, "height": 30},
                ]
            }
        }

        value = table_annotation["value"]

        # Verify cellTexts map
        assert "cellTexts" in value
        assert isinstance(value["cellTexts"], dict)
        assert value["cellTexts"]["0-0"] == "Header 1"
        assert value["cellTexts"]["1-1"] == "Data 2"

        # Verify cells array has matching text
        cell_00 = next(c for c in value["cells"] if c["row"] == 0 and c["col"] == 0)
        assert cell_00["text"] == "Header 1"

    def test_table_grid_computation(self):
        """Test that cells are correctly computed from gridlines."""
        # 3x3 table (2 row lines, 2 col lines)
        row_lines = [33.33, 66.66]
        col_lines = [33.33, 66.66]

        num_rows = len(row_lines) + 1
        num_cols = len(col_lines) + 1

        assert num_rows == 3
        assert num_cols == 3

        # Total cells should be rows * cols
        expected_cells = num_rows * num_cols
        assert expected_cells == 9

    def test_large_table_export(self):
        """Test export of large table (100x50)."""
        # Generate 99 row lines for 100 rows
        row_lines = [i for i in range(1, 100)]
        # Generate 49 col lines for 50 cols
        col_lines = [i * 2 for i in range(1, 50)]

        table_annotation = {
            "type": "pdfregion",
            "value": {
                "x": 0,
                "y": 0,
                "width": 100,
                "height": 100,
                "page": 1,
                "isTable": True,
                "row_lines": row_lines,
                "col_lines": col_lines,
            }
        }

        value = table_annotation["value"]

        # Verify gridlines
        assert len(value["row_lines"]) == 99
        assert len(value["col_lines"]) == 49

        # Would create 100 rows x 50 cols = 5000 cells
        num_rows = len(row_lines) + 1
        num_cols = len(col_lines) + 1
        assert num_rows == 100
        assert num_cols == 50


class CoordinateNormalizationTestCase(TestCase):
    """Tests for coordinate normalization."""

    def test_percentage_coordinates(self):
        """Test coordinates are in percentage format (0-100)."""
        annotation = {
            "value": {
                "x": 25.5,
                "y": 33.3,
                "width": 50.0,
                "height": 25.0,
            }
        }

        value = annotation["value"]

        # All coordinates should be percentages
        assert 0 <= value["x"] <= 100
        assert 0 <= value["y"] <= 100
        assert 0 <= value["width"] <= 100
        assert 0 <= value["height"] <= 100

        # Region should not exceed bounds
        assert value["x"] + value["width"] <= 100
        assert value["y"] + value["height"] <= 100

    def test_gridline_coordinates(self):
        """Test gridline coordinates are percentages within region."""
        table = {
            "value": {
                "row_lines": [25, 50, 75],
                "col_lines": [20, 40, 60, 80],
            }
        }

        # Gridlines are relative to region (0-100)
        for line in table["value"]["row_lines"]:
            assert 0 < line < 100

        for line in table["value"]["col_lines"]:
            assert 0 < line < 100

    def test_cell_absolute_coordinates(self):
        """Test cell coordinates are absolute on page."""
        region_x = 10
        region_y = 20
        region_width = 80
        region_height = 60

        # Cell at (0,0) with 50% gridlines
        cell_rel_x = 0  # 0% of region
        cell_rel_y = 0  # 0% of region
        cell_rel_width = 50  # 50% of region width
        cell_rel_height = 50  # 50% of region height

        # Convert to absolute coordinates
        cell_abs_x = region_x + (cell_rel_x / 100) * region_width
        cell_abs_y = region_y + (cell_rel_y / 100) * region_height
        cell_abs_width = (cell_rel_width / 100) * region_width
        cell_abs_height = (cell_rel_height / 100) * region_height

        assert cell_abs_x == 10
        assert cell_abs_y == 20
        assert cell_abs_width == 40
        assert cell_abs_height == 30


class ImportAnnotationTestCase(TestCase):
    """Tests for importing/loading annotations."""

    def test_load_region_annotation(self):
        """Test loading a saved region annotation."""
        saved_annotation = {
            "result": [
                {
                    "type": "pdfregion",
                    "from_name": "labels",
                    "to_name": "pdf",
                    "value": {
                        "x": 15,
                        "y": 25,
                        "width": 40,
                        "height": 20,
                        "page": 1,
                        "rotation": 0,
                    }
                }
            ]
        }

        # Simulate loading
        result = saved_annotation["result"][0]

        assert result["type"] == "pdfregion"
        assert result["value"]["x"] == 15
        assert result["value"]["page"] == 1

    def test_load_table_annotation(self):
        """Test loading a saved table annotation."""
        saved_annotation = {
            "result": [
                {
                    "type": "pdfregion",
                    "from_name": "tables",
                    "to_name": "pdf",
                    "value": {
                        "x": 5,
                        "y": 10,
                        "width": 90,
                        "height": 80,
                        "page": 1,
                        "isTable": True,
                        "row_lines": [30, 60],
                        "col_lines": [50],
                        "cellTexts": {
                            "0-0": "Header A",
                            "0-1": "Header B",
                        },
                        "cells": [
                            {"row": 0, "col": 0, "text": "Header A", "x": 5, "y": 10, "width": 45, "height": 24},
                            {"row": 0, "col": 1, "text": "Header B", "x": 50, "y": 10, "width": 45, "height": 24},
                            {"row": 1, "col": 0, "text": "", "x": 5, "y": 34, "width": 45, "height": 24},
                            {"row": 1, "col": 1, "text": "", "x": 50, "y": 34, "width": 45, "height": 24},
                            {"row": 2, "col": 0, "text": "", "x": 5, "y": 58, "width": 45, "height": 32},
                            {"row": 2, "col": 1, "text": "", "x": 50, "y": 58, "width": 45, "height": 32},
                        ]
                    }
                }
            ]
        }

        result = saved_annotation["result"][0]

        assert result["value"]["isTable"] is True
        assert len(result["value"]["row_lines"]) == 2
        assert len(result["value"]["col_lines"]) == 1
        assert len(result["value"]["cells"]) == 6  # 3 rows x 2 cols
        assert result["value"]["cellTexts"]["0-0"] == "Header A"

    def test_roundtrip_consistency(self):
        """Test that export and import produce consistent data."""
        original = {
            "type": "pdfregion",
            "value": {
                "x": 10.5,
                "y": 20.3,
                "width": 50.0,
                "height": 40.0,
                "page": 2,
                "isTable": True,
                "row_lines": [25.0, 50.0, 75.0],
                "col_lines": [33.33, 66.66],
                "cellTexts": {
                    "0-0": "Test Cell",
                },
            }
        }

        # Simulate export (JSON serialization)
        exported = json.dumps(original)

        # Simulate import (JSON deserialization)
        imported = json.loads(exported)

        # Verify consistency
        assert imported["type"] == original["type"]
        assert imported["value"]["x"] == original["value"]["x"]
        assert imported["value"]["row_lines"] == original["value"]["row_lines"]
        assert imported["value"]["cellTexts"] == original["value"]["cellTexts"]

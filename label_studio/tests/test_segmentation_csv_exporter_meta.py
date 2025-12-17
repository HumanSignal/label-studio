import pytest

from label_studio.data_export.formats.segmentation_csv_exporter import compute_segmentation_metrics


class _DummyProject:
    """Minimal project stub with parsed config for compute_segmentation_metrics."""

    def __init__(self):
        self.id = 1

    def get_parsed_config(self):
        # Single BrushLabels control linked to an Image object.
        return {
            "tag1": {
                "type": "BrushLabels",
                "inputs": [
                    {
                        "type": "Image",
                        "name": "image",
                        "value": "$image",
                    }
                ],
            }
        }


def _single_task(results):
    return [
        {
            "id": 10,
            "data": {
                "image": "upload://image1.png",
            },
            "annotations": [
                {
                    "id": 100,
                    "result": results,
                }
            ],
        }
    ]


def _first_row(tasks):
    rows_by_image = compute_segmentation_metrics(tasks, _DummyProject(), download_resources=False)
    # Only one image key expected in this helper.
    assert len(rows_by_image) == 1
    key = next(iter(rows_by_image.keys()))
    rows = rows_by_image[key]
    assert len(rows) == 1
    return rows[0]


def test_meta_intensities_and_group_preferred_over_textarea():
    """When result.meta contains RGB means and group, exporter should use them and still be robust to legacy textarea."""
    region_id = "r1"

    results = [
        # Legacy textarea with intensities – should only be used as a fallback.
        {
            "id": region_id,
            "type": "textarea",
            "from_name": "ta",
            "to_name": "image",
            "value": {
                "text": ["gray=123; r=10; g=20; b=30"],
            },
        },
        # Brush region carrying meta geometry, RGB means, and group.
        {
            "id": region_id,
            "type": "brushlabels",
            "from_name": "tag1",
            "to_name": "image",
            "value": {
                "format": "rle",
                "rle": [4],
                "brushlabels": ["Object"],
            },
            "original_width": 2,
            "original_height": 2,
            "meta": {
                "area": 50,
                "bbox": {"x": 1, "y": 2, "width": 3, "height": 4},
                "mean_r": 101.0,
                "mean_g": 202.0,
                "mean_b": 303.0,
                "group": "A",
            },
        },
    ]

    row = _first_row(_single_task(results))

    # Geometry should come from meta (not from decoded mask).
    assert row["bbox_x_px"] == 1
    assert row["bbox_y_px"] == 2
    assert row["x_length_px"] == 3
    assert row["y_length_px"] == 4
    assert row["area_px"] == 50

    # RGB channels from meta, gray stays numeric and defined.
    assert row["mean_r"] == pytest.approx(101.0)
    assert row["mean_g"] == pytest.approx(202.0)
    assert row["mean_b"] == pytest.approx(303.0)
    assert isinstance(row["mean_gray"], (int, float))

    # Group from meta.
    assert row["group"] == "A"


def test_legacy_textarea_only_intensities_still_supported():
    """If meta lacks RGB channels, exporter should fall back to textarea means for all channels."""
    region_id = "r2"

    results = [
        {
            "id": region_id,
            "type": "textarea",
            "from_name": "ta",
            "to_name": "image",
            "value": {
                "text": ["gray=10; r=11; g=22; b=33"],
            },
        },
        {
            "id": region_id,
            "type": "brushlabels",
            "from_name": "tag1",
            "to_name": "image",
            "value": {
                "format": "rle",
                "rle": [4],
                "brushlabels": ["Object"],
            },
            "original_width": 2,
            "original_height": 2,
            # No meta means legacy textarea path should provide intensities.
        },
    ]

    row = _first_row(_single_task(results))

    assert row["mean_gray"] == pytest.approx(10.0)
    assert row["mean_r"] == pytest.approx(11.0)
    assert row["mean_g"] == pytest.approx(22.0)
    assert row["mean_b"] == pytest.approx(33.0)

    # Group column should always be present, empty when not provided.
    assert row["group"] == ""


def test_excel_export_multiple_images(_single_task, _first_row):
    """Test that multiple images create an Excel file with multiple sheets."""
    from label_studio.data_export.formats.segmentation_csv_exporter import export_segmentation_metrics

    # Create mock project
    project = _DummyProject()

    # Create tasks with different images
    tasks = [
        {
            "id": 1,
            "data": {"image": "image1.jpg"},
            "annotations": [{
                "id": 1,
                "result": [
                    {
                        "id": "brush1",
                        "type": "brushlabels",
                        "to_name": "image",
                        "from_name": "tag1",
                        "value": {
                            "format": "rle",
                            "rle": [1, 1],  # Minimal RLE
                            "brushlabels": ["Object"]
                        },
                        "original_width": 10,
                        "original_height": 10,
                        "meta": {
                            "area": 25,
                            "bbox": {"x": 0, "y": 0, "width": 5, "height": 5},
                            "mean_r": 100.0,
                            "mean_g": 150.0,
                            "mean_b": 200.0,
                            "group": "GroupA"
                        }
                    }
                ]
            }]
        },
        {
            "id": 2,
            "data": {"image": "image2.jpg"},
            "annotations": [{
                "id": 2,
                "result": [
                    {
                        "id": "brush2",
                        "type": "brushlabels",
                        "to_name": "image",
                        "from_name": "tag1",
                        "value": {
                            "format": "rle",
                            "rle": [1, 1],  # Minimal RLE
                            "brushlabels": ["Object"]
                        },
                        "original_width": 10,
                        "original_height": 10,
                        "meta": {
                            "area": 36,
                            "bbox": {"x": 1, "y": 1, "width": 6, "height": 6},
                            "mean_r": 110.0,
                            "mean_g": 160.0,
                            "mean_b": 210.0,
                            "group": "GroupB"
                        }
                    }
                ]
            }]
        }
    ]

    # Export segmentation metrics
    file_obj, content_type, filename = export_segmentation_metrics(tasks, project, download_resources=False)

    # Should create Excel file for multiple images
    assert filename.endswith('.xlsx')
    assert 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' in content_type

    # Verify we can read the Excel file
    import pandas as pd
    excel_data = pd.read_excel(file_obj, sheet_name=None)
    assert len(excel_data) == 3  # Summary + two image sheets

    # Check that Summary sheet exists
    assert 'Summary' in excel_data

    # Check summary data
    summary_df = excel_data['Summary']
    assert len(summary_df) > 0

    # Should have total regions count
    total_regions_row = summary_df[summary_df['Metric'] == 'Total Regions']
    assert len(total_regions_row) == 1
    assert total_regions_row.iloc[0]['Value'] == 2  # Two regions total

    # Should have number of groups
    groups_row = summary_df[summary_df['Metric'] == 'Number of Groups']
    assert len(groups_row) == 1
    assert groups_row.iloc[0]['Value'] == 2  # Two different groups

    # Check sheet names contain image info
    sheet_names = [name for name in excel_data.keys() if name != 'Summary']
    assert len(sheet_names) == 2
    assert any('image1' in name for name in sheet_names)
    assert any('image2' in name for name in sheet_names)

    # Check data in image sheets
    for sheet_name in sheet_names:
        sheet_data = excel_data[sheet_name]
        assert len(sheet_data) == 1
        assert sheet_data.iloc[0]['area_px'] in [25, 36]  # Either image1 or image2 data


def test_csv_export_single_image_fallback(_single_task, _first_row):
    """Test that single image still creates CSV file for backward compatibility."""
    from label_studio.data_export.formats.segmentation_csv_exporter import export_segmentation_metrics

    # Create mock project
    project = _DummyProject()

    # Single task (already tested above)
    tasks = [_single_task([
        {
            "id": "brush1",
            "type": "brushlabels",
            "to_name": "image",
            "from_name": "tag1",
            "value": {
                "format": "rle",
                "rle": [1, 1],
                "brushlabels": ["Object"]
            },
            "original_width": 10,
            "original_height": 10,
            "meta": {
                "area": 25,
                "bbox": {"x": 0, "y": 0, "width": 5, "height": 5},
                "mean_r": 100.0,
                "mean_g": 150.0,
                "mean_b": 200.0,
                "group": "SingleGroup"
            }
        }
    ])]

    # Export segmentation metrics
    file_obj, content_type, filename = export_segmentation_metrics(tasks, project, download_resources=False)

    # Should create ZIP file containing CSV for single image
    assert filename.endswith('.csv.zip')
    assert content_type == 'application/zip'



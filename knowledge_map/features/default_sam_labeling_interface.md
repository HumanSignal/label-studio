# Default SAM Labeling Interface Configuration

## Overview
This document describes how the default labeling interface for new Label Studio projects has been configured to use the SAM (Segment Anything Model) interface.

## Implementation

### Modified File
- **File**: `label_studio/projects/models.py`
- **Line**: 143-182
- **Change**: Updated the `label_config` field default value in the Project model

### Default Interface Configuration

The default labeling interface now includes:

1. **Interactive Tools (Smart Labels)**:
   - **KeyPointLabels (tag3)**: For point-based SAM interactions
   - **RectangleLabels (tag4)**: For bounding box-based SAM interactions

2. **Result Annotations**:
   - **BrushLabels (tag1)**: For pixel-level mask annotations (red)
   - **PolygonLabels (tag2)**: For vector polygon annotations (green)

3. **Metadata Collection**:
   - **TextArea (mean_intensity)**: For per-region metadata collection

### XML Configuration

```xml
<View>
  <Image name="image" value="$image" zoom="true"/>
  <!-- Smart Keypoint Labels (tag3) -->
  <Header value="Interact: Keypoint Labels"/>
  <KeyPointLabels name="tag3" toName="image" smart="true">
    <Label value="Object" smart="true" background="#0000FF"/>
  </KeyPointLabels>
     
   <!-- Smart Rectangle Labels (tag4) -->
   <Header value="Interact: Rectangle Labels"/>
   <RectangleLabels name="tag4" toName="image" smart="true">
     <Label value="Object" smart="true" background="#0000FF"/>
   </RectangleLabels>
  
    <TextArea name="mean_intensity" toName="image"
            perRegion="true"
            required="true"
            maxSubmissions="1"
            rows="5"
           placeholder="Mean Intensity (gray/R/G/B)"
            displayMode="region-list"
            />
  <!-- Brush Labels (tag1) -->
  <Header value="Result: Brush Labels"/>
  <BrushLabels name="tag1" toName="image">
    <Label value="Object" background="#FF0000"/>
  </BrushLabels>
  
  <!-- Polygon Labels (tag2) -->
  <Header value="Result: Outline"/>
  <PolygonLabels name="tag2" toName="image">
    <Label value="Object" background="#00FF00"/>
  </PolygonLabels>
</View>
```

## Usage

### Creating New Projects

When you create a new project in Label Studio:

1. Navigate to **Projects** > **Create Project**
2. The labeling interface will automatically be pre-populated with the SAM configuration
3. You can still modify it if needed before saving

### Existing Projects

This change only affects **NEW** projects created after the modification. Existing projects will retain their current labeling interface configuration.

### Customization

Users can still customize the labeling interface for individual projects:
1. Go to **Project Settings** > **Labeling Interface**
2. Modify the XML configuration as needed
3. Click **Save**

## Integration with SAM ML Backend

This default configuration is designed to work seamlessly with the SAM ML backend:

### Required ML Backend Settings

Ensure your SAM ML backend is configured with:
- `LABEL_STUDIO_HOST`: URL of your Label Studio instance
- `LABEL_STUDIO_ACCESS_TOKEN`: Your API token
- `SAM_CHOICE`: Model variant (SAM, MobileSAM, or FastSAM)

### Auto-Connection

If you have the following settings enabled in Label Studio:
```python
ADD_DEFAULT_ML_BACKENDS = True
DEFAULT_ML_BACKEND_URL = "http://localhost:9090"
DEFAULT_ML_BACKEND_TITLE = "SAM Backend"
```

New projects will automatically:
1. Use the SAM labeling interface
2. Connect to the SAM ML backend
3. Enable interactive preannotations

## Workflow

1. **User creates keypoint or rectangle annotation** (blue labels)
2. **SAM backend processes the input** and generates predictions
3. **Results appear as brush masks** (red) and **polygon outlines** (green)
4. **User can add mean_intensity metadata** for each region
5. **User accepts or refines** the predictions

## Benefits

- **Consistent Experience**: All new projects start with SAM-ready interface
- **Reduced Setup Time**: No need to manually configure the interface for each project
- **Best Practices**: Interface follows SAM integration best practices
- **Flexibility**: Users can still customize per project if needed

## Reverting to Simple Default

If you need to revert to a simple default interface:

1. Edit `label_studio/projects/models.py`
2. Change the default value back to:
   ```python
   default='<View></View>',
   ```
3. Restart Label Studio

## Alternative Approaches

### Option 1: Environment Variable (Not Implemented)
Could add a `DEFAULT_LABEL_CONFIG_PATH` environment variable to load from file.

### Option 2: Admin UI Setting (Not Implemented)
Could add an admin interface to configure the default template.

### Option 3: Template System (Current Workaround)
Users can save the SAM interface as a custom template and select it when creating projects.

## Testing

To verify the change:

1. Restart Label Studio:
   ```bash
   cd /Users/reading/Developer/label-studio-custom
   python label_studio/manage.py runserver
   ```

2. Create a new project

3. Verify the labeling interface is pre-populated with the SAM configuration

## Notes

- This change requires a Label Studio restart to take effect
- No database migration is needed (only affects default value for new records)
- Existing projects are not affected
- The configuration can still be overridden per project

## Related Files

- Source XML: `/Users/reading/Developer/ls-ml-backend-SAM/sam_poly_label_interf.xml`
- Modified Model: `/Users/reading/Developer/label-studio-custom/label_studio/projects/models.py`
- ML Backend Config: `/Users/reading/Developer/ls-ml-backend-SAM/docs/README_CONFIGURATION.md`

## Date
October 5, 2025

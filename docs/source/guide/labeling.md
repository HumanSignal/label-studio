---
title: Label and annotate data 
type: guide
order: 402
meta_title: Label and annotate data
meta_description: Label and annotate data using the Label Studio UI to create bounding boxes, label text spans, set up relations, and filter and sort project data for your machine learning dataset creation.
---

Label and annotate your data with the open source data labeling tool, Label Studio. After you [set up your project](setup_project.html) and [labeling interface](setup.html) and [import your data](tasks.html), you can start labeling and annotating your data.

1. Open a project in Label Studio and optionally [filter or sort the data](manage_data.html#Filter-or-sort-project-data).    
2. Click **Label All Tasks** to [start labeling](#Start-labeling).
3. Use [keyboard shortcuts](#Use-keyboard-shortcuts-to-label-regions-faster) or your mouse to label the data and submit your annotations.
4. Follow the project instructions for labeling and deciding whether to skip tasks. 
5. Click the project name to return to the data manager.

You can also [collaborate with other annotators](#Label-with-collaborators) to improve the quality of your labeled data. 

## Start labeling

Some labeling tasks can be complicated to perform, for example, labeling that includes text, image, and audio data objects as part of one dataset and labeling task, or creating relations between annotations on a labeling task. This section includes guidance on how to perform more complex labeling tasks, such as labeling with relations, overlapping regions, selected tasks, or changing labels. 

### Choose which tasks to label
From a project, click **Label All Tasks** to start labeling all tasks. To label the tasks as they are filtered and sorted in the data manager, select **Label Tasks As Displayed** instead. 

You can also label a specific task in the **Quick View** or **Preview** by clicking it from the project data manager view, but you won't automatically see the next task in the labeling queue after submitting your annotations. 

You can also select the checkboxes next to specific tasks and then click **Label $n Tasks** to label the selected number of tasks. For example, select the checkboxes for 5 different tasks, then click **Label 5 Tasks** to label only those 5 tasks. 

### Label a region in the data
Annotate a section of the data by adding a region. 

1. Select the label you want to apply to the region. For some configurations, you can skip this step.
2. Click the text, image, audio, or other data object to apply the label to the region. Your changes save automatically. 
3. Click **Submit** to submit the completed annotation and move on to the next task.

### Label overlapping regions
When you label with bounding boxes and other image segmentation tasks, or when you're highlighting text for NLP and NER labeling, you might want to label overlapping regions. To do this easily, hide labeled regions after you annotate them. 

1. Select the label that you want to apply to the region.
2. Draw the bounding box or highlight the text that you want to label. 
3. In the **Regions** or **Labels** sidebar, locate and select the region that you labeled and click the eye icon to hide the region.
4. Select the next label that you want to apply to the overlapping region.
5. Draw the bounding box or highlight the text that you want to label.
6. Continue hiding and labeling regions until you've completed annotating the task. If you want, select the eye icon next to **Regions** to hide and then show all regions labeled on the task to confirm the end result.
7. Click **Submit** to submit the completed annotation and move on to the next task.

### Select multiple regions

You can select multiple regions while labeling to make changes to them together. 

1. After creating multiple regions, press `ctrl` and click each region that you want to select. You can select regions on the object that you're labeling or in the **Regions** sidebar. Select a range of regions in the **Regions** sidebar by clicking the first region in the list that you want to select and holding `Shift` while you click the last region in the list that you want to select. 
2. After selecting the regions you can apply a label to all selected regions or delete them. 
3. Click a selected region or press `u` to deselect it.

### Duplicate regions
You can duplicate a region to create many identically-sized polygons, rectangles, or ellipses. 

1. Select the region that you want to duplicate.
2. Press `ctrl + d` to duplicate the region, or the sequence of `ctrl + c` and `ctrl + v` to copy and paste the region. Duplicated regions appear in the exact location as the region being duplicated. If you're using a Mac keyboard, use `cmd` instead of `ctrl`. 
3. Click the arrow tool, then move and resize the newly-created region.

### Change the label
You can change the label of an existing region. 

1. Select the labeled region, for example a span, bounding box, image segment, audio region, or other region, on the object or using the **Regions** sidebar.
2. Select a new label. Your changes to the label save automatically. 
3. Click **Submit** to submit the completed annotation and move on to the next task.

### Delete a labeled region
You can delete labeled regions, such as bounding boxes or text spans, if needed.  

1. Select the labeled region on the object or in the **Regions** sidebar. 
2. Press the Backspace key, or go to the **Results** panel and remove the selected annotation.

### Delete an annotation
After labeling a task, you can delete the annotation by clicking the trash can button to delete an annotation on the task. If you haven't saved your annotation yet, click the `X` icon to reset the task and remove your labeling activity.

You can also delete all annotations on a task from the project page. See [Delete tasks or annotations](manage_data.html#Delete_tasks_or_annotations).

### Add relations between annotations

You can create relations between two results with both directions and labels. To add labels to directions, you must set up a labeling config with the relations tag. See more about [relations with labels](/tags/relations.html) in the Tags documentation.

1. Select the region for the annotation that you want to relate to another annotation. If you're creating a direction-based relation, select the first one first. 
2. In the **Regions** section of the **Results** sidebar, click the **Create Relation** button that looks like a hyperlink icon.
3. Select the second region for the annotation to complete the relation.

<br>
<img src="../images/relation.png">

After you relate two annotation regions, you can modify the relation in the **Relations** section of the **Results** sidebar. 
- To change the direction of the relation, click the direction button between the two related regions.
- To add labels to the direction arrow indicating the relation between two annotations, click the vertical ellipsis button next to the two related regions to add your predefined labels. You must have a [label configuration that includes relations](/tags/relations.html) to do this.

### Skipping a task

When annotators skip a task, the task no longer appears in the labeling queue for that annotator. Other annotators still see the task in their labeling queue. 

## Label with collaborators

In both Label Studio and Label Studio Enterprise, you can label tasks with collaborators. Tasks are locked while someone performs annotations so that you don't accidentally overwrite the annotations of another annotator. After the other annotator finishes with the task, it can appear in your queue for labeling if the minimum annotations per task is set to more than one. By default, tasks only need to be annotated by one annotator. 

<div class="enterprise"><p>
If you're using Label Studio Enterprise and want more than one annotator to annotate tasks, <a href="setup_project.html">update the project settings</a>. After you update the minimum annotations required per task, annotators can use the Label Stream workflow to label their tasks.  
</p></div>

If you want to label tasks more than once, even if the minimum annotations required is set to one, do the following:

To label tasks multiple times while the minimum annotations required is set to one, do the following:
1. In the data manager for the project, click a task to open the quick labeling view.
2. Click the `+` icon next to the task annotation ID to open an annotation tab. 
3. Label the task.
4. Click **Submit** to save your annotation.
5. Click the next task in the data manager to open the quick labeling view for that task and repeat steps 2-4.

## Perform ML-assisted labeling with interactive preannotations

If you have a machine learning backend set up to [get interactive preannotations](ml.html#Get-interactive-preannotations), you can choose whether to use those predictions while you label. 

1. After you start labeling, you can enable **Auto-Annotation** to see and use the smart option to assign a label to draw a shape, mask, or assign a keypoint. After using the smart option to draw on an image, or labeling a text or HTML span, the ML backend returns predictions.  
2. For image labeling, you can choose whether to **Auto accept annotation suggestions** after you enable auto-annotation. If you automatically accept annotation suggestions, regions show up automatically and are immediately created. If you don't automatically accept suggestions, the regions appear but you can reject or approve them manually, either individually or all at once. Predicted text regions are automatically accepted.

## Use keyboard shortcuts to label regions faster
Use keyboard shortcuts, or hotkeys, to improve your labeling performance. When performing a labeling task, click the gear icon to see more details about hotkeys or to enable or disable hotkeys. 

This table describes the hotkeys for a standard keyboard. For a Mac keyboard, use return instead of enter, delete instead of backspace, and option instead of alt.

| Key | Description |
| --- | --- | 
| `ctrl` + `enter` | Submit a task. |
| `alt` + `enter` | Update a task. | 
| `ctrl` + `backspace` OR `cmd` + `backspace` | Delete all regions. |
| `escape` | Exit relation mode or unselect a selected region. |
| `backspace` | Delete a selected region. | 
| `alt` + `r` | Create a relation between regions, when a region is selected. | 
| `alt` + `.` | Cycle through all regions in the order listed on the regions sidebar. |
| `alt` + `h` | Hide a selected region. | 
| `ctrl` + `d` OR `cmd` + `d` | Duplicate a selected region. |
| `u` | Unselect a selected region. | 
| `s` | On the data manager, change the row selection to the next row, 1 below the current row. |
| `w` | On the data manager, change the row selection to the previous row, 1 above the current row. |
| `d` | On the data manager, open the labeling quick view for the selected task row. | 
| `a` | On the data manager, close the labeling quick view for the selected task row. |

Other annotation types have labeling-specific shortcuts, such as numbers to select specific labels for named entity recognition tasks. 

### Image-specific hotkeys

When labeling image data types with the `Rectangle`, `BrushLabels`, `Ellipse`, `Polygon`, or `KeyPoints` tags, you can use specific hotkeys to take image labeling-specific actions.

| Key | Description |
| --- | --- | 
| `h` | Pan the image, after zooming in. |
| `v` | Select the mouse arrow. |
| `alt` + `left arrow` | Rotate the image to the left. |
| `alt` + `right arrow` | Rotate the image to the right. |
| `ctrl` + `+` | Zoom in to the image. |
| `ctrl` + `-` | Zoom out of the image. | 
| `k` | If performing key point labeling, select the key point option in the toolbar. |
| `e` | Select the eraser option in the toolbar. | 
| `b` | If performing brush mask labeling, select the brush option in the toolbar. 
| `[` | When the brush or eraser option is selected, decrease the size of the brush or eraser. |
| `]` | When the brush or eraser option is selected, increase the size of the brush or eraser. |

### Audio-specific hotkeys

When labeling audio data types with the `Audio` or `AudioPlus` tags, you can use specific hotkeys to take audio-specific actions.

| Key | Description |
| --- | --- | 
| `ctrl` + `b` OR `cmd` + `b` | Rewind audio 1 second. |

### Time series-specific hotkeys

When labeling timeseries data with the `TimeSeries` tag, you can use specific hotkeys to take actions on a selected region on the time series data.

| Key | Description |
| --- | --- | 
| `left arrow` | Expand the region area to the left. |
| `right arrow` | Expand the region area to the right. |
| `alt` + `left arrow` | Decrease the region area on the left. |
| `alt` + `right arrow` | Decrease the region area on the right. |
| `shift` + `left arrow` | Expand the region area by a larger amount to the left. | 
| `shift` + `right arrow` | Expand the region area by a larger amount to the right. |
| `shift` + `alt` + `left arrow` | Decrease the region area by a larger amount on the left. |
| `shift` + `alt` + `right arrow` | Decrease the region area by a larger amount on the right. |

### Video-specific hotkeys

When labeling video data with the `Video` tag, you can use specific hotkeys to take video-specific actions.

| Key | Description |
| --- | --- | 
| `alt` + `spacebar` | Play or pause video. |
| `alt` + `left arrow` | Rewind one frame. |
| `alt` + `right arrow` | Fast forward one frame. | 

### Customize hotkeys
You can specify custom hotkeys for labeling using the [Shortcut tag](/tags/shortcut.html), or change the hotkeys used for specific actions using an environment variable. 

If you want to change the hotkeys used for specific actions, set the `EDITOR_KEYMAP` environment variable with valid JSON in your `.env` file or when starting Label Studio. For example, to change the keyboard shortcut used to submit an annotation to `shift` + `s`, set the environment variable as follows:
```
EDITOR_KEYMAP='{"annotation:submit":{"key": "shift+s","description": "My Custom Submit Hotkey!"}}'
```
This overwrites the existing hotkey mapping with your custom mapping. See [more about how to set environment variables](start.html#Set-environment-variables). 

Refer to the full list of customizable hotkeys in the [`keymap.json` file of the `label-studio-frontend`](https://github.com/heartexlabs/label-studio-frontend/blob/master/src/core/settings/keymap.json) repository to update a different hotkey combination. 

You cannot use this environment variable to remove an existing or add a new keyboard shortcut. 

## Customize the labeling interface 

Click the settings icon when labeling to configure the labeling interface to suit your labeling use case. 

For example, keep a label selected after creating a region, display labels on bounding boxes, polygons and other regions while labeling, and show line numbers for text labeling.

<center>
  <img src='../images/lsf-settings.png'>
</center>

You can also modify the layout of the screen, hide or show predictions, annotations, or the results panel, and hide or show various controls and buttons.

## Advanced image labeling

If you want to perform advanced image labeling, follow these examples and guidance for assistance. 

### Add multiple types of regions to image annotations

You can add multiple types of regions to image annotations. You can add any of the following:
- Rectangles
- Ellipses
- Keypoints
- Polygons
- Brush masks

To add different types of regions to your image annotations, follow this example.

Create a custom template for your labeling interface using the following example:
```xml
<View>
  <Image name="image" value="$image" />
  <Rectangle name="rect" toName="image" />
  <Ellipse name="ellipse" toName="image" />
  <KeyPoint name="kp" toName="image" />
  <Polygon name="polygon" toName="image" />
  <Brush name="brush" toName="image" />
  <Choices name="choices" toName="image">
    <Choice value="yes"></Choice>
    <Choice value="no"></Choice>
  </Choices>
<Labels name="labels" toName="image" fillOpacity="0.5" strokeWidth="5">
  <Label value="building" background="green"></Label>
  <Label value="vehicle" background="blue"></Label>
  </Labels>
</View>
```

This example makes rectangles, ellipses, polygons, keypoints, and brush masks available to the annotator, along with image classification choices of yes and no, and region labels of building and vehicle.

### Faster image labeling

You can add a rectangle or an ellipse to your image with just two clicks, or double click to create a polygon, rectangle, or ellipse. 

If you accidentally select a point on an image while creating a polygon, just double click to remove the erroneous point and continue creating the region. There must be at least three points on the polygon to be able to remove a point.

### Create regions without labels

When you're annotating images, you can create regions without applying labels. 

1. Create a region by double-clicking or clicking and dragging to create a bounding box, or click the points necessary to construct a polygon.
2. Select the created region in the sidebar or on the image.
3. Select the label that you want to apply to the region.
4. Repeat these steps for any regions that you want to create.

This can be helpful for two-step labeling, where you want one annotator to create regions and another annotator to label the regions. 

By default, regions without labels appear gray.

### Erase brush mask labels

If you make a mistake when labeling with the brush mask, you can erase it. You must select a brush region in the sidebar before you can erase any part of it. 

If you want to completely remove a region and start over, delete the region instead of erasing it. Erasing a region does not delete it. 


<!-- md annotation_ids.md -->

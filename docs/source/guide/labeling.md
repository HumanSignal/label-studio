---
title: Labeling guide
tier: all 
type: guide
order: 134
order_enterprise: 134
meta_title: Label and annotate data
meta_description: Label and annotate data to create bounding boxes, label text spans, set up relations. Filter and sort project data for machine learning dataset creation.
section: "Create & Manage Projects"

---

Label and annotate your data with the open source data labeling tool, Label Studio. After you [set up your project](setup_project.html) and [labeling interface](setup.html) and [import your data](tasks.html), you can start labeling and annotating your data.

1. Open a project in Label Studio and optionally [filter or sort the data](manage_data.html#Filter-or-sort-project-data).    
2. Click **Label All Tasks** to [start labeling](#Start-labeling).
3. Use [keyboard shortcuts](/guide/hotkeys.html) or your mouse to label the data and submit your annotations.
4. Follow the project instructions for labeling and deciding whether to skip tasks. 

You can also [collaborate with other annotators](#Label-with-collaborators) to improve the quality of your labeled data. 

## Start labeling

Some labeling tasks can be complicated to perform, for example, labeling that includes text, image, and audio data objects as part of one dataset and labeling task, or creating relations between annotations on a labeling task. This section includes guidance on how to perform more complex labeling tasks, such as labeling with relations, overlapping regions, selected tasks, or changing labels. 

### Choose which tasks to label
From a project, click **Label All Tasks** to enter the labeling stream. The labeling stream will continuously serve tasks until all available tasks for the annotator have been completed. To label the tasks as they are filtered and sorted in the data manager, click the dropdown arrow and select **Label Tasks As Displayed** instead. 

You can also label a specific task in the **Quick View** or **Preview** by clicking it from the project's **Data Manager** view, but you will not automatically move to the next task in the labeling stream after submitting your annotations. 

You can also select the checkboxes next to specific tasks and then click **Label # Tasks** to label the selected number of tasks. For example, select the checkboxes for 5 different tasks, then click **Label 5 Tasks** to label only those 5 tasks. 

!!! warning
    Do not open the labeling stream (by clicking **Label All Tasks**) in multiple tabs or windows. This could result in you receiving the same task twice, which can circumvent project settings that address annotator overlap. 

### View the labeling interface 

When labeling a task, annotation information is contained within multiple side panels. You can rearrange the position of these panels by dragging and dropping them to your desired location. You can also collapse individual panels or the entire group of panels with the **Collapse** and **Collapse Group** buttons.

<center>
    <img src="../images/label-interface-panels.png" class="gif-border">
    <i>Labeling interface example</i>
</center>

#### Info

When an annotation region is selected, this panel displays the properties, metadata, and available actions. The properties displayed will depend on the type of region selected. The following details and actions are shown for all region types: 

- Region ID
- Create relation between regions
- Edit selected region meta
- Hide selected region
- Delete selected region

#### Comments

This panel allows you to create and view [comments](/guide/comments_notifications.html) within the annotation. Annotators and Reviewers can use comments to share additional context or request clarification directly within Label Studio.

#### History

A list of updates made to the annotation. This includes when an annotation is submitted, updated, reviewed, or when a draft is created. A draft is only visible to the user that created it. You can click an entry to see the state of the annotation at that time. This action does not overwrite the current state of the annotation.

<center>
    <img src="../images/history-panel.png" style="width:50%" class="gif-border">
    <i>View an annotation's history</i>
</center>

#### Regions

This panel lists all regions created within the annotation. You can drag and drop regions to group them manually, or choose to group them by tool or label. You can also lock a region to prevent it from being edited or hide a region.

Regions created by a [prediction](/guide/prompts_predictions.html) are marked with a sparkle symbol.

#### Relations

Any relations [created](#Add-relations-between-regions) between regions appear here. Relations can be used to note a connection between two regions and you can apply a label to the relation when using the [Relations](/tags/relations.html) tag.

You can toggle the visibility for relations by clicking the eye icon or delete a relation by selecting the trash can icon. 

### Label a region in the data
Annotate a section of the data by adding a region. 

1. Select the label you want to apply to the region. For some configurations, you can skip this step.
2. Click the text, image, audio, or other data object to apply the label to the region. Your changes save to your draft automatically. 
3. Click **Submit** to submit the completed annotation and move on to the next task.

### Label overlapping regions
When you label with bounding boxes and other image segmentation tasks, or when you're highlighting text for NLP and NER labeling, you might want to label overlapping regions. To do this easily, you can hide a labeled region with the following steps:

1. Select the label that you want to apply to the region.
2. Draw the bounding box or highlight the text that you want to label. 
3. In the **Regions** panel, locate the region that you created and click the eye icon to hide the region.
4. Select the next label that you want to apply to the overlapping region.
5. Draw the bounding box or highlight the text that you want to label.
6. Continue hiding and labeling regions until you've completed annotating the task. If you want, select the eye icon next to **Regions** to hide and then show all regions labeled on the task to confirm the end result.
7. Click **Submit** to submit the completed annotation and move on to the next task.

For some configurations, you can also hold the `⌘ Command` or `Ctrl` key before clicking and dragging to select a region. This allows you to start a new region instead of selecting the existing region.

### Select multiple regions
You can select multiple regions while labeling to make changes to them together. 

1. After creating multiple regions, hold `⌘ Command` or `Ctrl` and click each region that you want to select in the **Regions** panel.
2. After selecting the regions you can apply a label to all selected regions or delete them. 
3. Click a selected region or press `U` to deselect it.

### Duplicate regions
You can duplicate a region to create many identically-sized polygons, rectangles, or ellipses. 

1. Select the region that you want to duplicate.
2. Press `ctrl + d` to duplicate the region, or the sequence of `ctrl + c` and `ctrl + v` to copy and paste the region. Duplicated regions appear in the exact location as the region being duplicated. If you're using a Mac keyboard, use `cmd` instead of `ctrl`. 
3. Click the arrow tool, then move and resize the newly-created region.

!!! note
    The hotkeys referenced above are the default setting. You can check your [hotkey settings](/guide/hotkeys.html) to see if these were changed.

### Change a region's label
You can change the label of an existing region. 

1. Select the labeled region, for example a span, bounding box, image segment, audio region, or other region, on the object or using the **Regions** panel.
2. Select a new label. Your changes to the label save to your draft automatically. 
3. Click **Submit** to submit the completed annotation and move on to the next task.

### Delete a region
You can delete regions, such as bounding boxes or text spans, if needed.  

1. Select the region on the object or in the **Regions** panel. 
2. Press the `Backspace` key or click the trash can icon in the **Info** panel.

If you delete the wrong region, you can click the **Undo** button to restore it if you have not reloaded the annotation after deletion.

### Delete an annotation
You can delete a submitted annotation, if needed. Deleted annotations cannot be restored.

1. Navigate to the project's **Data Manager** view.
2. Click the task containing the annotation to open the task in **Quick View**.
3. Hover over the desired annotation tab and click the **More Options** icon when it appears.
4. Select **Delete Annotation**. 
5. In the confirmation modal, click **Delete**.

For steps on deleting multiple annotations, please see [Delete tasks or annotations](manage_data.html#Delete-tasks-or-annotations).

### Add relations between regions
You can create relations between two regions with both directions and labels. To add labels to directions, you must set up a labeling configuration with the relations tag. Read more about [relations with labels](/tags/relations.html) in the Tags documentation.

1. Select the region that you want to relate to another region. If you're creating a direction-based relation, select the region that should be the initial region first. 
2. In the **Info** panel, click the **Create Relation** button.
3. Select the second region for the annotation to complete the relation.

<center>
    <img src="../images/relation.png" class="gif-border">
    <i>Add relations between regions</i>
</center>

After you relate two annotation regions, you can modify the relation in the **Relations** panel. 
- To change the direction of the relation, click the directional arrow between the two related regions.
- To add labels to the directional arrow indicating the relation between two regions, click the vertical ellipsis button next to the regions and select your label. These labels must be configured using the [Relations](/tags/relations.html) tag to do this.

!!! note
    Relations do not support multi-level listings for regions. 

### Exit the labeling stream 
When annotators want to submit their current annotation but would like to exit their labeling stream to, for example, pause the [lead time](/guide/dashboard_annotator#Annotation-performance-summaries) calculation on their annotations, they can click the drop-down menu next to **Submit** and then select **Submit and Exit** (or **Update and Exit**). This will submit the current annotation and redirect them to the **Projects** page instead of the next task. 

If they are not ready to submit their annotation, they can check to make sure their draft was saved in the **History** panel and then navigate to the **Projects** page to stop the [lead time](/guide/dashboard_annotator#Annotation-performance-summaries) calculation from running. 

<center>
    <img src="../images/submit-and-exit.png" style="width: 80%" class="gif-border">
    <i>Exit the labeling stream</i>
</center>

## Label with collaborators

You can label tasks with multiple annotators. When task assignment is automatic, tasks are locked while someone performs annotations so that work is not duplicated. After the initial annotator submits the task or the task lock expires, the task can appear in another annotator's stream for labeling if the minimum annotations per task has not been reached. 


!!! note
    By default, tasks only require a single annotation.
    You can set the number of annotations required per task in the project's [Quality settings](/guide/project_settings_lse.html#Quality).

For manual assignment, annotators must be assigned a task in order to create an annotation. A task will remain in the **Annotating** state until all assigned annotators have submitted an annotation.

Users with access to the **Data Manager** view can manually create annotations regardless of assignment or Quality settings with the following steps:

1. In Data Manager, click a task to open the quick labeling view.
2. Click the `+` icon next to the current annotation tabs to open a new annotation tab. 
3. Label the task.
4. Click **Submit** to save your annotation.
5. Click the next task in the data manager to open the quick labeling view for that task and repeat steps 2-4.


## Perform ML-assisted labeling with interactive preannotations

If you have a machine learning backend set up to [get interactive preannotations](ml.html#Get-interactive-preannotations), you can choose whether to use those predictions while you label. 

1. After you start labeling, you can enable **Auto-Annotation** to see and use the smart option to assign a label to draw a shape, mask, or assign a keypoint. After using the smart option to draw on an image, or label a text or HTML span, the ML backend returns predictions.  
2. For image labeling, you can choose whether to **Auto accept annotation suggestions** after you enable auto-annotation. If you automatically accept annotation suggestions, regions show up automatically and are immediately created. If you don't automatically accept suggestions, the regions appear, but you can reject or approve them manually, either individually or all at once. Predicted text regions are automatically accepted.


## Customize the labeling interface 

Click the settings icon when labeling to configure the labeling interface to suit your use case. 

For example, keep a label selected after creating a region, display labels on bounding boxes, polygons and other regions while labeling, and show line numbers for text labeling.


<center><img style="width: 50%" src='../images/lsf-settings.png' class="gif-border">
<i>Customize the labeling interface</i></center>

You can also change the position of the annotation tabs (for **Quick View**), hide or show various controls and buttons, and review hotkey settings.


## Advanced image labeling

If you want to perform advanced image labeling, follow these examples and guidance for assistance. 

### Add multiple types of regions to image annotations
You can add multiple types of regions to image annotations. For example, you can add any of the following:
- [Rectangles](/tags/rectangle.html)
- [Ellipses](/tags/ellipse.html)
- [Keypoints](/tags/keypoint.html)
- [Polygons](/tags/polygon.html)
- [Brush masks](/tags/brush.html)

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
This example makes rectangles, ellipses, polygons, keypoints, and brush masks available to the annotator, along with image classification choices of `yes` and `no`, and region labels of `building` and `vehicle`.

### Faster image labeling
You can add a rectangle or an ellipse to your image with just two clicks, or double click to create a polygon, rectangle, or ellipse. 

If you accidentally select a point on an image while creating a polygon, just double click to remove the erroneous point and continue creating the region. There must be at least three points on the polygon to remove a point.

### Create regions and add labels
When you're annotating images, you can create regions without applying labels immediately. 

1. Create a custom template using the example provided above under [Add multiple types of regions to image annotations](#Add-multiple-types-of-regions-to-image-annotations).
2. Select which tool you want to use in the labeling toolbar.
3. Create a region by double-clicking or clicking and dragging to create a bounding box, or click the points necessary to construct a polygon.
4. Select the created region in the **Regions** panel or on the image.
5. Select the label that you want to apply to the region.
6. Repeat these steps for any regions that you want to create.

This can be helpful for two-step labeling, where you want one annotator to create regions and another annotator to label the regions. 

Visit our [Tags](/tags) documentation for additional options.

### Erase brush mask labels
If you make a mistake when labeling with the brush mask, you can erase it. 

1. Select the brush region in the **Regions** panel.
2. Select the **Eraser** tool in the toolbar or press `E`.
3. Erase the brush mask from the selected region as needed. The eraser will not erase unselected regions.

If you want to completely remove a region and start over, delete the region instead of erasing it. Fully erasing a region does not delete it. 

{% insertmd includes/annotation_ids.md %}

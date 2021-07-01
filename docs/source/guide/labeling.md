---
title: Label and annotate data 
type: guide
order: 402
meta_title: Label and annotate data
meta_description: Label and annotate data using the Label Studio UI to create bounding boxes, label text spans, set up relations, and filter and sort project data for your machine learning dataset creation.
---

Label and annotate your data with the open source data labeling tool, Label Studio. After you [set up your project](setup_project.html) and [labeling interface](setup.html) and [import your data](tasks.html), you can start labeling and annotating your data.

1. Open a project in Label Studio and optionally [filter or sort the data](#Filter-or-sort-project-data).    
2. Click **Label** to [start labeling](#Start-labeling).
3. Use [keyboard shortcuts](#Use-keyboard-shortcuts-to-label-regions-faster) or your mouse to label the data and submit your annotations.
4. Follow the project instructions for labeling and deciding whether to skip tasks. 
5. Click the project name to return to the data manager.

You can also [collaborate with other annotators](#Label-with-collaborators) to improve the quality of your labeled data. 

## Filter or sort project data

When you filter or sort the data before you label it, you modify which tasks and the order of the tasks you see when labeling. While [task sampling](start.html#Set_up_task_sampling_for_your_project) affects the task order for an entire project and can't be changed, filtering and sorting tasks can be changed at any time. 

### Example: Label new data first
Sort the data in your project by date to focus on labeling the newest data first.

1. In a project, update the **Order** of the data from the default to **Created at**.
2. Update the order of the items to be in ascending order, so the newest items appear first. 
3. Click **Label** to start labeling tasks from newest to oldest. 

### Example: Sort by prediction score
You can sort the data in your project by prediction score if you upload [pre-annotated data](predictions.html) with prediction scores, or if your [machine learning backend](ml.html) produces prediction scores as part of the model output. 

1. In a project, update the **Order** of the data from the default to use the **Prediction score** field.
2. Update the order of the items in either ascending or descending order to label based on higher confidence or lower confidence predictions. 
3. Click **Label** to start labeling tasks in prediction score order. 
You can also use [task sampling](start.html#Set_up_task_sampling_for_your_project) to use prediction score ordering.

### Example: Split a dataset using tabs and filters
If you want to label a large dataset, you might want to use tabs and filters to split it up into smaller sections, and assign different annotators to different tabs. You can't assign annotators to specific tasks in Label Studio Community Edition, but you can rename the tabs after specific annotators as a way to basically assign tasks using tabs.  

For example, you might split a dataset with 300 images into 3 different tabs, and have different annotators focus on each tab:
1. In a project, create a filter where the **ID** field **is between** the values "1" and "100". Click away from the filter to review filtered items the tab.
2. Click the vertical ellipsis for the tab and select **Rename**. Name it after a specific annotator that you want to focus on the items in that tab.
3. Click the **+** icon to create a new tab. Click the vertical ellipsis for the new tab and select **Rename** to name it after a second annotator.
4. On the new tab, create a filter where the **ID** field **is between** the values "101" and "200". Click away from the filter to review the filtered items on the tab.
5. Click the **+** icon to create a new tab. Click the vertical ellipsis for the new tab and select **Rename** to name it after a third annotator.
6. On the new tab, create a filter where the **ID** field **is between** the values "201" and "300". Click away from the filter to review the filtered items on the tab.
7. Any annotator can log in and navigate to the relevant tab for their work and click the **Label** button to start labeling the subset of tasks on their tab.

## Start labeling

From a project, click **Label** to start labeling. You can also label a specific task by clicking it when viewing the data in a project, but you won't automatically see the next task in the labeling queue after submitting your annotations. 

Some labeling tasks can be complicated to perform, for example, labeling that includes text, image, and audio data objects as part of one dataset and labeling task, or creating relations between annotations on a labeling task.

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

### Change the label
You can change the label of an existing region. 

1. Select the labeled region, for example a span, bounding box, image segment, audio region, or other region. 
2. Select a new label. Your changes to the label save automatically. 
3. Click **Submit** to submit the completed annotation and move on to the next task.

### Delete an annotation
After labeling a region, you can delete the annotation. 
1. Select the labeled region.  
2. Press the Backspace key, or go to the **Results** panel and remove the selected annotation. 

You can also delete all annotations on a task from the project page. See [Delete tasks or annotations](setup.html#Delete_tasks_or_annotations).

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

### <i class='ent'></i> Assign annotators to tasks

In Label Studio Enterprise, if you're an administrator or project manager, you can assign annotators to tasks in a specific project. After you [add the annotator to the project or workspace](setup_project.html#Add-members-to-a-project), assign the annotator to specific tasks.

1. For a specific project, select tasks on the Data Manager.
2. Select the dropdown and choose **Assign Annotators**.
3. Select names of annotators and click the `>` arrow to assign them to the selected tasks.
4. Click **Assign**. 

## Use keyboard shortcuts to label regions faster
Use keyboard shortcuts (hotkeys) to improve your labeling performance. When performing a labeling task, click the gear icon to see more details about hotkeys or to enable or disable hotkeys. 

This table describes the hotkeys for a standard keyboard. For a Mac keyboard, use return and delete instead of enter and backspace.

| Key | Description |
| --- | --- | 
| ctrl+enter | Submit a task |
| ctrl+backspace | Delete all regions |
| escape | Exit relation mode |
| backspace | Delete selected region | 
| alt+shift+$n | For $n region, select a region |


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

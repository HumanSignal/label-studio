---
title: Label and annotate data in Label Studio
type: guide
order: 401
meta_title: Labeling Interface
meta_description: Label Studio Documentation for labeling and annotating various types of data and labeling tasks for machine learning and data science projects.
---

Label and annotate your data with the open source data labeling tool, Label Studio. After you [set up your project](setup.hmtl) and [import your data](tasks.html), you can start labeling and annotating your data.  

1. Open a project in Label Studio and optionally filter or sort the data.    
2. Click **Label** to start labeling.
3. Use keyboard shortcuts or your mouse to label the data and submit your annotations.
4. Follow the project instructions for labeling and deciding whether or not to skip tasks. 
5. Click the project name to return to the data manager. 

When collaborating with other users, tasks are locked so that you don't accidentally overwrite the annotations of another annotator. After the other annotator finishes with the task, it can appear in your queue for labeling. 

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
You can also use [task sampling](start.html#Set_up_task_sampling_for_your_project) to use some prediction score ordering.

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

From a project, click **Label** to start labeling. You can also label a specific dataset item by clicking it when viewing the data in a project, but you won't automatically see the next task in the labeling queue after submitting your annotations. 

Some labeling tasks can be complicated to perform, for example, labeling that includes text, image, and audio data objects as part of one dataset and labeling task, or creating relations between annotations on a labeling task.

### Label a region in the data
Annotate a section of the data by adding a region. 

1. Select the label you want to apply to the region. For some configurations, you can skip this step.
2. Click the text, image, audio, or other data object to apply the label to the region. 

Your changes save automatically. 

### Change the label
You can change the label of an existing region. 

1. Select the labeled region, for example a span, bounding box, image segment, audio region, or other region. 
2. Select a new label.

Your changes save automatically. 

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

Click the gear icon when labeling to configure the labeling interface to suit your labeling use case, for example, to display labels on bounding boxes, polygons and other regions while labeling.

<center>
  <img src='../images/lsf-settings.png'>
</center>

You can modify the layout of the screen, hide or show predictions, annotations, or the results panel, and hide or show various controls and buttons.



---
title: Label and annotate data in Label Studio
type: guide
order: 401
meta_title: Labeling Interface
meta_description: Label Studio Documentation for labeling and annotating various types of data and labeling tasks for machine learning and data science projects.
---

Label and annotate your data with the open source data labeling tool, Label Studio. After you [set up your project](setup.hmtl) and [import your data](tasks.html), you can start labeling and annotating your data.  

1. Inside a project, click **Label** to start labeling.
2. Use keyboard shortcuts or your mouse to label the data and submit your annotations.
3. Follow the project instructions for labeling and deciding whether or not to skip tasks. 
4. Click the project name to return to the data manager. 

When collaborating with other users, tasks are locked so that you don't accidentally overwrite the annotations of another annotator. After the other annotator finishes with the task, it can appear in your queue for labeling. 

## Complex annotation actions 
Some labeling tasks can be complicated to perform, for example, labeling that includes text, image, and audio data objects as part of one dataset and labeling task, or creating relations between annotations on a labeling task. 

### Label a region in the data
Annotate a section of the data by adding a region. 

1. Select the label you want to apply to the region. For some configurations, you can skip this step.
2. Click the text, image, audio, or other data object to apply the label to the region. 

Your changes save automatically. 

### Change the label
You can change the label of the existing region. 

1. Select the labeled region, for example a span, bounding box, image segment, audio region, or other region. 
2. Select a new label.

Your changes save automatically. 

### Delete an annotation
After labeling a region, you can delete the annotation. 
1. Select the labeled region.  
2. Press the Backspace key, or go to the **Results** panel and remove the selected annotation. 

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

Click the gear icon when labeling to configure the labeling interface to suit your labeling use case. 

For example, to display labels on bounding boxes, polygons and other regions while labeling:

<center>
  <img src='../images/lsf-settings.png'>
</center>

You can modify the layout of the screen, hide or show predictions, annotations, or the results panel, and hide or show various controls and buttons.



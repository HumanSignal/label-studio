---
title: Label and annotate data in Label Studio
type: guide
order: 105
---

Label and annotate your data with the open source data labeling tool, Label Studio. After you [set up your project](setup.hmtl) and [import your data](tasks.html), you can start labeling and annotating your data.  

Most labeling tasks are straightforward to perform, with basic labeling configs outlining the labeling interface, but other labeling tasks are more complex. 

For example, multi-task labeling that includes text, image, and audio data objects as part of one dataset and labeling task. 
<br>

<img src="/images/labeling.png">
<!--replace screenshot, it's out of date-->


## Label and annotate your data 

Most of the actions described in this section are similar for all the data object tags (images, audio, text, and so on).

### Choices, TextArea and other basic tags
These tags create straightforward labeling interfaces that don't require detailed instructions. 

### Add a region
Annotate a section of the data by adding a region. 

1. Select the label you want to apply to the region. For some tags, such as adding polygons, you can skip this step.
2. Click the data object to apply the label to the region. 

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
<img src="/images/screens/relations.png">
<!--relations look a little bit different now, update this-->

After you relate two annotation regions, you can modify the relation in the **Relations** section of the **Results** sidebar. 
- To change the direction of the relation, click the direction button between the two related regions.
- To add labels to the direction arrow indicating the relation between two annotations, click the vertical ellipsis button next to the two related regions to add your predefined labels. You must have a [label configuration that includes relations](/tags/relations.html) to do this.


## Accelerate your labeling workflow
Use keyboard shortcuts (hotkeys) to improve your labeling performance. When performing a labeling task, click the gear icon to see more details about hotkeys or to enable or disable hotkeys. 

This table describes the hotkeys for a standard keyboard. For a Mac keyboard, use cmd, return, and delete instead of ctrl, enter, and backspace.

| Key | Description |
| --- | --- | 
| ctrl+enter | Submit a task |
| ctrl+backspace | Delete all regions |
| escape | Exit relation mode |
| backspace | Delete selected region | 
| alt+shift+$n | For $n region, select a region |


Click the gear icon when labeling to configure the labeling interface to suit your labeling use case. You can modify the layout of the screen, hide or show the predictions, completions, or results panel, and hide or show various controls and buttons.

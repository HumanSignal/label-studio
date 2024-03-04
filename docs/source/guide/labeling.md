---
title: Label and annotate data
short: Label data
tier: all 
type: guide
order: 210
order_enterprise: 110
meta_title: Label and annotate data
meta_description: Label and annotate data to create bounding boxes, label text spans, set up relations. Filter and sort project data for machine learning dataset creation.
section: "Labeling"

---

After you [set up your project](setup_project), [configure your labeling interface](setup), and [import your data](tasks.html), you can start labeling and annotating your data.

1. Open a project in Label Studio and optionally [filter or sort the data](manage_data.html#Filter-or-sort-project-data).    
2. Click **Label All Tasks** to [start labeling](#Start-labeling).
3. Use [keyboard shortcuts](hotkeys) or your mouse to label the data and submit your annotations.
4. Follow the project instructions for labeling and deciding whether to skip tasks. 
5. Click the project name to return to the data manager.

You can also [collaborate with other annotators](#Label-with-collaborators) to improve the quality of your labeled data. 


## Start labeling


<div class="opensource-only">

There are several ways you can begin labeling tasks:

* **Quick view**--Manually select each task to label. 

    From the Data Manager list view, click a task to open the labeling interface. 

* **Label stream**--As you finish each task, you move on to the next task automatically. You are shown all incomplete tasks within the project.

    From the Data Manager, click **Label All Tasks** to enter the label stream. You are also shown additional navigation actions such as **Skip** and **Save and Submit**. 

* **Label stream with a filter applied**--Similar to the label stream, but you are only shown the incomplete tasks that are visible in the Data Manager. 

    First, [apply a filter](manage_data#Filter-or-sort-project-data) using the Data Manager. Then click the drop-down arrow next to **Label All Tasks** and select **Label Tasks as Displayed**.

* **Label stream for selected tasks**--Similar to the label stream, but first you select the checkboxes next to the tasks you want to label. 

    When one or more tasks are selected, click **Label *n* Tasks** at the top of the Data Manager. 


!!! note

    An "incomplete task" in this context is one that has not had an annotation submitted and has not been previously skipped by you. You are still shown tasks if you have an unsubmitted annotation draft. 

</div>

<div class="enterprise-only">

How you begin labeling depends on 1) your role and 2) the project settings. 

If you have the Annotator role, you can only begin labeling if the project has been published and you have been assigned tasks. In that case, you can enter the label stream by clicking **Label All Tasks** or **Label My Tasks** when viewing the Projects page. 

![Screenshot of project card with tasks](/images/label/annotator_labelstream.png)

If a project manager has enabled Annotator access to the Data Manager page, then you can click the project name to enter the Data Manager. From here you have several options: 

* **Quick view**--Manually select each task to label. 

    From the Data Manager list view, click a task to open the labeling interface. 

* **Label stream**--As you finish each task, you move on to the next task automatically. You are shown all incomplete tasks within the project.

    From the Data Manager, click **Label All Tasks** to enter the label stream. You are also shown additional navigation actions such as **Skip** (if enabled by a project manager) and **Save and Submit**. 

Administrators and Managers also have the following options:

* **Label stream with a filter applied**--Similar to the label stream, but you are only shown the incomplete tasks that are visible in the Data Manager. 

    First, [apply a filter](manage_data#Filter-or-sort-project-data) using the Data Manager. Then click the drop-down arrow next to **Label All Tasks** and select **Label Tasks as Displayed**.

* **Label stream for selected tasks**--Similar to the label stream, but first you select the checkboxes next to the tasks you want to label. 

    When one or more tasks are selected, click **Label *n* Tasks** at the top of the Data Manager.


!!! note

    An "incomplete task" in this context is one that has not had an annotation submitted and has not been previously skipped by you. You are still shown tasks that have an annotation draft that has not been submitted. 

</div>

### Labeling interface

The labeling interface is what you see when you open a task in Label Studio. 

The labeling interface is highly customizable, so the options that available to you depend on several factors:

<div class="opensource-only">

* The primary customization point is how the labeling interface has been [configured](setup) and what kind of data you are labeling. The determines which tools are available and what you need to do to complete the task. 
* How you have configured your [labeling settings](hotkeys#Configure-your-labeling-settings). 
* Whether you are using an [ML backend to assist](label_advanced#Perform-ML-assisted-labeling-with-interactive-preannotations). 
* Whether you are using Label Studio Enterprise (the Enterprise version has additional customization options and the ability to leave comments). 

!!! error Enterprise
    The screenshots and videos below include a Comments panel. This is only available in Label Studio Enterprise. 

</div>

<div class="enterprise-only">

* The primary customization point is how the labeling interface has been [configured](setup). The determines which tools are available and what you need to do to complete the task. 
* How you have configured your [labeling settings](hotkeys#Configure-your-labeling-settings). 
* Whether you are using an [ML backend to assist](label_advanced#Perform-ML-assisted-labeling-with-interactive-preannotations). 
* Your role. For example, Annotators do not see certain actions, such as the one to delete a submitted annotation. 
* Various [project settings](project_settings_lse), which can determine whether:
    * You can see the **Skip** option. 
    * You are required to leave a comment when skipping a task. 
    * You are allowed to submit an empty annotation. 

</div>


For information on the panels you see in the labeling interface, see [Using the panels within the labeling interface](label_panels)

## Labeling regions

A region is an area within the data that you as identify as an annotator. For example, this can be a box you draw on an image, a section of highlighted text, a video segment, and more. 


### Label a region in the data

Annotate a section of the data by adding a region. 

1. Select the label you want to apply to the region. For some configurations, you can skip this step.
2. Depending on how the labeling interface has been configured, you may need to select a tool to begin. Hover over the toolbar to the right of the labeling interface to see your options. 
3. Click the text, image, audio, or other data object to apply the label to the region. Your changes save automatically. 
4. Click **Submit** to submit the completed annotation and move on to the next task.

The following video demonstrates various regions being added to an image:


<video src="../images/label/regions.mp4" controls="controls" class="gif-border" />

### Label overlapping regions

When you label with bounding boxes and other image segmentation tasks, or when you're highlighting text for NLP and NER labeling, you might want to label overlapping regions. To do this easily, hide labeled regions after you annotate them. 

In the [**Regions** panel](label_panels#Regions-panel), locate and select the region that you labeled and click the eye icon to hide the region. While the region is hidden, you can add your overlapping region. 

### Select multiple regions

Press `ctrl` while selecting regions in the labeling interface or while selecting regions in the [**Regions** panel](label_panels#Regions-panel). 

To deselect a region, click it again or press `u`. 

### Duplicate regions

You can duplicate a region to create many identically-sized polygons, rectangles, or ellipses. 

1. Select the region that you want to duplicate.
2. Press `ctrl + d` to duplicate the region, or the sequence of `ctrl + c` and `ctrl + v` to copy and paste the region. Duplicated regions appear in the exact location as the region being duplicated. If you're using a Mac keyboard, use `cmd` instead of `ctrl`. 
3. Click the arrow tool, then move and resize the newly-created region.

### Change the label for a region

You can change the label of an existing region. 

1. Select the labeled region, for example a span, bounding box, image segment, audio region, or other region, on the object or using the **Regions** panel.
2. Select a new label. Your changes to the label save automatically. 
3. Click **Submit** to submit the completed annotation and move on to the next task.


### Erase brush mask regions

If you make a mistake when labeling with the brush mask, you can erase it. You must select a brush region in the sidebar before you can erase any part of it. 

If you want to completely remove a region and start over, delete the region instead of erasing it. Erasing a region does not delete it. 


## Add relations between regions

You can create a relation to connect two regions. 

To add labels to relation, you must set up a labeling config with the relations tag. See more about [relations with labels](/tags/relations.html).

1. Select a region so that its information is displayed in the [**Info** panel](label_panels#Info-panel).  
2. Click **Create relation between regions** in the **Info** panel. 
3. Select the second region.


After you add a relation between two regions, you can modify the relation in the [**Relations** panel](label_panels#Relations-panel). 
- To change the direction of the relation, click the arrow icon between the two related regions.
- To add labels to the direction arrow indicating the relation between two annotations, click the vertical ellipsis button next to the two related regions to add your predefined labels. You must have a [label configuration that includes relations](/tags/relations.html) to do this.

<video src="../images/label/relations.mp4" controls="controls" style="max-width: 730px;" class="gif-border" />


## Delete regions and annotations

### Delete a region within an annotation

An annotation can comprise multiple regions, and you can delete regions as needed. 

1. Select the region by clicking on it or by selecting it in the **Regions** panel. 
2. Press `Backspace` or go to the **Info** panel and click the delete icon for the selected region.

![Screenshot of Delete action for region](/images/label/region_delete.png)

### Reset an annotation

You can reset your working copy of an annotation by clicking the reset action at the bottom of the labeling interface:

![Screenshot of Reset action](/images/label/reset.png)

Resetting an annotation removes all regions and relations in your working copy. It does not affect comments and does not affect the annotation history. 

Resetting only affects work done in the current working copy of the annotation and does not affect work that has been previously saved as a draft. 

For example, if you add a region, leave the task (automatically saving a draft), and then return to the task, clicking **Reset** does not remove the region you previously added. 

However, if you add a *new* region, the new region becomes part of your working copy. Clicking reset would remove this region. 

### Delete an annotation

When you delete an annotation, you delete everything that is included with the annotation - labels, regions, comments, drafts, etc. 

1. From the Data Manager, click a task to open it in Quick View. 
2. Click the overflow menu next to the task ID that appears above the task. 
3. Select **Delete Annotation**. 

To delete all annotations across all tasks, use the **Actions** menu available from the [Data Manager](manage_data).

![Screenshot of Delete action for the annotation](/images/label/label_delete.png)

<div class="enterprise-only">

!!! note
    This action is not available to users in the Annotator or Reviewer role. 

</div>

## Stop labeling

### Skipping a task

<div class="enterprise-only">

When you skip a task, whether you will see the task again depends on the [project settings](project_settings_lse#Annotation). 

</div>

<div class="opensource-only">

When annotators skip a task, the task no longer appears in the labeling queue for that annotator. Other annotators still see the task in their labeling queue. 

</div>

The **Skip** action is only available from the labeling stream. Otherwise, you can "skip" a task by simply selecting another in the Data Manager. 

### Exit the labeling stream

If you are not finished but would like to exit the labeling stream (for example, to pause the [lead time](/guide/task_format.html#Relevant-JSON-property-descriptions) calculation), you can click the drop-down menu next to **Submit** and then select **Submit and Exit** (or **Update and Exit**). This will submit the current annotation and allow you to exit the labeling stream. 

If you are not done with your annotation, you can simply check to make sure your draft was saved in the history panel and then navigate to the Projects page to stop the [lead time](/guide/task_format.html#Relevant-JSON-property-descriptions) calculation from running. 

<img src="../images/submit-and-exit.png" class="gif-border">


## Label with collaborators

In both Label Studio and Label Studio Enterprise, you can label tasks with collaborators. Tasks are locked while someone performs annotations so that you don't accidentally overwrite the annotations of another annotator. After the other annotator finishes with the task, it can appear in your queue for labeling if the minimum annotations per task is set to more than one. By default, tasks only need to be annotated by one annotator. 

<div class="enterprise-only">

If you're using Label Studio Enterprise and want more than one annotator to annotate tasks, <a href="setup_project.html">update the project settings</a>. After you update the minimum annotations required per task, annotators can use the Label Stream workflow to label their tasks.  

</div>

If you want to label tasks more than once, even if the minimum annotations required is set to one, do the following:

To label tasks multiple times while the minimum annotations required is set to one, do the following:
1. In the data manager for the project, click a task to open the quick labeling view.
2. Click the `+` icon next to the task annotation ID to open an annotation tab. 
3. Label the task.
4. Click **Submit** to save your annotation.
5. Click the next task in the data manager to open the quick labeling view for that task and repeat steps 2-4.



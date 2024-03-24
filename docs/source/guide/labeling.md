---
title: Label and annotate data
short: Label data
tier: all 
type: guide
order: 210
order_enterprise: 110
meta_title: Label and annotate data
meta_description: How to start labeling data.
section: "Labeling"

---

After you [set up your project](setup_project), [configure your labeling interface](setup), and [import your data](tasks), you can start labeling and annotating your data.

<div class="opensource-only">

!!! info Tip
    
    Before you begin, you can [filter or sort the data](manage_data.html#Filter-or-sort-project-data). Enable **Sequential Sampling** to ensure that the tasks in the label stream are shown in the same order they appear in the Data Manager. 

</div>

<div class="enterprise-only">

!!! info Tip
    
    If you have access to the Data Manager, before you begin, you can [filter or sort the data](manage_data.html#Filter-or-sort-project-data).

    If you are a Manager, you can enable **Sequential Sampling** for the project to ensure that Annotators see tasks in the same order in which they appear in the Data Manager. 

</div>

## Start labeling


<div class="opensource-only">

There are several ways you can begin labeling tasks:

* [**Quick view**](label_interface#Quick-view)--Manually select each task to label. 

    From the Data Manager list view, click a task to open the labeling interface. 

* [**Label stream**](label_interface#Label-stream)--As you finish each task, you move on to the next task automatically. You are shown all incomplete tasks within the project.

    From the Data Manager, click **Label All Tasks** to enter the label stream. You are also shown additional navigation actions such as **Skip** and **Save and Submit**. 

* **Label stream with a filter applied**--Similar to the label stream, but you are only shown the incomplete tasks that are visible in the Data Manager. 

    First, [apply a filter](manage_data#Filter-or-sort-project-data) using the Data Manager. Then click the drop-down arrow next to **Label All Tasks** and select **Label Tasks as Displayed**.

* **Label stream for selected tasks**--Similar to the label stream, but first you select the checkboxes next to the tasks you want to label. 

    When one or more tasks are selected, click **Label *n* Tasks** at the top of the Data Manager. 


!!! note

    When labeling tasks, you should not open the label stream simultaneously in two tabs. This could result in you receiving the same task twice, which can circumvent project settings that address annotator overlap.

</div>

<div class="enterprise-only">

How you begin labeling depends on 1) your role and 2) the project settings. 

If you have the Annotator role, you can only begin labeling if the project has been published and you have been assigned tasks. In that case, you can enter the label stream by clicking **Label All Tasks** or **Label My Tasks** when viewing the Projects page. 

![Screenshot of project card with tasks](/images/label/annotator_labelstream.png)

* [**Quick view**](label_interface#Quick-view)--Manually select each task to label. 

    From the Data Manager list view, click a task to open the labeling interface. 
    
    (This is only an option if Manual task assignment is enabled and the project settings allow it. Otherwise, you can only see tasks you have already completed.)

* [**Label stream**](label_interface#Label-stream)--As you finish each task, you move on to the next task automatically. You are shown all incomplete tasks within the project.

    From the Data Manager, click **Label All Tasks** to enter the label stream. You are also shown additional navigation actions such as **Skip** (if enabled by a project manager) and **Save and Submit**. 

Administrators and Managers also have the following options:

* **Label stream with a filter applied**--Similar to the label stream, but you are only shown the incomplete tasks that are visible in the Data Manager. 

    First, [apply a filter](manage_data#Filter-or-sort-project-data) using the Data Manager. Then click the drop-down arrow next to **Label All Tasks** and select **Label Tasks as Displayed**.

* **Label stream for selected tasks**--Similar to the label stream, but first you select the checkboxes next to the tasks you want to label. 

    When one or more tasks are selected, click **Label *n* Tasks** at the top of the Data Manager.


</div>

## Label a region

Click on a label and then click on the text/image/video/other data to begin labeling. They type of tools available to you depend on the labeling configuration. 

For more information, see [Label regions](label_regions). 


## Reset an annotation

You can reset your working copy of an annotation by clicking the reset action at the bottom of the labeling interface:

![Screenshot of Reset action](/images/label/reset.png)

Resetting an annotation removes all regions and relations in your working copy. It does not affect comments and does not affect the annotation history. 

Resetting only affects work done in the current working copy of the annotation and does not affect work that has been previously saved as a draft. 

For example, if you add a region, leave the task (automatically saving a draft), and then return to the task, clicking **Reset** does not remove the region you previously added. 

However, if you add a *new* region, the new region becomes part of your working copy. Clicking reset would remove this region. 


## Delete an annotation

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



---
title: Use the Data Manager in projects
short: Data Manager
type: guide
tier: all
order: 122
order_enterprise: 122
meta_title: Use the Data Manager in projects
meta_description: Manage, filter, and sort project data for your labeling project.
section: "Create & Manage Projects"
parent: "manage_projects_lso"
parent_enterprise: "manage_projects" 

---

After you [set up your project](setup_project.html) and [labeling interface](setup.html) and [import your data](tasks.html), you can filter and sort your data to prepare it for [labeling](labeling.html).

You can also take steps to manage your data, such as assigning annotators to tasks in Label Studio Enterprise, or deleting tasks and annotations if needed. 

<div class="opensource-only">
<br><br>
<center><i>Data Manager Screenshot</i></center>
<img class="make-intense-zoom" src="/images/terms/os/project--data-manager-min.png" alt="Screenshot of the Label Studio UI showing an OCR project including photographs of receipts, prediction scores, and other metadata for each labeling task.">
</div>


<div class="enterprise-only">
<br><br>
<center><i>Data Manager Screenshot</i></center>
<img class="make-intense-zoom" src="/images/terms/ent/project--data-manager-min.png" alt="Screenshot of the Label Studio UI showing an OCR project including photographs of receipts, prediction scores, and other metadata for each labeling task.">
</div>



In Label Studio Community Edition, the data manager is the default view for your data. In Label Studio Enterprise, click **Data Manager** to open and view the data manager page. Every row in the data manager represents a labeling task in your dataset.

## Filter or sort project data

With filters and tabs, you can split data into different sections to be labeled by different annotators, or set up data in a particular order to perform labeling according to prediction score, or another value in your data.

When you filter or sort the data before you label it, you modify which tasks and the order of the tasks you see when labeling. While [task sampling](start.html#Set_up_task_sampling_for_your_project) affects the task order for an entire project and can't be changed, filtering and sorting tasks can be changed at any time. 

<img src="/images/data-manager-filters.png" class="gif-border">

### Example: Label new data first
Sort the data in your project by date to focus on labeling the newest data first.

1. In a project, update the **Order** of the data from the default to **Created at**.
2. Update the order of the items to be in ascending order, so the newest items appear first. 
3. Select **Label Tasks As Displayed** to start labeling tasks from newest to oldest. 

### Example: Sort by prediction score
You can sort the data in your project by prediction score if you upload [pre-annotated data](predictions.html) with prediction scores, or if your [machine learning backend](ml.html) produces prediction scores as part of the model output. 

1. In a project, update the **Order** of the data from the default to use the **Prediction score** field.
2. Update the order of the items in either ascending or descending order to label based on higher confidence or lower confidence predictions. 
3. Select **Label Tasks As Displayed** to start labeling tasks in prediction score order. 
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

## Save filters as tabs

You can create tabs on the data manager to [split your dataset](#Example-Split-a-dataset-using-tabs-and-filters) for labeling, to separate tasks by status (annotated, predicted, unlabeled), or other reasons. 

Tabs that you create depend on your [labeling configuration setup](setup.html), because the labeling configuration defines the data fields available for filtering and sorting. 

!!! note 
    If you make changes to the labeling configuration, any tabs in your data manager are removed. Make sure to finish the project setup before setting up complex tabs in the Data Manager.

<div class="enterprise-only">

## Assign annotators to tasks

In Label Studio Enterprise, if you're an administrator or project manager, you can assign annotators to tasks in a specific project. After you [add the annotator to the project or workspace](setup_project.html#Add-members-to-a-project), assign the annotator to specific tasks. You must assign annotators to tasks if you're using [manual task distribution](setup_project.html#Set-up-task-distribution-for-labeling).

1. For a specific project, select tasks on the Data Manager.
2. Select the dropdown and choose **Assign Annotators**.
3. Select names of annotators and click the `>` arrow to assign them to the selected tasks.
4. Click **Assign**. 

If you want to bulk assign tasks, you can use filters to identify exactly the tasks that you want to assign, then select the top checkbox on the data manager to select all tasks shown and assign them to an annotator.

</div>


## Delete tasks or annotations
If you have duplicate tasks, or want to remove annotations, you can delete tasks and annotations from Label Studio.

1. In Label Studio UI, open the project you want to update.
2. Filter the Data Manager page to show only the data you want to delete. For example, specific annotations, or tasks annotated by a specific annotator. 
3. Select the checkboxes for the tasks or annotations that you want to delete.
4. Select the dropdown with the number of tasks, and choose **Delete tasks** or **Delete annotations**. 
5. Click **Ok** to confirm your action.

If you want to make changes to the labeling interface or perform a different type of data labeling, first select all the annotations for your dataset and delete the annotations.

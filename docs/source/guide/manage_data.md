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

The Data Manager page is where you can view all your labeling tasks, sort and filter your data, import and export data, and perform various actions related to tasks. 

For information on setting up a project, see [Create and configure projects](setup_project). 

<div class="opensource-only">

![Screenshot of the Data Manager](/images/project/dm-community.png)

</div>


<div class="enterprise-only">

![Screenshot of the Data Manager](/images/project/dm-community.png)

</div>

In Label Studio Community Edition, the data manager is the default view for your data. In Label Studio Enterprise, click **Data Manager** to open and view the data manager page. Every row in the data manager represents a labeling task in your dataset.

## Filter or sort project data

With filters and tabs, you can split data into different sections to be labeled by different annotators, or set up data in a particular order to perform labeling according to prediction score, or another value in your data.

When you filter or sort the data before you label it, you modify which tasks and the order of the tasks you see when labeling. While [task sampling](https://labelstud.io/guide/start#Set-up-task-sampling-for-your-project) affects the task order for an entire project and can't be changed, filtering and sorting tasks can be changed at any time. 

<img src="/images/data-manager-filters.png" class="gif-border">

<div class="opensource-only">

!!! error Enterprise
    In Label Studio Enterprise and Starter Cloud, you can use advanced filters against annotation results. For more information, see our [Enterprise documentation](https://docs.humansignal.com/guide/manage_data#Filter-annotation-results). 

</div>

<div class="enterprise-only">

### Filter annotation results

You can also filter on individual annotation results within a task:

<img src="/images/data-manager-filters-lse.png" class="gif-border" >

!!! note
    In Label Studio Community, the `Annotation results` filter is an unstructured text search across all annotations for the task, and the example above would not be achievable.

The following tags are supported:
- All `Labels` tags (ex. `Labels`, `ParagraphLabels`, ...)
- `Choices`
- `Taxonomy`
- `Rating`

**Known limitations:**
- [Taxonomies loaded using `apiUrl`](/templates/taxonomy) will not be detected.


</div>

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
You can also use [task sampling](https://labelstud.io/guide/start#Set-up-task-sampling-for-your-project) to use prediction score ordering.

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

<div class="enterprise-only">

## Agreement and Agreement (Selected) columns

These two columns allow you to see agreement scores at a task level. 

### Agreement

The **Agreement** column displays the average agreement score between all annotators for a particular task. 

Each annotation pair's agreement score will be calculated as new annotations are submitted. For example, if there are three annotations for a task, there will be three unique annotation pairs, and the agreement column will show the average agreement score of those three pairs. 

Here is an example with a simple label config. Let's assume we are using ["Exact matching choices" agreement calculation](stats#Exact-matching-choices-example)
```xml
<View>
  <Image name="image_object" value="$image_url"/>
  <Choices name="image_classes" toName="image_object">
    <Choice value="Cat"/>
    <Choice value="Dog"/>
  </Choices>
</View>
```
Annotation 1: `Cat`  
Annotation 2: `Dog`  
Annotation 3: `Cat`  

The three unique pairs are
1. Annotation 1 <> Annotation 2 - agreement score is `0`
2. Annotation 1 <> Annotation 3 - agreement score is `1`
3. Annotation 2 <> Annotation 3 - agreement score is `0`

The agreement column for this task would show the average of all annotation pair's agreement score:
`33%`

### Agreement (Selected)

The **Agreement (Selected)** column builds on top of the agreement column, allowing you to get agreement scores between annotators, ground truth, and model versions. 

The column header is a dropdown where you can make your selection of which pairs you want to include in the calculation.

<img src="/images/project/agreement-selected.png" class="gif-border" style="max-width:679px">

Under **Choose What To Calculate** there are two options, which can be used for different use cases. 

#### Agreement Pairs

This allows you to select specific annotators and/or models to compare.  


You must select at least two items to compare. This can be used in a variety of ways. 

**Subset of annotators**

You can select a subset of annotators to compare. This is different and more precise than the **Agreement** column which automatically includes all annotators in the score.

This will then average all annotator vs annotator scores for only the selected annotators.

<img src="/images/project/agreement-selected-annotators.png" class="gif-border" style="max-width:679px">

**Subset of models**

You can also select multiple models to see model consensus in your project. This will average all model vs model scores for the selected models.

<img src="/images/project/agreement-selected-models.png" class="gif-border" style="max-width:679px">

**Subset of models and annotators**

Other combinations are also possible such as selecting one annotator and multiple models, multiple annotators and multiple models, etc.

* If multiple annotators are selected, all annotator vs annotator scores will be included in the average.
* If multiple models are selected, all model vs model scores will be included in the average. 
* If one or more annotators are selected along with one or more models, all annotator vs model scores will be included in the average. 

#### Ground Truth Match

If your project contains ground truth annotations, this allows you to compare either a single annotator or a single model to ground truth annotations. 

<img src="/images/project/agreement-selected-gt.png" class="gif-border" style="max-width:679px">


#### Limitations

We currently only support calculating the **Agreement (Selected)** columen for tasks with 20 or less annotations. If you have a task with more than this threshold, you will see an info icon with a tooltip.

<img src="/images/project/agreement-selected-threshold.png" class="gif-border" style="max-width:679px">


#### Example Score Calculations

Example using the same simple label config as above: 

```xml
<View>
  <Image name="image_object" value="$image_url"/>
  <Choices name="image_classes" toName="image_object">
    <Choice value="Cat"/>
    <Choice value="Dog"/>
  </Choices>
</View>
```

Lets say for one task we have the following:
1. Annotation 1 from annotator 1 - `Cat` (marked as ground truth)
2. Annotation 2 from annotator 2 - `Dog`
3. Prediction 1 from model version 1 - `Dog` 
4. Prediction 2 from model version 2 - `Cat` 

Here is how the score would be calculated for various selections in the dropdown

#### `Agreement Pairs` with `All Annotators` selected
This will match the behavior of the **Agreement** column - all annotation pair's scores will be averaged:

1. Annotation 1 <> Annotation 2: Agreement score is `0`

Score displayed in column for this task: `0%`

#### `Agreement Pairs` with `All Annotators` and `All Model Versions` selected
This will average all annotation pair's scores, as well as all annotation <> model version pair's scores
1. Annotation 1 <> Annotation 2 - agreement score is `0`
4. Annotation 1 <> Prediction 1 - agreement score is `0`
5. Annotation 1 <> Prediction 2 - agreement score is `1`
6. Annotation 2 <> Prediction 1 - agreement score is `1`
7. Annotation 2 <> Prediction 2 - agreement score is `0`

Score displayed in column for this task: `40%` 

#### `Ground Truth Match` with `model version 2` selected
This will compare all ground truth annotations with all predictions from `model version 2`.

In this example, Annotation 1 is marked as ground truth and Prediction 2 is from `model version 2`:

1. Annotation 1 <> Prediction 2 - agreement score is `1`

Score displayed in column for this task: `100%` 
</div>

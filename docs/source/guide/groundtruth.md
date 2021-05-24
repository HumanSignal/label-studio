---
title: Define ground truth annotations in Label Studio
type: guide
order: 411
meta_title: Ground Truth annotations 
meta_description: Label Studio documentation about ground truth annotations to use for managing quality of datasets for your machine learning and data science projects.
---

> Beta documentation: Label Studio Enterprise v2.0.0 is currently in Beta. As a result, this documentation might not reflect the current functionality of the product.

Define ground truth annotations in a Label Studio project. Use ground truth annotations as benchmarks when [reviewing annotations](quality.html) and to assess the quality of your annotated dataset. Review ground truths to make sure that annotators are accurately labeling data at the start of the project, and continually throughout the lifecycle of the training dataset creation.

Compare annotations from annotators and model predictions against the ground truth annotations for a task to calculate an accuracy score between 0 and 1.

> Ground truth annotations are only available in Label Studio Enterprise Edition. If you're using Label Studio Community Edition, see [Features of Label Studio](label_studio_compare.html) to learn more.

## Define ground truth annotations for a project

You can create ground truth annotations from a project's Data Manager page:
1. When viewing the data manager for a project, select the checkboxes next to annotated tasks.
2. In the selected tasks dropdown menu, select **Assign ground truths**. If there are multiple annotations for a task, only the first, or earliest annotation is assigned as a ground truth. 
3. Confirm that you want to set the selected task annotations as ground truths. 

You can also assign ground truths when you annotate a task.
1. When labeling a task, create an annotation or select an existing one.
2. Click **Ground Truth**. 

## Manage ground truth annotations for a project

Review and modify the ground truth annotations for a project.

### Review existing ground truth annotations

You can filter the Data Manager to show only tasks with ground truth annotations so that you can review them. 

### Remove ground truth annotations
To remove ground truth annotations, 
1. When viewing the data manager for a project, select the checkboxes next to annotated tasks.
2. In the selected tasks dropdown menu, select **Delete ground truths**. This does not delete the annotation, but changes the status of the ground truth setting for the annotation to false.

You can also remove ground truths when you annotate a task.
1. When labeling a task, create an annotation or select an existing one.
2. Click **Ground Truth**. 
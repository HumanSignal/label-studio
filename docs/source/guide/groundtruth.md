---
title: Define ground truth labels in Label Studio
type: guide
order: 402
meta_title: 
meta_description: 
---

> Beta documentation: Label Studio Enterprise v2.0.0 is currently in Beta. As a result, this documentation might not reflect the current functionality of the product.

Define ground truth labels in a Label Studio project. Use ground truth labels as benchmarks when [reviewing annotations](quality.html) and to assess the quality of your annotated dataset. Review ground truths to make sure that annotators are accurately labeling data at the start of the project, and continually throughout the lifecycle of the training dataset creation.

Compare annotations from annotators and model predictions against the ground truth labels for a task to calculate an accuracy score between 0 and 1.

> Defining ground truth labels is only available in Label Studio Enterprise Edition. If you're using Label Studio Community Edition, see [Features of Label Studio](label_studio_compare.html) to learn more.

## Define ground truth labels for a project

You can create ground truth labels from a project's Data Manager page:
1. When viewing the data manager for a project, select the checkboxes next to annotated tasks.
2. In the selected tasks dropdown menu, select **Assign ground truths**. If there are multiple annotations for a task, only the first, or earliest annotation is assigned as a ground truth. 

You can also assign ground truths when you annotate a task.
1. When labeling a task, create an annotation or select an existing one.
2. Click **Ground Truth**. 

## Manage ground truth labels for a project

You can filter the Data Manager to show only the ground truth labels, to review the distribution of annotations set as ground truths. 
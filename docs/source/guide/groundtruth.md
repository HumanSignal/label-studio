---
title: Manage annotation quality in Label Studio
type: guide
order: 402
meta_title: 
meta_description: 
---

> Beta documentation: Label Studio Enterprise v2.0.0 is currently in Beta. As a result, this documentation might not reflect the current functionality of the product.

Define the annotation quality standards for a project by defining ground truth labels for a project. 

> Defining ground truth labels is only available in Label Studio Enterprise Edition. If you're using Label Studio Community Edition, see [Features of Label Studio](label_studio_compare.html) to learn more.



Ground Truth items is a quality assurance tool for training data. Training data quality is the measure of accuracy and consistency of the training data. Completions from each annotator and the model are compared against their respective ground truth completion, and an accuracy score between 0 and 1 is calculated. Use Ground Truth to ensure the labeling team is accurately labeling data initially, and throughout the lifecycle of the training data.

To create new Ground Truth items, go into data manager, and open individual tasks. Create a new completion or set an existing one and click on _Ground Truth_ button. You can also directly click on the _Star_ icon in the data manager next to a task. In case there are multiple completions inside a task, only the first one will be set as a ground truth.


## Define ground truth labels for a project

## Manage ground truth labels for a project
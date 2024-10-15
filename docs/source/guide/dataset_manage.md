---
title: Manage datasets for Data Discovery - Beta 🧪
short: Manage datasets
tier: enterprise
type: guide
order: 0
order_enterprise: 215
meta_title: Manage a dataset in Label Studio Enterprise
meta_description: How to manage your datasets in Label Studio Enterprise 
date: 2023-08-23 12:07:13
section: "Curate Datasets"
---


## Dataset settings

From the Datasets page, click the overflow menu next to dataset and select **Settings**.  

![Overflow menu next to a dataset](/images/data_discovery/dataset_settings.png)


| Settings page &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;| Description |
| ---------------- | --- |
| **General**             | Edit the dataset name and description. |
| **Storage** | Review the storage settings. For information about the storage setting fields, see their descriptions in [Create a dataset](dataset_create). |
| **Members** | Manage dataset members. See [Add or remove members](#Add-or-remove-members).  |



## Create project tasks from a dataset 

Select the records you want to annotate and click ***n* Records**. From here you can select a project or you can create a new project. 

The selected records are added to the project as individual tasks. 

![Screenshot of the button to add tasks to project](/images/data_discovery/add_tasks.png)

## Add or remove members

From here you can add and remove members. Only users in the Manager role can be added or removed from a dataset. Reviewers and Annotators cannot be dataset members. 

By default, all Owner or Administrator roles are dataset members and cannot be removed. 

| Permission | Roles&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; |
| ---------------- | --- |
| **Create a dataset** | Owner <br><br>Administrator |
| **Delete a dataset** | Owner <br><br>Administrator |
| **View and update dataset settings** | Owner <br><br>Administrator |
| **View and search dataset** | Owner <br><br>Administrator <br><br>Manager |
| **Export records to projects** | Owner <br><br>Administrator <br><br>Manager |




## Delete a dataset

From the Datasets page, select the overflow menu next to dataset and select **Delete**. A confirmation prompt appears. 

Deleting a dataset does not affect any project tasks you created using the dataset.

---
title: Get started with Label Studio
short: Get started
type: guide
order: 100
meta_title: Get Started with Label Studio
meta_description: Get started with Label Studio by creating projects to label and annotate data for machine learning and data science models.
---

## What is Label Studio?

Label Studio is an open source data labeling tool for labeling and exploring multiple types of data. You can perform different types of labeling with many data formats. 

You can also integrate Label Studio with machine learning models to supply predictions for labels (pre-labels), or perform continuous active learning. See [Set up machine learning with your labeling process](ml.html). 

Label Studio is also available in Enterprise and Cloud editions with additional features. See [Label Studio features](label_studio_compare.html) for more.

## Labeling workflow with Label Studio

Start and finish a labeling project with Label Studio by following these steps:

1. [Install Label Studio](install.html).
2. [Start Label Studio](start.html).
2. [Create accounts for Label Studio](signup.html). Create an account to manage and set up labeling projects.
3. <i class='ent'></i> [Restrict access to the project](manage_users.html). Set up role-based access control. Only available in Label Studio Enterprise Edition.
4. [Set up the labeling project](setup_project.html). Define the type of labeling to perform on the dataset and configure project settings.
5. [Set up the labeling interface](setup.html). Add the labels that you want annotators to apply and customize the labeling interface. 
6. [Import data as labeling tasks](tasks.html).
7. [Label and annotate the data](labeling.html). 
8. <i class='ent'></i> [Review the annotated tasks](quality.html). Only available in Label Studio Enterprise Edition.
9. [Export the labeled data or the annotations](export.html).


## Quick start

1. Install Label Studio:
```bash
pip install label-studio
```
2. Start Label Studio
```bash
label-studio start
```
3. Open the Label Studio UI at http://localhost:8080. 
4. Sign up with an email address and password that you create.
5. Click **Create** to create a project and start labeling data.
6. Name the project, and if you want, type a description and select a color.
7. Click **Data Import** and upload the data files that you want to use. If you want to use data from a local directory, cloud storage bucket, or database, skip this step for now.
8. Click **Labeling Setup** and choose a template and customize the label names for your use case. 
9. Click **Save** to save your project. 

You're ready to start [labeling and annotating your data](labeling.html)!

## Label Studio terminology

When you upload data to Label Studio, each item in the dataset becomes a labeling task. The following table describes some terms you might encounter as you use Label Studio.

| Term | Description |
| --- | --- |
| Dataset | What you import into Label Studio, comprised of individual items, or labeling tasks. |
| Task | A distinct item from a dataset that is ready to be labeled, pre-annotated, or has already been annotated. For example: a sentence of text, an image, or a video clip. |
| Region | The portion of the task identified for labeling. For images, an example region is a bounding box. For text, an example region is a span of text. Often has a label assigned to it. | 
| Labels | What you add to each region while labeling a task in Label Studio. |
| Relation | A defined relationship between two labeled regions. |
| Result | A label applied to a specific region as stored in an annotation or prediction. See [Label Studio JSON format of annotated tasks](export.html#Label-Studio-JSON-format-of-annotated-tasks). |
| Predictions | What machine learning models create for an unlabeled dataset. |
| Pre-annotations | Predicted annotations in Label Studio format, either in a file or from a machine learning backend. See [import pre-annotations](predictions.html).
| Annotations | The output of a labeling task. Previously called "completions". |
| Templates | Example labeling configurations that you can use to specify the type of labeling that you're performing with your dataset. See [all available templates](/templates) |
| Tags | Configuration options to customize the labeling interface. See [more about tags](/tags). |

## Components and architecture
You can use any of the Label Studio components in your own tools, or customize them to suit your needs. Before customizing Label Studio extensively, you might want to review Label Studio Enterprise Edition to see if it already contains the relevant functionality you want to build. See [Label Studio Features](label_studio_compare.html) for more.

The component parts of Label Studio are available as modular extensible packages that you can integrate into your existing machine learning processes and tools. 

| Module | Technology | Description |
| --- | --- | --- | 
| [Label Studio Backend](https://github.com/heartexlabs/label-studio/) | Python and [Django](https://www.djangoproject.com/) | Use to perform data labeling. | 
| [Label Studio Frontend](https://github.com/heartexlabs/label-studio-frontend) | JavaScript web app using [React](https://reactjs.org/) and [MST](https://github.com/mobxjs/mobx-state-tree) | Perform data labeling in a user interface. |
| [Data Manager](https://github.com/heartexlabs/dm2) | JavaScript web app using [React](https://reactjs.org/) | Manage data and tasks for labeling. |
| [Machine Learning Backends](https://github.com/heartexlabs/label-studio-ml-backend) | Python | Predict data labels at various parts of the labeling process. |

<br>
<div style="margin:auto; text-align:center;"><img src="/images/ls-modules-scheme.png" style="opacity: 0.8"/></div>
<!--update to include data manager--> 

## Information collected by Label Studio

Label Studio collects anonymous usage statistics about the number of page visits and data types being used in labeling configurations that you set up. No sensitive information is included in the information we collect. The information we collect helps us improve the experience of labeling data in Label Studio and helps us plan future data types and labeling configurations to support. 



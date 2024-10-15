---
title: Project settings
short: Project settings
tier: opensource
type: guide
order: 119
order_enterprise: 0
meta_title: Project settings
meta_description: Brief descriptions of all the options available when configuring the project settings
section: "Create & Manage Projects"
parent: "manage_projects_lso"
date: 2024-02-06 22:28:27
---

!!! error Enterprise
    There are many more possible controls and configurations available for Label Studio Enterprise users. For more information on those options, see [Project settings in Label Studio Enterprise](https://docs.humansignal.com/guide/project_settings_lse). 

## General

Use these settings to specify some basic information about the project. 

| Field          | Description    |
| ------------- | ------------ |
| **Project Name** | Enter a name for the project. |
| **Description**       | Enter a description for the project. |
| **Color**      | You can select a color for the project. The project is highlighted with this color when viewing the Projects page. |
| **Task Sampling**     | <ul><li><strong>Sequential sampling</strong>–Tasks are shown to annotators in the same order that they appear on the Data Manager</li><li><strong>Random sampling</strong>–Tasks are shown in random order.</li></ul> |


## Labeling interface

The labeling interface is the central configuration point for projects. This determines how tasks are presented to annotators. 

For information on setting up the labeling interface, see [Labeling configuration](setup). 

## Annotation

<dl>

<dt>Labeling Instructions</dt>

<dd>

Specify instructions to show the users as they annotate task. This field accepts HTML formatting. 

Enable **Show before labeling** to display a pop-up message to users when they enter the label stream. 

If disabled, users will need to click the **Show instructions** action at the bottom of the labeling interface. 

</dd>

<dt>Live Predictions</dt>

<dd>

If you have an ML backend or model connected, you can use this setting to determine whether tasks should be pre-labeled using predictions from the model. For more information, see [Integrate Label Studio into your machine learning pipeline](ml). 

Use the drop-down menu to select the predictions source. For example, you can select a [connected model](#Model) or a set of [predictions](#Predictions). 

</dd>

</dl>

## Model

Click **Connect Model** to connect a machine learning (ML) backend to your project. For more information on connecting a model, see [Machine learning integration](ml).

You have the following configuration options:

| Field          | Description    |
| ------------- | ------------ |
| **Start model training on annotation submission**         | Triggers the connected ML backend to start the training process each time an annotation is created or updated. <br /><br />This is part of an [active learning loop](https://docs.humansignal.com/guide/active_learning) where the model can be continuously improved as new annotations are added to the dataset. When this setting is enabled, the ML backend's `fit()` method is called, allowing the model to learn from the most recent annotations and potentially improve its predictions for subsequent tasks.   |
| [**Interactive preannotations**](ml#interactive-pre-annotations)         | (Available when creating or editing a model connection)<br /><br />Enable this option to allow the model to assist with the labeling process by providing real-time predictions or suggestions as annotators work on tasks.  <br /><br />In other words, as you interact with data (for example, by drawing a region on an image, highlighting text, or asking an LLM a question), the ML backend receives this input and returns predictions based on it.   |


And the following actions are available from the overflow menu next to a connected model:

| Action          | Description    |
| ------------- | ------------ |
| **Start Training**         | Manually initiate training. Use this action if you want to control when the model training occurs, such as after a specific number of annotations have been collected or at certain intervals.  |
| **Send Test Request**         | (Available from the overflow menu next to the connected model)<br /><br />Use this for troubleshooting and sending a test resquest to the connected model.   |
| **Edit**         | Edit the model name, URL, and parameters. For more information, see [Connect a model to Label Studio](ml#Connect-a-model-to-Label-Studio). |
| **Delete**         | Remove the connection to the model. |

## Predictions

From here you can view predictions that have been imported or generated when executing the **Retrieve Predictions** action from the Data Manager. For more information, see [Import pre-annotated data into Label Studio](predictions). 

## Cloud storage

This is where you connect Label Studio to a cloud storage provider:

* **Source Cloud Storage**--This is where the source data for your project is saved. When you sync your source storage, Label Studio retrieves data to be annotated. 
* **Target Cloud Storage**--This is where your annotations are saved. When you sync your target storage, annotations are sent from Label Studio to the target storage location. 

For more information, see [Sync data from external storage](storage). 

## Webhooks

You can use webhooks to integration third-party applications. For more information, see [Set up webhooks in Label Studio](webhooks) and our [integrations directory](https://labelstud.io/integrations/).

## Danger Zone

From here, you can access actions that result in data loss, and should be used with caution. 

* **Drop All Tabs**

    If the Data Manager is not loading, dropping all Data Manager tabs can help.
* **Delete Project**

    Deleting a project permanently removes all tasks, annotations, and project data from Label Studio.

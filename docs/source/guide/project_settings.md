---
title: Project settings
short: Project settings
tier: opensource
type: guide
order: 165
order_enterprise: 0
meta_title: Project settings
meta_description: Brief descriptions of all the options available when configuring the project settings
section: "Project Management"
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

## Instructions

Specify instructions to show the users as they annotate task. This field accepts HTML formatting. 

Enable **Show before labeling** to display a pop-up message to users when they enter the label stream. 

If disabled, users will need to click the **Show instructions** action at the bottom of the labeling interface. 

## Machine learning

Click **Add Model** to connect an machine learning (ML) backend to your project. For more information about using ML backends, see [Machine learning integration](ml).

<dl>

<dt>ML-Assisted Labeling</dt>

<dd>

| Field          | Description    |
| ------------- | ------------ |
| **Start model training after any annotations are submitted or updated**         | Triggers the connected ML backend to start the training process each time an annotation is created or updated.   |
| **Retrieve predictions when loading a task automatically** | When enabled, Label Studio automatically fetches predictions from the connected ML backend for each task as it is loaded by a user. This means that when a user navigates to a new task, Label Studio sends a request to the ML backend to retrieve any available predictions for that task, which are then displayed to the user. <br /><br />When disabled, someone must manually retrieve predictions. This can be done in using the **Actions** menu in the Data Manager.  |
| **Show predictions to annotators in the Label Stream and Quick View** | When enabled, predictions are shown to users during the labeling process. This is enabled by default.<br /><br />Disable this option to hide predictions from users. For example, you might want to hide predictions to prevent bias. |

</dd>

<dt>Model Version</dt>

<dd>

If you have multiple versions, you can select which version is used to generate predictions. 

</dd>

</dl>

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

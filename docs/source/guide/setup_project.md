---
title: Create and configure projects
short: Create project
type: guide
tier: all
order: 104
order_enterprise: 104
section: "Create & Manage Projects"
meta_title: Set up your labeling project
meta_description: Set up data labeling and annotation projects in Label Studio to produce high-quality data for your machine learning and data science projects.
---

All labeling activities in Label Studio occur in the context of a project.

## Project setup workflow

<div class="opensource-only">

After you [start Label Studio](start) and [create an account](signup), create a project to start labeling your data.

1. [Create a project](#Create-a-project)
2. Import data into Label Studio. 

    For small projects, testing, or proof of concept work, you can import local files directly into Label Studio. However, for larger projects, we recommend setting up cloud storage. For more information, see [Get data into Label Studio](tasks) and [Sync data from external storage](storage). 
3. After you have imported your data, then you can [set up the labeling interface for your project](setup).
4. Finally, you can configure optional settings to such as task sampling and annotation instructions. For more information, see [Project settings](project_settings).
   
</div>

</div>

<div class="enterprise-only">

1. [Create a project](#Create-a-project)
2. [Import data](tasks.html).
3. Select a template to configure the labeling interface for your dataset. [Set up the labeling interface for your project](setup.html).
4. (Optional) [Set up annotation settings for your project](#Set-up-annotation-settings-for-your-project).
5. (Optional) [Set up review settings for your project](#Set-up-review-settings-for-your-project).
2. Import data into Label Studio. 

    For small projects, testing, or proof of concept work, you can import local files directly into Label Studio. However, for larger projects, we recommend setting up cloud storage. For more information, see [Get data into Label Studio](tasks) and [Sync data from external storage](storage). 
3. After you have imported your data, then you can [set up the labeling interface for your project](setup).
4. Next, you will want to configure what information annotators and reviewers can see, and how automated you want their workflow to be. 

    By default, any annotator who is a member of project can begin labeling as soon as it is published, and each task only requires one annotator before being considered complete. To customize this, see the [**Annotation** section of the project settings](project_settings_lse#Annotation).

    By default, reviewers do not need to be assigned to completed tasks, and each task only needs one accepted annotation. To customize this, see the [**Review** section of the project settings](project_settings_lse#Review).
    

5. [Add members to your project](#Add-members-to-a-project). 
6. [Publish your project](#Publish-project-to-annotators).

</div>

## Create a project

From Label Studio, click **Create Project** in the upper right. A window opens with three tabs:

<dl>

<dt>Project Name</dt>

<dd>

This is the only required section. 

Here, select your workspace, enter a project name, and (optionally) a project description. 

Once complete, you can click **Save** to create the project, or you can complete the other tabs. 

</dd>

<dt>Data Import</dt>

<dd>

From here, you can upload files into Label Studio. You can do this now or after the project has been created.

However, for larger projects, we recommend setting up cloud storage or using a different import method. For more information, see [Get data into Label Studio](tasks) and [Sync data from external storage](storage).

</dd>

<dt>Labeling Setup</dt>

<dd>

You can select a template to begin your labeling configuration. For easier setup, select a [template](/templates). You can later customize template to meet your needs. See [Configure labeling](setup).

You can do this now or after the project has been created.

</dd>

</dl>

When you're done, click **Save**. 



<div class="opensource-only">

!!! error Enterprise
    Workspaces are only available for Label Studio Enterprise users. Label Studio Enterprise also includes many additional configuration options for projects, such as role-based access control and workflow automation. For more information, see [Compare Community and Enterprise Features](label_studio_comparison). 

</div>

<div class="enterprise-only">

!!! info Tip
    Rather than importing data directly into the project, you can [create a dataset](dataset_create). From here, you can use an AI-powered search to refine your data, which can then be added to different projects as tasks. For more information, see [Data Discovery overview](dataset_overview).

</div>


<div class="opensource-only">

## Set up annotation settings for your project

There are several things you can set up before users begin labeling:

* [Instructions for data labelers](project_settings#Instructions)

    You also can select whether to show these instructions in a pop-up message when users enter the labeling stream (the labeling stream is when a user clicks **Label All Tasks**). 
* [Task sampling](project_settings#General)
  
    Task sampling determines the order in which tasks are shown to users in the labeling stream.  The default is to use sequential sampling, meaning the users see them in the same order they are sorted in the Data Manager. You can change this to show tasks in random order.  

From the Data Manager, click **Settings** in the upper right. You can also access the settings from the overflow menu for each project:

![Screenshot of project overflow menu](/images/project/project_menu_oss.png)


For information on all available settings, see [Project settings](project_settings). 

## Where Label Studio stores your project data and configurations

All labeling activities in Label Studio occur in the context of a project.

Starting in version 1.0.0, Label Studio stores your project data and configurations in a SQLite database. You can choose to use PostgreSQL instead. See [Set up database storage](storedata.html).

In versions of Label Studio earlier than 1.0.0, when you start Label Studio for the first time, it launches from a project directory that Label Studio creates, called `./my_project` by default.

`label-studio start ./my_project --init`

</div>

<div class="enterprise-only">

## Configure high-impact settings

By design, Label Studio is highly customizable and there are numerous configuration options for a project. To configure project settings, open a project and click **Settings** in the upper right. 

To avoid getting overwhelmed, focus on the following settings. They have the most impact on your labeling experience.

#### Annotation settings

Annotators are the users who are labeling project tasks. 

* **Distribute labeling tasks**

    Located under **Annotation**, this determines whether annotators must be manually assigned to a task in order to label it. 

    If you are using Auto distribution, project members can begin labeling as soon as the project is published. Otherwise, they must be manually assigned. 

* **Allow empty annotations**

    Located under **Annotation**, this determines whether annotators can complete tasks without first adding a label. 

    By default, annotators are allowed to submit empty annotations. You can change this setting so that all tasks require a label. 

* **Annotations per task minimum**

    (This is only applicable if you are using Auto distribution).

    Located under **Quality**, this determines how many annotators must submit a task before the task is considered completed. 

    By default, each task only requires one annotator to submit. You can configure a higher task overlap, meaning that each task must have a minimum number of annotators before being considered complete. 

For a description of all the settings available for annotators, see [Project settings - Annotation](project_settings_lse#Annotation) and [Project settings - Quality](project_settings_lse#Quality). 


#### Review settings

Reviewers are the users are reviewing the annotators' submissions for accuracy. 

* **Mark task as reviewed after it has at least 1 accepted annotation** or  
**Mark task as reviewed after all annotations are processed**

    Configure what action determines that a task has been reviewed. By default, the reviewer only needs to accept one annotation for the task. You can change this so that the reviewer must accept or reject submissions from all annotators. 

* **Review only manually assigned tasks**

    By default, reviewers are able to begin reviewing as soon as there are labeled tasks available to review. However, you can change this so that reviewers must be manually assigned to a task. 

For a description of all the settings available for reviewers, see [Project settings - Review](project_settings_lse#Review). 

## Add members to a project

You can add members to a project in two ways:
* [Add members at the workspace level](workspaces#Add-or-remove-workspace-members). Workspace membership is inherited by projects. 
* Add members at the project level. 

To add members to a specific project:

1. Navigate to the project settings and select **Members**. 
2. Use the search functionality to locate the user that you want to add to the project.
3. Select the checkbox next to their name and click the `>` arrow to add them. Click the opposite arrow `<` to remove members.
4. If the user's organization-level role is Annotator or Reviewer, you can use the drop-down menu to assign them a role specific to this project. 

    Project-level roles are Annotator or Reviewer. So, for example, a user can be an Annotator in one project and a Reviewer in another project. 
5. Click **Save**.

Users are not sent notifications when they are added to a project. 

For more information, see [Project settings - Members](project_settings_lse#Members).

## Publish a project 

In Label Studio Enterprise, you can hide projects from annotators so that you can fully configure the project before anyone can start labeling. When you're ready for annotators to start labeling, publish the project.

1. Open a project and select **Dashboard** in the upper right.
2. Click **Publish**. 

</div>

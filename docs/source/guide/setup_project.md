---
title: Set up your labeling project
type: guide
order: 400
meta_title: Project Setup
meta_description: Label Studio Documentation for setting up data labeling and annotation projects in Label Studio for machine learning and data science projects. 
---

All labeling activities in Label Studio occur in the context of a project. 

After you [start Label Studio](start.html) and [create an account](signup.html), create a project to start labeling your data. 

1. [Create a project](#Create-a-project)
2. [Import data](tasks.html).
3. Select a template to configure the labeling interface for your dataset. [Set up the labeling interface for your project](setup.html).
4. (Optional) [Set up annotation settings for your project](#Set-up-annotation-settings-for-your-project). 
5. (Optional, Label Studio Enterprise only) [Set up review settings for your project](#Set-up-review-settings-for-your-project).

## Create a project

When you're creating a project, you can save your progress at any time. You don't need to import your data and set up the labeling interface all at the same time, but you can.
1. In the Label Studio UI, click **Create**.
2. Type a project name and a description. If you want, choose a color for your project.
3. If you're ready to import your data, click **Data Import** and import data from the Label Studio UI. For details about import formats and data types, see [Get data into Label Studio](tasks.html).
4. If you're ready to set up the labeling interface, click **Labeling Setup** and choose a template or create a custom configuration for labeling. See [Set up the labeling interface for your project](setup.html).
5. When you're done, click **Save** to save your project.

After you save a project, any other collaborator with access to the Label Studio instance can view your project, perform labeling, and make changes. To use role-based access control, you need to use Label Studio Enterprise Edition.

## <img src="/images/LSE/en.svg" width=67 height=18 alt="Enterprise" style="vertical-align:middle"/> Open a project to annotators

In Label Studio Enterprise, you can hide projects from annotators so that you can fully configure the project before annotators can start labeling. When you're ready for annotators to start labeling, open the project to annotators.

Before you can open a project to annotators, make sure that you've done the following:
- [Set up the labeling interface](setup.html).
- [Imported data](tasks.html).
- [Moved the project to the correct workspace](manage_users.html#Create-workspaces-to-organize-projects), if it was in your private sandbox.

To open the project to annotators, do the following: 
1. Open a project and navigate to the project **Dashboard**.
2. Toggle **Open to Annotators** so that the switch is enabled. 
3. Then annotators can view the project and start being assigned tasks according to the method that you use to [distribute tasks for labeling](#Set-up-task-distribution-for-labeling).

## Delete tasks or annotations
If you have duplicate tasks, or want to remove annotations, you can delete tasks and annotations from Label Studio.

1. In Label Studio UI, open the project you want to update.
2. Filter the Data Manager page to show only the data you want to delete. For example, specific annotations, or tasks annotated by a specific annotator. 
3. Select the checkboxes for the tasks or annotations that you want to delete.
4. Select the dropdown with the number of tasks, and choose **Delete tasks** or **Delete annotations**. 
5. Click **Ok** to confirm your action.

If you want to make changes to the labeling interface or perform a different type of data labeling, first select all the annotations for your dataset and delete the annotations.

## Set up annotation settings for your project

Set up annotation settings to configure how you want annotators to perform labeling for your project.

<div class="enterprise"><p>
Some annotation settings are only available in Label Studio Enterprise Edition. If you're using Label Studio Community Edition, see <a href="label_studio_compare.html">Label Studio Features</a> to learn more.
</p></div>

### Set up instructions for data labelers 

In the project settings, you can add instructions and choose whether to show the instructions to annotators before they perform labeling. 

1. Within a project on the Label Studio UI, click **Settings**.
2. Click **Instructions**, or in Label Studio Enterprise, click **Annotation Settings**. 
3. Type instructions and choose whether to show the instructions to annotators before labeling. 
4. Click **Save**. <br/>Click the project name to return to the data manager view. 

Annotators can view instructions at any time when labeling by clicking the (i) button from the labeling interface.

### <img src="/images/LSE/en.svg" width=67 height=18 alt="Enterprise" style="vertical-align:middle"/> Set up task distribution for labeling
Select how you want to distribute tasks to annotators for labeling. Different from task sampling, use this setting to choose whether you need to assign annotators before they can start labeling.

1. Within a project on the Label Studio UI, click **Settings**.
2. Click **Annotation Settings**.
3. Under **Distribute Labeling Tasks**, select one of the following:
    - Auto, the default option, to distribute tasks automatically to annotators.
    - Manual, to show tasks to assigned annotators first, then automatically distribute unassigned tasks.

Your changes save automatically. 

> You can't assign annotators to tasks unless you select the **Manual** option. 

### <img src="/images/LSE/en.svg" width=67 height=18 alt="Enterprise" style="vertical-align:middle"/> Set minimum annotations per task

By default, each task only needs to be annotated by one annotator. If you want multiple annotators to be able to annotate tasks, set the Overlap of Annotations for a project in the project settings.

1. Within a project on the Label Studio UI, click **Settings**.
2. Click **Annotation Settings**.
3. Under **Overlap of Annotations**, select the number of minimum annotations for a task. 
4. Choose whether to enforce the overlap for the default of 100% of tasks, or a smaller percentage. 
5. Choose whether to show tasks that require multiple annotations, **tasks with overlap**, before other tasks that need to be annotated. 
6. Your changes save automatically. Return to the **Data Manager** and assign annotators to the tasks so that they can annotate the tasks. 

#### How task overlap works

For example, if you want all tasks to be annotated by at least 2 annotators:
- Set the minimum number of annotations to **2**
- Enforce the overlap for 100% of tasks.

If you want at least half of the tasks to be annotated by at least 3 people:
- Set the minimum number of annotations to **3**
- Enforce the overlap for 50% of tasks.

If you're using manual distribution of tasks, annotators with tasks assigned to them label those tasks first, then Label Studio automatically distributes the remaining tasks to the project annotators so that the desired overlap and minimum number of annotations per task can be achieved.

### Set annotating options
If you want, you can allow empty annotations.

1. Within a project on the Label Studio UI, click **Settings**.
2. Click **Annotation Settings**.
3. Under **Annotating Options**, select **Allow empty annotations**. By default, empty annotations are allowed.

### Set up task sampling

If you're using Label Studio Community Edition, you must set up task sampling when you start Label Studio. See [Set up task sampling for your project](start.html#Set-up-task-sampling-for-your-project).

<img src="/images/LSE/en.svg" width=64 height=16 alt="Enterprise" style="vertical-align:middle"/> In Label Studio Enterprise, you can set up task sampling in the annotation settings for a project.
1. Within a project on the Label Studio UI, click **Settings**.
2. Click **Annotation Settings**.
3. Select your preferred method of task sampling:
- Uncertainty sampling, where tasks are shown to annotators according to the model uncertainty, or prediction scores.
- Sequential sampling, the default, where tasks are shown to annotators in the same order that they appear on the Data Manager.
- Uniform sampling, where tasks are shown to annotators in a random order.
4. You can also choose whether to show tasks with ground truth labels first. 

Your changes save automatically. 

### <img src="/images/LSE/en.svg" alt="Enterprise" width=67 height=18 style="vertical-align:middle"/> Define the matching function for annotation statistics
Annotation statistics such as annotator consensus are calculated using a matching score. If you want the matching score to calculate matches by requiring exact matching choices, choose that option in the annotation settings.

1. Within a project on the Label Studio UI, click **Settings**.
2. Click **Annotation Settings**.
3. Under **Matching Function**, select **Exact matching choices**.

Your changes save automatically. For more about how annotation statistics are calculated in Label Studio Enterprise, see [Task agreement and annotator consensus in Label Studio](stats.html).

## <img src="/images/LSE/en.svg" alt="Enterprise" width=67 height=18 style="vertical-align:middle"/> Set up review settings for your project

Set up review settings to guide reviewers when they review annotated tasks.

<div class="enterprise"><p>
Review settings and the review stream are only available in Label Studio Enterprise Edition. If you're using Label Studio Community Edition, see <a href="label_studio_compare.html">Label Studio Features</a> to learn more.
</p></div>

### Set up instructions for task reviewers 

In the project settings, you can add instructions and choose whether to show the instructions to reviewers before they start reviewing annotated tasks. 

1. Within a project on the Label Studio UI, click **Settings**.
2. Click **Review Settings**. 
3. Type instructions and choose whether to show the instructions to reviewers before reviewing annotated tasks. 
4. Click **Save**. <br/>Click **Data Manager** to return to the data manager view. 

### Set reviewing options

Configure the reviewing settings for your project.

1. Within a project on the Label Studio UI, click **Settings**.
2. Click **Review Settings**. 
3. Under **Reviewing Options**, choose whether to mark a task as reviewed if at least one annotation has been reviewed, or only after all annotations for a task have been processed.
4. Under **Reviewing Options**, choose whether to anonymize annotators when reviewing tasks. 
Your changes save automatically.

## Where Label Studio stores your project data and configurations

All labeling activities in Label Studio occur in the context of a project.

Starting in version 1.0.0, Label Studio stores your project data and configurations in a SQLite database. You can choose to use PostgreSQL or Redis instead. See [Setup database storage](storedata.html). 

In versions of Label Studio earlier than 1.0.0, when you start Label Studio for the first time, it launches from a project directory that Label Studio creates, called `./my_project` by default. 

`label-studio start ./my_project --init`

### Project directory structure

In versions of Label Studio earlier than 1.0.0, the project directory is structured as follows: 
```
├── my_project
│   ├── config.json     // project settings
│   ├── tasks.json      // all imported tasks in a JSON dictionary: {task_id: task}
│   ├── config.xml      // labeling config for the current project
│   ├── completions     // directory with all completed annotations stored in one file for each task_id 
│   │   ├── <task_id>.json
│   ├── export          // stores archives with all results exported from Label Studio UI 
│   │   ├── 2020-03-06-15-23-47.zip
```

> Warning: Modifying any of the internal project files is not recommended and can lead to unexpected behavior. Use the Label Studio UI or command line arguments (run `label-studio start --help`) to import tasks, export completed annotations, or to change label configurations. 



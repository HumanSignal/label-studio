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
4. (Optional) [Set up instructions for data labelers](#Set-up-instructions-for-data-labelers). 

## Create a project

When you're creating a project, you can save your progress at any time. You don't need to import your data and set up the labeling interface all at the same time, but you can.
1. In the Label Studio UI, click **Create**.
2. Type a project name and a description. If you want, choose a color for your project.
3. If you're ready to import your data, click **Data Import** and import data from the Label Studio UI. For details about import formats and data types, see [Get data into Label Studio](tasks.html).
4. If you're ready to set up the labeling interface, click **Labeling Setup** and choose a template or create a custom configuration for labeling. See [Set up the labeling interface for your project](setup.html).
5. When you're done, click **Save** to save your project.

After you save a project, any other collaborator with access to the Label Studio instance can view your project, perform labeling, and make changes. To use role-based access control, you need to use Label Studio Enterprise Edition.

## Delete tasks or annotations
If you have duplicate tasks, or want to remove annotations, you can delete tasks and annotations from Label Studio.

1. In Label Studio UI, open the project you want to update.
2. Filter the Data Manager page to show only the data you want to delete. For example, specific annotations, or tasks annotated by a specific annotator. 
3. Select the checkboxes for the tasks or annotations that you want to delete.
4. Select the dropdown with the number of tasks, and choose **Delete tasks** or **Delete annotations**. 
5. Click **Ok** to confirm your action.

If you want to make changes to the labeling interface or perform a different type of data labeling, first select all the annotations for your dataset and delete the annotations.

## Set up annotation and review settings for your project

### Set up instructions for data labelers 

In the project settings, you can add instructions and choose whether or not to show the instructions to annotators before they perform labeling. 

1. Within a project on the Label Studio UI, click **Settings**.
2. Click **Instructions**.
3. Type instructions and choose whether or not to show the instructions to annotators before labeling. 
4. Click **Save**. <br/>Click the project name to return to the data manager view. 

Annotators can view instructions at any time when labeling by clicking the (i) button from the labeling interface.













## Where Label Studio stores your project data and configurations

All labeling activities in Label Studio occur in the context of a project.

Starting in version 1.0.0, Label Studio stores your project data and configurations in a SQLite database. You can choose to use PostgreSQL or Redis instead. See [Sync data from cloud or database storage](storage.html). 

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



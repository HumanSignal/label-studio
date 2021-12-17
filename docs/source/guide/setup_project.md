---
title: Set up your labeling project
short: Project setup
type: guide
order: 400
meta_title: Set up your labeling project
meta_description: Set up data labeling and annotation projects in Label Studio to produce high-quality data for your machine learning and data science projects. 
---

All labeling activities in Label Studio occur in the context of a project. 

After you [start Label Studio](start.html) and [create an account](signup.html), create a project to start labeling your data. 

1. [Create a project](#Create-a-project)
2. [Import data](tasks.html).
3. Select a template to configure the labeling interface for your dataset. [Set up the labeling interface for your project](setup.html).
4. (Optional) [Set up annotation settings for your project](#Set-up-annotation-settings-for-your-project). 
5. (Optional, Label Studio Enterprise only) [Set up review settings for your project](#Set-up-review-settings-for-your-project).
6. [Publish your project](#Publish-project-to-annotators). (Label Studio Enterprise only)

## Create a project

When you're creating a project, you can save your progress at any time. You don't need to import your data and set up the labeling interface all at the same time, but you can.
1. In the Label Studio UI, click **Create Project**.
2. Type a project name and a description. If you want, choose a color for your project.
3. If you're ready to import your data, click **Data Import** and import data from the Label Studio UI. For details about import formats and data types, see [Get data into Label Studio](tasks.html).
4. If you're ready to set up the labeling interface, click **Labeling Setup** and choose a template or create a custom configuration for labeling. See [Set up the labeling interface for your project](setup.html).
5. When you're done, click **Save** to save your project.

You can also create a project from a template by clicking **Use Template**. See more about [project templates](#Create-a-project-template).

After you save a project, any other collaborator with access to the Label Studio instance can view your project, perform labeling, and make changes. To use role-based access control, you need to use Label Studio Enterprise Edition.

## Set up annotation settings for your project

Set up annotation settings to configure how you want annotators to perform labeling for your project.

<div class="enterprise"><p>
Some annotation settings are only available in Label Studio Enterprise Edition. If you're using Label Studio Community Edition, see <a href="label_studio_compare.html">Label Studio Features</a> to learn more.
</p></div>

### Set up instructions for data labelers 

In the project settings, you can add instructions and choose whether to show the instructions to annotators before they perform labeling. 

1. Within a project on the Label Studio UI, click **Settings**.
2. Click **Instructions**, or in Label Studio Enterprise, click **Annotation Settings**. 
3. Type instructions and choose whether to show the instructions to annotators before labeling. If you want to provide additional details or links for reference, instructions support HTML markup.
4. Click **Save**. <br/>Click the project name to return to the data manager view. 

Annotators can view instructions at any time when labeling by clicking the (i) button from the labeling interface.

### <i class='ent'></i> Set up task distribution for labeling
Select how you want to distribute tasks to annotators for labeling. Different from task sampling, use this setting to choose whether you need to [assign annotators](manage_data.html##Assign-annotators-to-tasks) before they can start labeling.

1. Within a project on the Label Studio UI, click **Settings**.
2. Click **Annotation Settings**.
3. Under **Distribute Labeling Tasks**, select one of the following:
    - Auto, the default option, to distribute tasks automatically to annotators.
    - Manual, to show tasks to assigned annotators first, then automatically distribute unassigned tasks.

Your changes save automatically. 

> You can't assign annotators to tasks unless you select the **Manual** option. 

### <i class='ent'></i> Set minimum annotations per task

By default, each task only needs to be annotated by one annotator. If you want multiple annotators to be able to annotate tasks, set the Overlap of Annotations for a project in the project settings.

1. Within a project on the Label Studio UI, click **Settings**.
2. Click **Quality**.
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

In Label Studio Community Edition, you can set up task sampling from the command line when you start Label Studio or from the Label Studio UI. 
- To start a project with specific task sampling, see [Set up task sampling for your project](start.html#Set-up-task-sampling-for-your-project).
- To change task sampling settings from the Label Studio UI, do the following:
    1. Within a project on the Label Studio UI, click **Settings**.
    2. On the **General** settings tab, under **Task Sampling**, choose between `Sequential sampling` and `Random sampling`. 
    3. Click **Save**. 
    
<i class='ent'></i> In Label Studio Enterprise, you can set up task sampling in the annotation settings for a project.
1. Within a project on the Label Studio UI, click **Settings**.
2. Click **Annotation Settings**.
3. Select your preferred method of task sampling:
    - Uncertainty sampling, where tasks are shown to annotators according to the model uncertainty, or prediction scores.
    - Sequential sampling, the default, where tasks are shown to annotators in the same order that they appear on the Data Manager.
    - Uniform sampling, where tasks are shown to annotators in a random order.
4. You can also choose whether to show tasks with ground truth labels first. 
   Your changes save automatically. 

### <i class='ent'></i> Define the agreement metrics for annotation statistics
Annotation statistics such as annotator consensus are calculated using an agreement metric. If you want the agreement metric to calculate annotation or prediction agreement by requiring exact matching choices, choose that option in the annotation settings. For more about agreement metrics in Label Studio Enterprise, see [Annotation statistics](stats.html).

1. Within a project on the Label Studio UI, click **Settings**.
2. Click **Quality**.
3. Under **Annotation Agreement**, select **Exact matching choices**.
4. For some types of labeling, you can also select a [specific matching function](stats.html) or add a [custom agreement metric](custom_metric.html). 

Your changes save automatically. 

## <i class='ent'></i> Set up review settings for your project

Set up review settings to guide reviewers when they review annotated tasks. For more about reviewing annotations, see [Review annotations in Label Studio](quality.html)

<div class="enterprise"><p>
Review settings and the review stream are only available in Label Studio Enterprise Edition. If you're using Label Studio Community Edition, see <a href="label_studio_compare.html">Label Studio Features</a> to learn more.
</p></div>

### Set up instructions for task reviewers 

In the project settings, you can add instructions and choose whether to show the instructions to reviewers before they start reviewing annotated tasks. 

1. Within a project on the Label Studio UI, click **Settings**.
2. Click **Review**. 
3. Type instructions and choose whether to show the instructions to reviewers before reviewing annotated tasks. If you want to provide additional details or links for reference, instructions support HTML markup.
4. Click **Save**. <br/>Click **Data Manager** to return to the data manager view. 

### Set reviewing options

Configure the reviewing settings for your project.

1. Within a project on the Label Studio UI, click **Settings**.
2. Click **Review**. 
3. Under **Reviewing Options**, choose whether to mark a task as reviewed if at least one annotation has been reviewed, or only after all annotations for a task have been processed.
4. Under **Reviewing Options**, choose whether to anonymize annotators when reviewing tasks. 
Your changes save automatically.
   
## <i class='ent'></i> Add members to a project

In Label Studio Enterprise, you can [add members to a specific workspace](manage_users.html#Add-or-remove-members-to-a-workspace) or add members to a specific project within a workspace. 

To add members to a specific project, do the following:
1. Within a project, click **Members** and then click **Manage Members**.
2. Locate the user that you want to add to the project.
3. Select the checkbox next to the user's name and click the `>` arrow so that they appear in the list of users that **Belong to the Workspace**.
4. Click **Save**.

After adding a member to a project, you can [assign them as a reviewer](quality.html#Assign-reviewers-to-tasks) or [assign them as an annotator](manage_data.html#Assign-annotators-to-tasks) to tasks in the project. 
   
## <i class='ent'></i> Publish project to annotators

In Label Studio Enterprise, you can hide projects from annotators so that you can fully configure the project before annotators can start labeling. When you're ready for annotators to start labeling, publish the project to annotators.

Before you can open a project to annotators, make sure that you've done the following:
- [Set up the labeling interface](setup.html).
- [Imported data](tasks.html).
- [Moved the project to the correct workspace](manage_users.html#Create-workspaces-to-organize-projects), if it was in your private sandbox.

To publish a project, do the following: 
1. Open a project and navigate to the project **Dashboard**.
2. Click **Publish**. <br/>After the project is published, annotators can view the project and start being assigned tasks according to the method that you use to [distribute tasks for labeling](#Set-up-task-distribution-for-labeling).

## <i class='ent'></i> Create a project template

If you want to easily create a project with the same labeling interface as an existing project in Label Studio Enterprise, create and use a project template.

1. In the project that you want to use as a template, open the **Settings**.
2. In the **General** tab for the project settings, click **Save as Template**.
3. Add a title and description for the project.
4. Click **Save**.

After you create a project template, you can use the template when you create a project. 
1. When viewing projects or workspaces, click **Use Template**.
2. Select a template from the list. 
3. Type a project name and description for the new project. 
4. Click **Create**. The project is created and saved in your Sandbox.
    - Click **Import** to import data.
    - Click **Data Manager** to start annotating.
    

## Where Label Studio stores your project data and configurations

All labeling activities in Label Studio occur in the context of a project.

Starting in version 1.0.0, Label Studio stores your project data and configurations in a SQLite database. You can choose to use PostgreSQL instead. See [Set up database storage](storedata.html). 

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



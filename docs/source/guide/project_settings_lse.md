---
title: Project settings
short: Project settings
tier: enterprise
type: guide
order: 0
order_enterprise: 119
meta_title: Project settings
meta_description: Brief descriptions of all the options available when configuring the project settings
section: "Create & Manage Projects"
parent: "manage_projects"
parent_enterprise: "manage_projects"
date: 2024-02-06 22:28:14
---

!!! error Enterprise
    Many settings are only available in Label Studio Enterprise Edition. If you're using Label Studio Community Edition, see [Label Studio Features](label_studio_compare) to learn more.

!!! error Starter Cloud
    If you see an Enterprise badge: <span class="badge"></span>
    
    This means the setting is not available in Label Studio Starter Cloud. 


## General

Use these settings to specify some basic information about the project. 

| Field          | Description    |
| ------------- | ------------ |
| **Workspace**         | Select a [workspace](workspaces) for the project. |
| **Project Name** | Enter a name for the project. |
| **Description**       | Enter a description for the project. |
| **Color**      | You can select a color for the project. The project is highlighted with this color when viewing the Projects page. |
| **Proxy Credentials**     | Enter proxy credentials. These might be necessary if your task data is protected with basic HTTP access authentication.<br><br> For example, if your Label Studio instance needs to access the internet through a corporate proxy server. |

## Labeling interface

The labeling interface is the central configuration point for projects. This determines how tasks are presented to annotators. 

For information on setting up the labeling interface, see [Labeling configuration](setup). 

## Annotation

Use these settings to configure what options annotators will see and how their labeling tasks are assigned. 

<dl>

<dt>Annotation Instructions</dt>

<dd>

Specify instructions to show the annotators. 

This field accepts HTML formatting, including iframes (click **Preview** to check your formatting).

!!! note
    If you are using HTML formatting and want to include CSS styles, use a `<Style>` block as inline styles will be removed when saving. 

Enable **Show before labeling** to display a pop-up message to annotators when they enter the label stream. If disabled, users will need to click the **Show instructions** action at the bottom of the labeling interface. 

The instructions do not pop-up when opening tasks individually from the Data Manager (Quick View). 

</dd>

<dt id="distribute-tasks">Task Assignment</dt>

<dd>

Select how you want to distribute tasks to annotators for labeling. 

| Field          | Description    |
| ------------- | ------------ |
| **Automatic**         | Annotators are automatically assigned to tasks, and the option to manually assign annotators is disabled. Automatic assignments are distributed to all users with the Annotator role who are project [members](#Members) <br /><br />You can further define the automatic assignment workflow in the [**Quality** settings](#Quality). <br /><br />When Automatic distribution is used, you will also have additional configuration options throughout the project settings, such as task ordering, task reservation, and many settings under **Quality**. |
| **Manual** | [Manually assign](manage_data#Assign-annotators-to-tasks) tasks to annotators and manage their workload directly. Annotators will be able to start on tasks once you've assigned them. |

</dd>

<dt id="task-ordering">Task Ordering Method</dt>

<dd>

*Only available when using Automatic task assignment.* 

Select the order in which tasks are presented to annotators.  

| Field          | Description    |
| ------------- | ------------ |
| **By Task ID** | Tasks are shown to annotators in ascending order by ID. |
| **Random** | Tasks are shown in random order.  |
| **Uncertainty**         | This option is for when you are using a machine learning backend and want to employ [active learning](active_learning). Active learning mode continuously trains and reviews predictions from a connected machine learning model, allowing the model to improve iteratively as new annotations are created.<br /><br />When Uncertainty Sampling is enabled, Label Studio strategically selects tasks with the least confident, or most uncertain, prediction scores from your model. The goal is to minimize the amount of data that needs to be labeled while maximizing the performance of the model. |


</dd>

<dt id="lock-tasks">Task Reservation</dt>

<dd>

*Only available when using Automatic task assignment.* 

Control how long tasks are reserved for annotators. 

Task reservation ensures that the tasks an annotator starts working on are temporarily reserved by them, preventing other annotators from accessing the same tasks until the reservation expires. This helps manage task allocation and keeps project progress efficient. 

!!! note

    Task reservation takes overlap ([**Quality > Annotations per task**](#overlap)) into consideration. For example, if your overlap is `2`, then two annotators can reserve a task simultaneously. 

    When [**Task Assignment**](#distribute-tasks) is set to **Manual**, the Task Reservation setting is hidden because it does not apply. 

A task reservation is put in place as soon as an annotator opens the task. The reservation remains until one of the following happens (whichever happens first):

* The task reservation time expires. 
* The annotator submits the task. 
* The annotator skips the task, and the project **Skip Queue** setting is either **Requeue skipped tasks to others** or **Ignore skipped**.

**Recommended reservation time** 

By default, the task reservation time is 1440 minutes (1 day). This is the maximum time allowed for task reservations.

When setting a reservation time, you should aim to allow a little above the max amount of time it should take to complete a task. 

* **Notes about allowing too much time**

    If you allow too much time for task reservation, you could risk some users becoming blocked. 

    For example, say you have multiple annotators working on a project. Your minimum annotation overlap is set to `2`. 

    If some of your annotators move through their labeling queue looking for the easiest tasks to complete, they could inadvertently leave a large number of tasks locked. Depending on the size of the project and how many annotators you have working, this could result in some annotators unable to continue their work until the task reservation time expires. 

* **Notes about allowing too little time**

    If you set the reservation time too low, you may find that you have many tasks that exceed your minimum overlap setting. 

    For example, say you have multiple annotators working on a project. Your minimum annotation overlap is set to `2`. 
    
    Two annotators begin working on a task and it takes them both 15 minutes to complete, but your reservation time is 10 minutes. This means that after 10 minutes, another annotator can also begin working on that task - resulting in 3 annotations on the task rather than 2 (your minimum annotator overlap).

</dd>

<dt id="annotating-options">Annotation Options</dt>

<dd>

Configure additional settings for annotators. 

| Field          | Description    |
| ------------- | ------------ |
| **Allow empty annotations** | This determines whether annotators can submit a task without making any annotations on it. If enabled, annotators can submit a task even if they haven't added any labels or regions, resulting in an empty annotation. |
| **Show Data Manager to annotators** | When disabled, annotators can only enter the label stream. When enabled, annotators can access the Data Manager. The tasks that are available to them depend on the how task are assigned: <ul><li>Automatic task assignment: Annotators can only see tasks that they have already completed or have created a draft for.</li><li>Manual task assignment: Annotators can only see the tasks that they have been assigned.</li></ul>Note that some information is still hidden from annotators and they can only view a subset of the Data Manager columns. For example, they cannot see columns such as Annotators, Agreement, Reviewers, and more. |
| **Show only columns used in labeling configuration to Annotators** | (Only available if the previous setting is enabled)<br><br /> Hide unused Data Manager columns from Annotators. <br><br />Unused Data Manager columns are columns that contain data that is not being used in the labeling configuration. <br><br />For example, you may include meta or system data that you want to view as part of a project, but you don't necessarily want to expose that data to Annotators. |


</dd>

<dt id="skip">Task Skipping</dt>

<dd>

Configure settings related to the **Skip** action in the labeling stream. 

| Field          | Description    |
| ------------- | ------------ |
| **Allow skipping tasks**         | Use this to show or hide the **Skip** action for annotators. |
| **Require comment to skip** | When enabled, annotators are required to leave a comment when skipping a task. |

!!! info Tip
    You can configure individual tasks to be unskippable in the JSON source for the task. For more information, see [Individual unskippable tasks](skip#Individual-unskippable-tasks)

</dd>


<dt id="skip-queue">Skip Queue</dt>

<dd>

Select how you want to handle skipped tasks. To disallow skipping tasks, you can hide the **Skip** action under the **Task Skipping** section above.

<table>
<thead>
    <tr>
      <th>Field</th>
      <th>Description</th>
    </tr>
</thead>
<tr>
<td>

**Requeue skipped tasks back to the annotator**
</td>
<td>

If an annotator skips a task, the task is moved to the bottom of their queue. They see the task again as they reach the end of their queue. 

If the annotator exits the label stream without labeling the skipped task, and then later re-enters the label stream, whether they see the task again depends on how task assignments are set up. 

* Automatic task assignment: Whether they see the task again depends on if other annotators have since completed the task. If the task is still incomplete when the annotator re-enters the labeling stream, they can update label and re-submit the task. 
* Manual task assignment: The annotator will continue to see the skipped task until it is completed.  

Skipped tasks are not marked as completed, and affect the Overall Project Progress calculation visible from the project Dashboard. (Meaning that the progress for a project that has skipped tasks will be less than 100%.)  

</td>
</tr>
<tr>
<td>

**Requeue skipped tasks to others**
</td>
<td>

*Only applies when using Automatic task assignment.*

If an annotator skips a task, the task is removed from their queue and automatically assigned to a different annotator.

After skipping the task and completing their labeling queue, the annotator cannot return to the skipped task.  

If there are no other annotators assigned to the task, or if all annotators skip the task, then the task remains unfinished. 

Skipped tasks are not marked as completed, and affect the Overall Project Progress calculation visible from the project Dashboard. (Meaning that the progress for a project that has skipped tasks will be less than 100%.) 

Note that if you select this option before switching to Manual mode, this option stays selected and behaves the same as **Ignore skipped**.

</td>
</tr>
<tr>
<td>

**Ignore skipped**
</td>
<td>

How this setting works depends on your task assignment method. 

* Automatic task assignment: If an annotator skips a task, the task is removed from the annotator's queue. 

    If task overlap (as defined in [**Quality > Annotations per task**](#overlap)) is set to 1, then the skipped task is marked as Completed and is not seen again by an annotator. However, if the overlap is greater than 1, then the task is shown to other annotators until the minimum annotations are reached. 

* Manual task assignment: If the annotator skips a task, it is removed from their queue. But other annotators assigned to the task will still see it in their queue.  

For both assignment methods, **Ignore skipped** treats skipped tasks differently when it comes to calculating progress. 

Unlike the other skip queue options, in this case skipped tasks do not adversely affect the Overall Project Progress calculation visible from the project dashboard. (Meaning that the progress for a project that has skipped tasks can still be 100%, assuming all tasks are otherwise completed.)

</td>
</tr>
</table>

</dd>

<dt id="predictions">Task Pre-Labeling</dt>

<dd>

| Field          | Description    |
| ------------- | ------------ |
| **Use predictions to pre-label tasks** | If you have an ML backend or model connected, or if you're using [Prompts](prompts_overview) to generate predictions, you can use this setting to determine whether tasks should be pre-labeled using predictions. For more information, see [Integrate Label Studio into your machine learning pipeline](ml) and [Generate predictions from a prompt](prompts_predictions).  |
| **Model or predictions to use** | Use the drop-down menu to select the predictions source. For example, you can select a [connected model](#Model) or a set of [predictions](#Predictions). |
| **Reveal pre-annotations interactively** | When enabled, pre-annotation regions (such as bounding boxes or text spans) are not automatically displayed to the annotator. Instead, annotators can draw a selection rectangle to reveal pre-annotation regions within that area. This allows annotators to first review the image or text without being influenced by the model’s predictions. Pre-annotation regions must have the attribute `"hidden": true`. <br /><br />This feature is particularly useful when there are multiple low-confidence regions that you prefer not to display all at once to avoid clutter. |

</dd>

</dl>

## Review

Use these settings to configure what options reviewers will see. 

<dl>

<dt>Instructions</dt>

<dd>

Specify instructions to show the reviewers. This field accepts HTML formatting. 

Enable **Show before reviewing** to display a pop-up message to reviewers when they enter the label stream. If disabled, users will need to click the **Show instructions** action at the bottom of the labeling interface.  

</dd>

<dt id="reviewing-options">Reviewing Options</dt>

<dd>

Configure what is required for a task to be considered "reviewed."

!!! note
    This metric determines:

    * **Review stream**: When a task is removed from the review queue.
    * **Data Manager**: The value shown in the **Reviewed** column. 
    * **Export**: Which tasks are included when you want to only include reviewed tasks in your export snapshot.
    * **Dashboards**: Reviewed counts and related metrics. 

<table>
<thead>
    <tr>
      <th>Field</th>
      <th>Description</th>
    </tr>
</thead>
<tr>
<td>

**Task is reviewed after at least one accepted annotation**
</td>
<td>

In a task where multiple annotators submitted labels, the reviewer only needs to accept one to consider the task reviewed. 

</td>
</tr>
<tr>
<td>

**Task is reviewed after all annotations are reviewed**
</td>
<td>

In a task where multiple annotators submitted labels, the reviewer needs to accept or reject annotations submitted by all annotators. 

</td>
</tr>
<tr>
<td>

**Review only manually assigned tasks**
</td>
<td>

If enabled, a reviewer can only see tasks to which they've been assigned. Otherwise, they can view all tasks that are ready for review.

</td>
</tr>
<tr>
<td>

**Show only finished tasks in the review stream**
</td>
<td>

When enabled, a reviewer only sees tasks that have been completed by all required annotators. 

If your project is using auto distribution, then this means a reviewer only sees tasks that have met the **Annotations per task** threshold. 

If your project is using manual distribution, then this means a reviewer only sees tasks in which all assigned annotators have submitted an annotation. 

Note that in most cases, skipped tasks do not contribute towards meeting the minimum.  

</td>
</tr>
</table>

</dd>

<dt id="task-ordering">Task Ordering</dt>

<dd>

Choose the order in which reviewers see tasks in the review stream.

<table>
<thead>
    <tr>
      <th style="width: 20%;">Field</th>
      <th>Description</th>
    </tr>
</thead>
<tr>
<td>

**By Task ID**
</td>
<td>

Tasks are ordered by their numeric ID (ascending). Annotation order within a task remains stable.

</td>
</tr>
<tr>
<td>

**Random**
<span class="badge"></span>
</td>
<td>

Tasks are shown in randomized task order while preserving the stable order of annotations within each task. This mode enables **Task limit (%)** (see below). 

!!! note
    If any tasks are selected in the Data Manager or reviewers use Quickview, this limit will not be applied. You can disable the Data Manager for reviewers in the project settings to avoid these situations.

</td>
</tr>
</table>

</dd>

<dt id="task-limit">Task Limit (%) <span class="badge"></span></dt>

<dd>

Limit the portion of project tasks that are available to reviewers when **Task Ordering** is set to **Random**.

Set this to a percentage from `0` to `100`. 

!!! note
    Note the following:

    * This only applies only when sampling is **Random**. 
    * If you enter a percentage of `≤0` or `≥100`, you will effectively disable limiting. 
    * This limit is applied over the eligible task set after filters (for example, **Show only finished tasks**) are applied.
    * If reviewers open the review stream by selecting tasks and then clicking **Label *n* Tasks** from the Data Manager, they will bypass the limit. 

    For example, if a project has 1,000 tasks and the limit is set to 60%, at most ~600 tasks will be served for review under Random sampling. When the limit is reached, the API returns “no more annotations to review,” and the UI displays **Review finished**.

</dd>

<dt id="reject-options">Reject Options</dt>

<dd>

Configure what rejection options are available to reviewers. 

<table>
<thead>
    <tr>
      <th>Field</th>
      <th>Description</th>
    </tr>
</thead>
<tr>
<td>

**Requeue rejected annotations back to annotators**
</td>
<td>

When a reviewer clicks **Reject**, the annotation is reassigned back to the annotator. 

</td>
</tr>
<td>

**Remove rejected annotations from labeling queue**
</td>
<td>

When a reviewer clicks **Reject**, the annotation is not reassigned back to the annotator. 

</td>
</tr>
<tr>
<td>

**Allow reviewer to choose: Requeue or Remove**
</td>
<td>

Reviewers see the following options:

* **Accept**
* **Remove** -- When selected, the annotation is rejected and removed from the labeling queue. 
* **Requeue** -- When selected, the annotation is rejected and then reassigned back to the annotator.  

For example, a reviewer might decide to requeue an annotation that is nearly correct but just needs a slight change. However, an annotation with numerous errors may be easier to simply reject entirely and remove from the queue. 

Note that when you click **Remove**, the annotation is also marked as cancelled/skipped. This is reflected in various metrics (for example, Data Manager columns and dashboards), and differentiates between the two rejection actions in the API with `was_cancelled: true`. 

</td>
</tr>
</table>

</dd>

<dt id="data-manager">Data Manager</dt>

<dd>

Configure what Data Manager features are available to reviewers.

<table>
<thead>
    <tr>
      <th>Field</th>
      <th>Description</th>
    </tr>
</thead>
<tr>
<td>

**Show the Data Manager to reviewers**
</td>
<td>

When disabled, reviewers can only enter the review stream. When enabled, reviewers can access the Data Manager, where they can select which tasks to review. Some information is still hidden from reviewers and they can only view a subset of the Data Manager columns.

</td>
</tr>
<tr>
<td>

**Show unused task data columns to reviewers in the Data Manager**
</td>
<td>

If reviewers can view the Data Manager, this setting will hide unused columns from them.

Unused Data Manager columns are columns that contain data that is not being used in the labeling configuration.

For example, you may include meta or system data that you want to view as part of a project, but you don’t necessarily want to expose that data to reviewers.

</td>
</tr>
<tr>
<td>

**Show agreement to reviewers in the Data Manager**
</td>
<td>

If reviewers can view the Data Manager, this setting controls whether they can access the **Agreement** column.

</td>
</tr>
</table>

</dd>


## Quality

Use these settings to determine task completeness and agreement metrics. 

<dl>

<dt id="overlap">Overlap of Annotations</dt>

<dd>

!!! note
    Overlap settings only apply when the project is using Automatic distribution mode. If you are using Manual distribution mode, all tasks must be manually assigned - meaning that you are also manually determining overlap.  

By default, each task only needs to be annotated by one annotator. If you want multiple annotators to annotate the same tasks, increase the **Annotations per task**.

<table>
<thead>
    <tr>
      <th>Field</th>
      <th>Description</th>
    </tr>
</thead>
<tr>
<td>

**Annotations per task**
</td>
<td>

The number of distinct annotations you want to allow per task. 

Note that in certain situations, this may be exceeded. For example, if there are long-standing drafts within a project or you have a very low [task reservation](#lock-tasks) time. 

Also note that only annotations created by distinct users count towards the overlap. For example, if the overlap is `2` and a user creates and submits two annotations on a single task (which can be done in Quick View), the overlap threshold will not be reached until another user submits an annotation. 

</td>
</tr>
<tr>
<td>

**Annotations per task coverage**
</td>
<td>

Only available if **Annotations per task** is ≥ 2. 

This setting controls the percentage of the project tasks for which the overlap is enforced. 

For example, if you want all tasks to be annotated by at least 2 annotators:

- Set the number of annotations to **2**
- Enforce the overlap for 100% of tasks.

If you want half of the tasks to be annotated by at least 3 people:

- Set the number of annotations to **3**
- Enforce the overlap for 50% of tasks.

</td>
</tr>
<tr>
<td>

**Show tasks with overlap first** 
</td>
<td>

If your overlap enforcement is less than 100% (meaning that only some tasks require multiple annotators), then the tasks that *do* require multiple annotations are shown first. <br /><br />If your overlap is 100%, then this setting has no effect.

Note that if enabled, this setting supersedes what you specified under [**Annotations > Task Ordering Method**](#task-ordering)

</td>
</tr>
</table> 

</dd>

<dt id="annotation-limit">Tasks Per Annotator Limit <span class="badge"></span></dt>

<dd>

Set limits on how many tasks each individual user can annotate. This can be useful if you are concerned with preventing any potential bias that might arise from a small set of power users completing a majority of project tasks. 

When an annotator reaches their limit, they will see a notification telling them that they have been paused. When paused, an annotator can no longer access the project. 

When **Limit tasks per annotator** is enabled, you will see the following options:

| Field          | Description    |
| ------------- | ------------ |
| **Limit by Number of Tasks**    | Set a specific number of tasks each annotator is able to complete before their progress is paused.   |
| **Limit by Percentage of Tasks** | Calculate the number of tasks each annotator is able to complete as a percentage of tasks within the project.  |

You can set one or both values. Annotators will be paused when they reach whichever limit is smaller.  

To unpause annotators:

* If you increase the limits, previously paused annotators will regain access. 
* If you are using a percentage-based limit and you add more tasks to a project, previously paused annotators will regain access. 

For more information about pausing annotators, including how to manually pause specific annotators, see [Pause an annotator](quality#Pause-an-annotator).

!!! note
    Pauses are enforced for users in Annotator and Reviewer roles. 
    
    So, for example, if a Reviewer is also annotating tasks and they hit the annotation limit, they will be unable to regain access to the project to review annotations unless they are unpaused. 

    Users in the Manager, Administrator, or Owner role are unaffected by the task limit.

</dd>

<dt id="annotator-eval">Annotator Evaluation<span class="badge"></span></dt>

<dd>

!!! note
    Annotator Evaluation settings are only available when the project is configured to [automatically assign tasks](#distribute-tasks). If you are using Manual distribution, this section will not appear in your project settings.
    
    If you switch a project from Automatic to Manual distribution, annotator evaluation is automatically disabled.

Evaluate annotators against [ground truths](ground_truths) within a project. A "ground truth" annotation is a verified, high-quality annotation that serves as the correct answer for a specific task.

When enabled, this setting looks at the agreement score for the annotator when compared solely against ground truth annotations. You can decide to automatically pause an annotator within the project if their ground truth agreement score falls below a certain threshold. 

!!! note 
    Enabling annotator evaluation means that ground truth tasks are not constrained by the [annotator overlap](#overlap). For example, if you set overlap to `2`, but you have 10 annotators, all 10 will still be able to add annotations to ground truth tasks. 

!!! info Tip
    You can specify that ground truth tasks should be unskippable by adding `"allow_skip": false` as part of the JSON task definition that you import to your project. For more information, see [Individual unskippable tasks](skip#Individual-unskippable-tasks)

<table>
<thead>
    <tr>
      <th>Field</th>
      <th>Description</th>
    </tr>
</thead>
<tr>
<td>

**Evaluate all annotators against ground truth** 
</td>
<td>

Select this to enable annotator evaluation for the project. 

</td>
</tr>
<tr>
<td>

**Onboarding evaluation**
</td>
<td>

When annotators enter the labeling stream, they are first presented with tasks that have a ground truth annotation. This ensures that annotators meet your evaluation standards before progressing through the remaining project tasks. 

Use the counter to determine how many ground truth tasks should be presented first before the annotator progresses through the remaining project tasks. 

Set this counter to zero if you want to skip onboarding and only use continuous evaluation. 
</td>
</tr>
<tr>
<td>

**Continuous evaluation**
</td>
<td>

Annotators are presented with tasks in the order that is configured under [**Task Ordering Method**](#task-ordering). 

To have all ground truths presented as part of continuous evaluation, set the **Onboarding evaluation** counter to zero. You can also use a combination of both, so that annotators see a subset of ground truths immediately, and then are presented the remaining ground truths periodically as they progress through the project (depending on your task ordering method). 

</td>
</tr>
<tr>
<td>

**Pause annotator on failed evaluation** 
</td>
<td>

Determines whether annotators should be paused if they do not meet the required score set below. If they fail to meet the score, they are immediately paused and unable to access the project. 

If you do not enable pausing, the other **Annotator Evaluation** options are simply calculated in the background and can be reviewed in the [Members dashboard](dashboard_members).

</td>
</tr>
<tr>
<td>

**Score required to pass evaluation** 
</td>
<td>

This is the agreement score threshold that an annotator must meet when evaluated against ground truth annotations. How agreement is calculated depends on what you select in the [**Agreement** section](#task-agreement). 

If they do not meet this score, they are paused. 

</td>
</tr>
<tr>
<td>

**Number of tasks for evaluation** 
</td>
<td>

This is the number of tasks a user has to complete before they can potentially be paused.  

For example, if you set this to `10`, even if the annotator gets every single task wrong, they will not be paused until after they have completed 10 ground truth tasks. 

If they reach 10 tasks and meet the required score, they will continue progressing through the remaining ground truth tasks until they either fall below the score (in which case they are paused), or they finish their evaluation and continue on to the rest of the project queue. 

</td>
</tr>
</table> 

You can see which users are paused from the **Members** page. 

When users are paused as part of the annotator evaluation workflow, you cannot manually unpause them. To unpause a user, you will need to relax the evaluation settings for the project by increasing the minimum number of tasks or the score threshold.  

For more information about pausing annotators, including how to manually pause specific annotators, see [Pause an annotator](quality#Pause-an-annotator).

!!! note
    Pauses are enforced for users in Annotator and Reviewer roles.  
    
    So, for example, if a Reviewer is also annotating tasks and they fail to meet the required ground truth agreement score, they will be unable to regain access to the project to review annotations unless they are unpaused. 

    Users in the Manager, Administrator, or Owner role are unaffected by evaluation requirements. 

</dd>

<dt id="task-agreement">Agreement</dt>

<dd>

When multiple annotators are labeling a task, the task agreement reflects how much agreement there is between annotators. 

For example, if 10 annotators review a task and only 2 select the same choice, then that task would have a low agreement score.  

You can customize how task agreement is calculated and how it should affect the project workflow. For more information, see [Task agreement and how it is calculated](stats). 

<table>
<thead>
    <tr>
      <th>Field</th>
      <th>Description</th>
    </tr>
</thead>
<tr>
<td>

**Agreement metric**
</td>
<td>

Select the [metric](stats#Available-agreement-metrics) that should determine task agreement.

</td>
</tr>
<tr>
<td>

**Assign additional annotator**

<span class="badge"></span>
</td>
<td>
Enable this option to automatically assign an additional annotator to any tasks that have a low agreement score. 

This will ensure that the task is not marked complete until 1) it meets the required [overlap](#overlap) and 2) a minimum agreement score is achieved (this is specified below).

Note that to see this setting, the project must be set up with [automatic task assignments](#distribute-tasks).

</td>
</tr>
<tr>
<td>

**Agreement threshold**

<span class="badge"></span>
</td>
<td>

Enter the agreement score that a task must meet before it can be considered complete.

</td>
</tr>
<tr>
<td>

**Maximum additional annotators**

<span class="badge"></span>
</td>
<td>

Enter a maximum number of annotators that can be automatically assigned to the task. 

Annotators are assigned one at a time until the agreement threshold is achieved. 

</td>
</tr>
</table>

!!! note
    When configuring **Maximum additional annotators**, be mindful of the number of annotators available in your project. If you have fewer annotators available than the sum of [**Annotations per task**](#overlap) + **Maximum additional annotators**, you might encounter a scenario in which a task with a low agreement score cannot be marked complete.

</dd>

<dt>Custom weights</dt>

<dd>

Set custom weights for tags and labels to change the agreement calculation. The options you are given are automatically generated from your labeling interface setup. 

Weights set to zero are ignored from calculation.

</dd>
</dl>

## Members

Use this page to control which users are project members. 

Project members have access to published projects, depending on the permissions associated with their role. For more information, see [User roles and permissions](admin_roles). 

Some users cannot be added or removed from the Members page at the project level. These users include administrators, who already have access to every project (outside of the Sandbox). This also includes users who have been added as members to the Workspace. Workspace membership is inherited by the projects within the workspace.   

* If you have [Automatic distribution](#distribute-tasks) enabled, users with the Annotator role are automatically assigned tasks when they are added as members. Similarly, by default, project members with the Reviewer role are able to begin reviewing annotations once the tasks are labeled. 

* If you have [Manual distribution](#distribute-tasks) enabled, you need to add users with the Annotator role as project members before you can assign them to tasks. And if you have [**Review only manually assigned tasks**](#reviewing-options) enabled, the users with the Reviewer role must also be project members before they can be assigned to tasks. 

#### Project-level roles

Project-level roles are Annotator and Reviewer. 

Users with these roles have their access constrained to the project level (meaning they cannot view organization-wide information and can only view project data when added to a project and assigned tasks). For more information, see [User roles and permissions](admin_roles).

For Annotators and Reviewers, you can change their default role on a per-project basis to suit your needs. For example, a user can be assigned as an Annotator to "Project 1" and as a Reviewer to "Project 2." 

To assign a project-level role, first add the person to your project. Once added, you can use the drop-down menu to change their role:

![Screenshot of project-level role action](/images/project/member_roles.png)

!!! note
    This is only available for users who have the Annotator or Reviewer role applied at the organization level. Users with Manager, Administrator, and Owner role cannot have their permissions downgraded to Annotator or Reviewer on a per-project basis. 

## Model

Click **Connect Model** to connect a machine learning (ML) backend to your project. For more information on connecting a model, see [Machine learning integration](ml).

You have the following configuration options:

| Field          | Description    |
| ------------- | ------------ |
| **Start model training on annotation submission**         | Triggers the connected ML backend to start the training process each time an annotation is created or updated. <br /><br />This is part of an [active learning loop](active_learning) where the model can be continuously improved as new annotations are added to the dataset. When this setting is enabled, the ML backend's `fit()` method is called, allowing the model to learn from the most recent annotations and potentially improve its predictions for subsequent tasks.   |
| [**Interactive preannotations**](ml#interactive-pre-annotations)         | (Available when creating or editing a model connection)<br /><br />Enable this option to allow the model to assist with the labeling process by providing real-time predictions or suggestions as annotators work on tasks.  <br /><br />In other words, as you interact with data (for example, by drawing a region on an image, highlighting text, or asking an LLM a question), the ML backend receives this input and returns predictions based on it.   |


And the following actions are available from the overflow menu next to a connected model:

| Action          | Description    |
| ------------- | ------------ |
| **Start Training**         | Manually initiate training. Use this action if you want to control when the model training occurs, such as after a specific number of annotations have been collected or at certain intervals.  |
| **Send Test Request**         | (Available from the overflow menu next to the connected model)<br /><br />Use this for troubleshooting and sending a test resquest to the connected model.   |
| **Edit**         | Edit the model name, URL, and parameters. For more information, see [Connect a model to Label Studio](ml#Connect-a-model-to-Label-Studio). |
| **Delete**         | Remove the connection to the model. |

## Predictions

From here you can view predictions that have been imported, generated with [Prompts](prompts_predictions), or generated when executing the **Batch Predictions** action from the Data Manager. For more information on using predictions, see [Import pre-annotated data into Label Studio](predictions). 

To remove predictions from the project, click the overflow menu next to the predictions set and select **Delete**.  

To determine which predictions are show to annotators, use the [**Annotation > Live Predictions** section](#Annotation). 

## Cloud storage

This is where you connect Label Studio to a cloud storage provider:

* **Source Cloud Storage**--This is where the source data for your project is saved. When you sync your source storage, Label Studio retrieves data to be annotated. 
* **Target Cloud Storage**--This is where your annotations are saved. When you sync your target storage, annotations are sent from Label Studio to the target storage location. 

For more information, see [Sync data from external storage](storage). 


## Webhooks

You can use webhooks to integration third-party applications. For more information, see [Set up webhooks in Label Studio](webhooks) and our [integrations directory](https://labelstud.io/integrations/).

## Danger Zone

From here, you can access actions that result in data loss, and should be used with caution. 

* **Reset Cache** 

    Reset the labeling cache. This can help in situations where you are seeing validation errors concerning certain labels -- but you know that those labels do not exist. 
* **Drop All Tabs**

    If the Data Manager is not loading, dropping all Data Manager tabs can help.
* **Delete Project**

    Deleting a project permanently removes all tasks, annotations, and project data from Label Studio.


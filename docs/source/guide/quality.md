---
title: <img src="/images/LSE/en.svg" width=67 height=18 alt="Enterprise" style="vertical-align:middle"/> Review annotations in Label Studio
type: guide
order: 410
meta_title: 
meta_description:
---

> Beta documentation: Label Studio Enterprise v2.0.0 is currently in Beta. As a result, this documentation might not reflect the current functionality of the product.

After multiple labelers have annotated tasks, review their output to validate the quality of the results. You can also perform this task after a model has predicted labels for tasks in your dataset. 

<div class="enterprise"><p>
The annotation review workflow is only available in Label Studio Enterprise Edition. If you're using Label Studio Community Edition, see <a href="label_studio_compare.html">Label Studio Features</a> to learn more.
</p></div>

## Why review annotations?

Data labeling is a crucial step for training many machine learning models, and it's essential to review annotations to make sure that only the highest quality data is used to train your machine learning model. If you don't review the quality of labeled data, weak annotations might be used when training your model and degrade overall model performance. 

## Choose what to review

You can start reviewing tasks randomly, or order tasks in the project data manager in different ways, depending on your use case:
- Order tasks by annotator, to review annotations and assess individual annotator performance at the same time.
- Order tasks by agreement, to review annotations with more uncertainty among annotators first. 
- Order tasks by model confidence score, to review the annotations that a machine learning model was less certain about first. 

## Review annotated tasks

After you choose what to review, start reviewing annotated tasks:
1. From within a project, click the **Review All Tasks** button. If you select a subset of tasks to review, the number of those tasks appears in the button.
2. Review the first task and annotation. By default, you view the tasks in numeric order. You can see the annotator and their annotation. 
- If the annotation is correct, click **Accept**.
- If the annotation is mostly correct, you can correct it by selecting a different option, changing which region is selected, moving the bounding box, or whichever makes sense for the type of labeling you're reviewing. After correcting the annotation, click **Fix & Accept**. 
- If the annotation is completely incorrect, or you don't want to attempt to correct it at all, click **Reject** to reject the annotation. To place a rejected task back in the Label Stream for annotation, you must delete the annotation. Rejecting an annotation does not return it to annotators to re-label.
3. Continue reviewing annotated tasks until you've reviewed all annotated tasks. Click **Data Manager** to return to the list of tasks for the project.

If there are multiple annotations, you can select the tab of each annotation by annotator and result ID to view them separately. The annotation result ID is different from the task ID visible in the left menu. To see annotations side-by-side, you can click the task in the Data Manager and view a grid of annotations in the task preview mode.

### Assign reviewers to tasks
You can assign reviewers to tasks, or people with access can review tasks on an ad hoc basis. Anyone who is assigned to a task or who completes a review of a task appears in the Reviewers column on the Data Manager. You can assign reviewers to multiple tasks at once, but you cannot remove reviewers from multiple tasks at once.

1. For a specific project, select tasks on the Data Manager.
2. Select the dropdown and choose **Assign Reviewers**.
3. Select names of reviewers and click the `>` arrow to assign them to the selected tasks.
4. Click **Assign**. 

## Verify model and annotator performance 
Use the project dashboard to verify annotator performance. For a project, click **Dashboard** to view the dashboard.

If you don't see an annotator's activity reflected on the dashboard, make sure they have been added as a member to the project. 

### Review dataset progress

The dataset progress displays the number of tasks considered to be fully annotated for the project. If the project requires a minimum annotation per task of more than one, some tasks might not appear as "annotated" because they are not yet fully annotated by the project standards.

You can review how many tasks are left to be completed by annotators, how many tasks have been skipped, and how many tasks have been reviewed.

### Review annotator performance
For each project, you can review the project dashboard and review the Annotator Performance section to learn more about the annotators and their annotations, as well as overall annotator consensus.

Discover how many annotators have worked on the project, and how many hours they cumulatively spent labeling. You can also see the total number of annotations produced by the annotators, separate from the total number of tasks in the project.

Review a table to see the following for each annotator:
- The total agreement is for one annotator with all other annotators
- The number of tasks that they have finished annotating.
- The number of tasks that they have skipped.
- The reviewing outcome for the annotations they performed.
- The total annotation progress across all tasks.
- The mean time to annotate tasks.
- The agreement of their annotations with the ground truth annotations, if there are any.
- The agreement of their annotations with the predicted annotations, if there are any. 

### Review annotator agreement

You can also review the overall annotator agreement on a more individual basis with the annotator agreement matrix.

Review the annotator agreement matrix to understand which annotator's annotations consistently agree with or don't agree with other annotator's annotations. 

To see the specific annotations contributing to the agreement, do the following:
1. Open the data manager for the project.
2. Locate a task annotated by the different annotators that you want to compare.
3. Click the task to open the task preview.
4. Click each annotation tab to compare how the different annotations differ. The initials of each annotator appears in the tab header with the annotation ID.

## Review annotations against ground truth annotations 

Define ground truth annotations in a Label Studio project. Use ground truth annotations to assess the quality of your annotated dataset. Review ground truths to make sure that annotators are accurately labeling data at the start of the project, and continually throughout the lifecycle of the training dataset creation.

Label Studio Enterprise compares annotations from annotators and model predictions against the ground truth annotations for a task to calculate an accuracy score between 0 and 1.

> Ground truth annotations are only available in Label Studio Enterprise Edition. If you're using Label Studio Community Edition, see [Label Studio Features](label_studio_compare.html) to learn more.

## Define ground truth annotations for a project

You can define ground truth annotations from a project's Data Manager page:
1. When viewing the data manager for a project, select the checkboxes next to annotated tasks.
2. In the selected tasks dropdown menu, select **Assign ground truths**. If there are multiple annotations for a task, only the first, or earliest annotation is assigned as a ground truth. 
3. Confirm that you want to set the selected task annotations as ground truths. 

You can also assign ground truths when you annotate a task.
1. When labeling a task, create an annotation or select an existing one.
2. Click the star icon to label the annotation as a ground truth. 

## Manage ground truth annotations for a project

Review and modify the ground truth annotations for a project.

### Review existing ground truth annotations

You can filter the Data Manager to show only tasks with ground truth annotations so that you can review them. 

### Remove ground truth annotations
To remove ground truth annotations, 
1. When viewing the data manager for a project, select the checkboxes next to annotated tasks.
2. In the selected tasks dropdown menu, select **Delete ground truths**. This does not delete the annotation, but changes the status of the ground truth setting for the annotation to false.

You can also remove ground truths when you annotate a task.
1. When labeling a task, create an annotation or select an existing one.
2. Click the star icon to label the annotation as a ground truth. 

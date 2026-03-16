---
title: Members dashboard
short: Members dashboard
tier: enterprise
type: guide
order: 0
order_enterprise: 70
meta_title: Members dashboard
meta_description: Use the member dashboard to monitor project annotation quality. 
section: "Project Management"
parent: "dashboards"
parent_enterprise: "dashboards"
date: 2025-08-05 19:55:41
---

> Get insight into the productivity, agreement, and performance of members annotating in a project. 

While the [Project Dashboard](dashboard_project) provides insight into project task progress and throughput, the Members Dashboard provides more information on annotation agreement and outcome.

This can be useful in a number of ways: 

- **Track annotator performance and agreement**: View key metrics like agreement rate, review score, and performance score to identify which annotators are aligned or need support.
- **Monitor annotation progress**: See how many annotations are finished, skipped, or reviewed, along with annotation time and progress percentages to manage annotator backlogs.
- **Identify quality and consistency issues**: Use the agreement matrix and distribution chart to spot disagreements or edge cases that may require further review or clearer guidelines.

For annotator metrics across projects and over time, see the [Annotator Performance Dashboard](dashboard_annotator).

## Access the dashboard

The dashboard is available from the Members tab inside a project.

![Screenshot of Members Dashboard](/images/project/project_members_dashboard.png)

## Annotation Summary

The Annotation Summary shows annotation progress and quality metrics for each member in the project. The values reflect current project data, i.e. any changes to annotations or reviews will be updated in the metrics.

| Column | Description |
|--------|-------------|
| **Paused** | Toggle indicating whether the member is currently paused in the project. Learn more about [pausing an annotator](quality.html#Pause-an-annotator). |
| **Agreement Score** | Average agreement score against other members. Calculated as the average of the member's pairwise agreement scores with other members in the project. <br>Pairwise agreement scores are found in the [Annotator Agreement Matrix](#Annotator_agreement_matrix).|
| **Finished** | Total number of submitted annotations. Excludes any skipped annotations. Does not consider annotation updates or review outcomes. |
| **Skipped** | Total number of tasks currently skipped. |
| **Accepted** | Total number of annotations accepted by reviewers. Only counts annotations with the current review state of 'Accepted'. |
| **Rejected** | Total number of annotations rejected by reviewers. Only counts annotations with the current review state of 'Rejected'. |
| **Review Score** | Percentage of reviewed annotations that are currently accepted. Offers two options:<ul><li><strong>Overall</strong>: (total number of accepted annotations) / (total number of reviewed annotations)</li><li><strong>Per-label</strong>: (total number of accepted annotations where label is present) / (total number of reviewed annotations where label is present)</li></ul> |
| **Performance Score** | Percentage calculation considering overall performance of annotations in terms of review outcome (Accept, Reject, Fix+Accept). A higher score indicates better overall annotation quality. See [Annotator Performance summaries](dashboard_annotator#Performance-summaries) for more detail on the calculation method. Offers two modes:<ul><li><strong>Overall</strong>: considers all reviewed annotations</li><li><strong>Per-label</strong>: considers only reviewed annotations where label is present</li></ul> |
| **Annotation Progress** | Member's annotation progress, calculated based on the project's [label distribution setting](project_settings_lse.html#Annotation):<ul><li><strong>Auto</strong>: (total submitted annotations) / (total submitted annotations by member + total tasks where annotation is not complete - total tasks where member has a draft annotation)</li><li><strong>Manual</strong>: (total assigned annotations submitted) / (total assigned tasks)</li></ul> |
| **Time** | Time spent annotating based on [`lead_time`](dashboard_annotator#Performance-summaries), which includes time to submit and time spent updating. Offers three modes:<ul><li><strong>Mean Time</strong>: Average time spent per annotation</li><li><strong>Median Time</strong>: Median time spent on an annotation</li><li><strong>Total Time</strong>: Total time spent across all annotations</li></ul> |
| **Ground Truth** | Average agreement score against ground truth annotations. [Ground truth](ground_truths.html) acts as a way to assess the accuracy of other annotations. |
| **Predictions** | Average agreement score against model predictions. The model used for comparison is selected in the [Live Predictions setting](project_settings_lse#Annotation). |


### Export Annotation Summary table

You can use the **Export CSV** button to export the Annotation Summary table.

## Annotator Agreement Matrix

The Annotator Agreement Matrix helps you see how consistently different members annotate the same tasks.

- **Agreement scores** are shown as percentages between members who have both annotated the same task. Higher percentages reflect stronger alignment in their annotations. See more on how [agreement score is calculated](stats).
- **Hover over any cell** to view more information including the number of tasks where both members made an annotation. If a member made more than one annotation in a task, the additional annotation(s) are also considered. 
- **Use the label dropdown** to filter and explore agreement when at least one annotation contains the specified label.

!!! note
    Agreement in the Members Dashboard reflects the [Pairwise agreement](stats#Pairwise) between annotators, regardless of what methodology you have selected for the project. 

## Agreement Distribution

The Agreement Distribution visualizes how agreement scores vary across tasks in your project. The bar chart displays the number of tasks at each agreement score range.

- Taller bars toward the right indicate stronger consensus and likely higher data quality.
- Clusters in the lower agreement ranges may signal ambiguous or difficult tasks, or annotation guideline gaps

## Include model predictions

If your project includes predictions, you will see a **Show Models** toggle:

![Screenshot of toggle](/images/project/models-toggle.png)

When enabled, you will see the following information in model rows of the **Annotation Summary** table:

* **Agreement**: Average agreement between the model and all annotators.
* **Ground truth**: Average agreement between the model and ground-truth (GT) tasks.

    If you click the link in the Ground Truth column of a model row, you are taken to a filter view of the Data Manager showing tasks with both a GT annotation and this model’s prediction.
* **Predictions**: Average agreement between the model and all other models.

    If you click the link in the Predictions column of a model row, you are taken to a filter view of the Data Manager showing tasks with this model’s prediction plus at least one other model’s prediction.

Select or deselect model rows to include them in the **Annotator/Model Agreement Matrix**, were you can see model–annotator and model–model agreements.
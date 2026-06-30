---
title: Data quality dashboard
short: Data quality dashboard
tier: enterprise
type: guide
order: 0
order_enterprise: 72
meta_title: Data quality dashboard
meta_description: Use the Data quality dashboard to analyze agreement, confusion, and dimension-level quality for a project.
section: "Project Management"
parent: "dashboards"
parent_enterprise: "dashboards"
date: 2026-06-29 00:00:00
---

> Investigate project data quality with agreement metrics, dimension-level comparisons, and confusion analysis.

The **Data quality** dashboard helps you understand how consistently tasks are labeled and where annotators, models, or labels disagree. Use it to find ambiguous tasks, confusing labels, and dimensions that need clearer instructions or review.

For velocity and time spent, see the [Throughput dashboard](dashboard_throughput). For member-level performance, see the [Members dashboard](dashboard_members).

## Access the dashboard

From the project, open the **Dashboard** tab and select **Data quality** from the dashboard navigation.

The Data quality dashboard has two tabs:

- **Agreement analysis**: Review agreement metrics and confusion across dimensions.
- **Label distribution**: Compare annotation and prediction label counts by dimension.

## Agreement analysis tab

Use the **Agreement analysis** tab to understand where annotators, models, and ground truth annotations align or disagree.

### Average Task Agreement

The **Average Task Agreement** card shows the average agreement score for tasks in the project.

Agreement is most useful when tasks have multiple annotations or a comparison source such as ground truth. Tasks with only one annotation do not provide an annotator-to-annotator agreement signal.

### Task Agreement Distribution

The **Task Agreement Distribution** chart is a histogram of task agreement scores.

Use it to understand the shape of your project quality:

- More tasks in higher agreement ranges usually indicate stronger labeling consistency.
- More tasks in lower agreement ranges can indicate ambiguous instructions, difficult examples, or labels that need clarification.
- Clusters around specific agreement bands can help identify tasks worth reviewing in the Data Manager.

### Agreement by Dimension

The **Agreement by Dimension** chart shows agreement for each labeling dimension, such as a control tag or structured output field.

Use this chart to identify which dimensions are driving quality issues. For example, annotators might agree on broad categories but disagree on a more detailed label, rating, or classification dimension.

### Top Confusion Pairs

The **Top Confusion Pairs** table lists labels or values that are frequently confused with one another.

Use this table to find label pairs that need better examples, clearer definitions, or additional reviewer attention. Click values in the table to open the Data Manager filtered to the relevant tasks when drilldown links are available.

### Confusion Matrix

The **Confusion Matrix** shows how labels or values compare within a selected dimension.

Use the dimension dropdown above the matrix to choose the labeling dimension you want to inspect. The default selection is **All dimensions**.

Click cells in the matrix to open the Data Manager filtered to the tasks behind that comparison, when drilldown links are available.

## Label distribution tab

Use the **Label distribution** tab to compare values from annotations and predictions for each supported dimension.

Each supported dimension has a card with:

- **Average Agreement**: Agreement for the dimension when there is enough data to compare annotations, predictions, or ground truth.
- **Label Distribution chart**: A grouped horizontal bar chart comparing values from annotations and predictions.
- **Label breakdown table**: Counts from annotations and predictions for each value, plus a **Total** row.

Values in the **From Annotations** and **From Predictions** columns can link to the Data Manager with filters applied for the selected dimension, value, and source.

For more detail about supported dimensions and Label Distribution behavior, see the [Label Distribution dashboard](dashboard_distribution).

## Interpreting data quality issues

Low agreement or high confusion does not always mean an annotator is performing poorly. It can also indicate:

- Ambiguous task data.
- Labels that overlap conceptually.
- Missing or unclear labeling instructions.
- A model version that needs additional evaluation.
- A project configuration that requires more overlap or review.

Use the Data quality dashboard together with the [Members dashboard](dashboard_members) and Data Manager to decide whether to update instructions, add examples, reassign tasks, or review specific annotations.

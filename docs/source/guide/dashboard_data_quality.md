---
title: Data quality dashboard
short: Data quality dashboard
tier: enterprise
type: guide
order: 0
order_enterprise: 71
meta_title: Data quality dashboard
meta_description: Use the Data quality dashboard to analyze agreement, confusion, and dimension-level quality for a project.
section: "Project Management"
parent: "dashboards"
parent_enterprise: "dashboards"
date: 2026-06-29 00:00:00
---

> Investigate project data quality with agreement metrics, dimension-level comparisons, and confusion analysis.

The **Data quality** dashboard helps you understand how consistently tasks are labeled and where annotations or labels disagree. Use it to find ambiguous tasks, confusing labels, and dimensions that need clearer instructions or review.

For velocity and time spent, see the [Throughput dashboard](dashboard_throughput). For member-level performance, see the [Members dashboard](dashboard_members).

## Access the dashboard

From the project, open the **Dashboard** tab and select **Data quality** from the dashboard navigation.

The Data quality dashboard has two tabs:

- **Agreement analysis**: Review agreement metrics and confusion across dimensions.
- **Label distribution**: Compare annotation and prediction label counts by dimension.

## Agreement analysis

Use the **Agreement analysis** tab to understand where annotators, models, and ground truth annotations align or disagree.

### Average Task Agreement

The **Average Task Agreement** KPI card shows the average agreement score for tasks in the project.

Agreement is most useful when tasks have multiple annotations or a comparison source such as ground truth. Tasks with only one annotation do not provide an annotator-to-annotator agreement signal.

### Overall Agreement Charts

| Chart | Description |
|-------|-------------|
| **Task Agreement Distribution** | Histogram of task-level agreement scores.<br /><br /> More tasks in higher ranges indicate stronger labeling consistency; more tasks in lower ranges suggest ambiguous instructions, difficult examples, or labels that need clarification. Clicking on a bar opens up the tasks tasks in the Data Manager. |
| **Agreement by Dimension** | Agreement score per dimension.<br /><br /> Use it to identify which dimensions are driving disagreement issues. |

### Ground Truth Agreement

| Chart | Description |
|-------|-------------|
| **Top Confusion Pairs** | Table of labels with the most number of incorrect values applied according to the ground truth.<br /><br />Use it to find label pairs that need better examples, clearer definitions, or additional training. |
| **Confusion Matrix** | Heatmap comparing labels or values within a selected dimension. <br /><br />Use the dimension dropdown to choose which dimension to inspect (default: All dimensions). |

## Label distribution

Use the **Label distribution** tab to compare values from annotations and predictions for each dimension.

Each supported dimension has a card with:

- **Average Agreement**: Agreement for the dimension when there is enough data to compare annotations or predictions.
- **Label Distribution chart**: A grouped horizontal bar chart comparing values from annotations and predictions.
- **Label Distribution table**: Counts from annotations and predictions for each value, plus a **Total** row. Values in the **From Annotations** and **From Predictions** columns link to the Data Manager with filters applied for the selected dimension and value.

For more detail about supported dimensions and Label Distribution behavior, see the [Label Distribution dashboard](dashboard_distribution).

## Interpreting data quality issues

Low agreement or high confusion does not always mean poor annotator or model performance. It can also indicate:

- Ambiguous task data.
- Labels that overlap conceptually.
- Missing or unclear labeling instructions.
- A project configuration that requires higher annotation overlap or [additional review strategy](quality).

Use the Data quality dashboard together with the [Members dashboard](dashboard_members) and Data Manager to decide whether to update instructions, add examples, reassign tasks, or coach specific members.

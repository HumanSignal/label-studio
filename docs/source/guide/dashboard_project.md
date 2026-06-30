---
title: Project dashboard
short: Project dashboard
tier: enterprise
type: guide
order: 0
order_enterprise: 69
meta_title: Project dashboard
meta_description: Use the project Dashboard tab to monitor project throughput, quality, and member performance.
section: "Project Management"
parent: "dashboards"
parent_enterprise: "dashboards"
date: 2026-06-29 00:00:00
---

> Use project dashboards to monitor throughput, data quality, and member performance for a single project.

The project **Dashboard** tab gives managers, administrators, and owners a project-level view of how work is moving, where quality issues are appearing, and how members are performing.

Open a project and select **Dashboard** to access the project dashboards:

- **Throughput**: Track velocity, remaining work, and time spent.
- **Data quality**: Analyze agreement, dimension-level quality, and label confusion.
- **Members**: Review annotator, reviewer, and model performance within the project.

## Choose a project dashboard

| Dashboard | Use it to |
|-----------|-----------|
| [**Throughput**](dashboard_throughput) | Understand whether the project is moving at the expected pace, where work is blocked, and how annotation and review time are trending. |
| [**Data quality**](dashboard_data_quality) | Investigate agreement, confusion between labels, quality by dimension, and the tasks behind quality issues. |
| [**Members**](dashboard_members) | Compare annotator, reviewer, and model performance, including agreement, review outcomes, time spent, and per-dimension performance. |

## Access by user role

Project dashboards are available to users who can manage or monitor the project, such as Owners, Administrators, and Managers.

Annotators and Reviewers generally do not use the project Dashboard tab. For individual work history across projects, see the [Member Performance dashboard](dashboard_annotator).

## Filtering and drilldowns

Each project dashboard has filters that apply to the metrics on that page. Depending on the dashboard, you can filter by date range, task data, annotator, model, review outcome, ground truth status, labeling dimension, or label.

Many cards, charts, and tables link to the Data Manager with relevant filters applied. Use these drilldowns to move from a summary metric to the exact tasks, annotations, predictions, or labels behind it.

## Related analytics dashboards

Project dashboards focus on one project. For analytics across multiple projects or individual members, see:

- [Projects overview dashboard](dashboard_overview)
- [Label Distribution dashboard](dashboard_distribution)
- [Member Performance dashboard](dashboard_annotator)
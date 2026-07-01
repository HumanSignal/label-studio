---
title: Throughput dashboard
short: Throughput dashboard
tier: enterprise
type: guide
order: 0
order_enterprise: 70
meta_title: Throughput dashboard
meta_description: Use the Throughput dashboard to monitor project velocity, remaining work, and time spent.
section: "Project Management"
parent: "dashboards"
parent_enterprise: "dashboards"
date: 2026-06-29 00:00:00
---

> Track how quickly work is moving through a project and where bottlenecks are forming.

The **Throughput** dashboard shows project velocity over time. Use it to monitor completed work, remaining work, and the time spent annotating and reviewing tasks.

For data quality-focused metrics, see the [Data quality dashboard](dashboard_data_quality). For member-level productivity and agreement, see the [Members dashboard](dashboard_members).

## Access the dashboard

From the project, open the **Dashboard** tab and select **Throughput** from the dashboard navigation.

## Filter by date range

Use the date range filter to update the KPI cards and charts for the selected time period.

If you include a precise time, the dashboard uses that timestamp when determining which task and work events fall within the range.

## KPI cards

The top of the dashboard shows summary cards for the selected date range.

| KPI | Description |
|-----|-------------|
| **Tasks Done** | Number of tasks that reached the [Done state](project_states#Task-states) during the selected date range. |
| **Avg Tasks Done / Day** | Average number of tasks completed per day in the selected date range. Calculated as Tasks Done / Days.|
| **Total Time Spent** | Total time spent annotating and reviewing. Note: Annotation time uses active annotation time, as opposed to [lead time](dashboard_annotator#Annotations).
| **Avg Time / Task** | Average time spent per Done task. Calculated as Total Time Spent / Tasks Done.|

!!! note
    Task state metrics are based on [project and task state management](project_states). If state tracking was enabled after some project work had already happened, earlier state transitions might not appear in the dashboard.

## Throughput charts

| Chart | Description |
|-------|-------------|
| **Remaining Tasks by State** | Stacked bar chart of tasks remaining in each state over time. A shrinking chart indicates work is progressing; a growing segment in one state suggests a bottleneck; a high number in review states suggests reviewers are not keeping pace with annotators. |
| **Tasks Done / Day** | Number of tasks reaching the Done state per day. The same task may appear on multiple days if it is re-worked after reaching Done. Use it to track velocity and spot output changes after adjusting staffing, task instructions, review requirements, or project settings. |
| **Time Spent** | Time spent over the selected period, split between annotation and review. Use it to understand how effort is distributed across work types over time. |
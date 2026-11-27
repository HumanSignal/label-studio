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
| **Tasks Done** | Number of tasks that reached the [Done state](project_states#Task-states) during the selected date range.<br /><br /> **Avg Tasks Done / Day** sub-metric shows the average number of tasks completed per day in the selected date range. Calculated as Tasks Done / Days.   |
| **Annotations Submitted** | Total number of annotations submitted (manually or created from a prediction) during the selected date range. <br /><br /> **Annotations / Day** sub-metric shows the average number of annotations submitted per day in the selected date range. Calculated as Annotations Submitted / Days.|
| **Total Time Spent** | Total time spent annotating and reviewing. Note: Annotation time uses active annotation time, as opposed to [lead time](dashboard_annotator#Annotations).<br /><br /> The sub-metric shows the Total Time Spent on Done Tasks.
| **Avg Time / Task** | Average active time spent per task that has started work (ie. past the initial stage). Calculated as Total Time Spent / Tasks Started. <br /><br /> The sub-metric shows the Total Time Spent on Done Tasks / Tasks Done. |

!!! note
    Task state metrics are based on [project and task state management](project_states). If state tracking was enabled after some project work had already happened, earlier state transitions might not appear in the dashboard.

## Throughput charts

| Chart | Description |
|-------|-------------|
| **Tasks by State** | Stacked bar chart of the number of tasks in each state (Initial, Annotating, Needs Review, In Review, Done) over time. Use it to track task progress or identify bottlenecks.<br /><br /> Tasks start at the **Initial** state when they have been created but contain no annotations yet. Tasks that have completed the required number of annotations either move to the **Needs Review** or **Done** state, depending on whether your project settings require a review on the task. [Learn more about task state management](project_states#Task-states).|
| **Tasks Done / Day** | Number of tasks reaching the Done state per day. The same task may appear on multiple days if it is re-worked after reaching Done. Use it to track velocity and spot output changes after adjusting staffing, task instructions, review requirements, or project settings. |
| **Time Spent** | Time spent over the selected period, split between annotation and review. Use it to understand how effort is distributed across work types over time. |
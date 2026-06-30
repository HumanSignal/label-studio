---
title: Throughput dashboard
short: Throughput dashboard
tier: enterprise
type: guide
order: 0
order_enterprise: 71
meta_title: Throughput dashboard
meta_description: Use the Throughput dashboard to monitor project velocity, remaining work, and time spent.
section: "Project Management"
parent: "dashboards"
parent_enterprise: "dashboards"
date: 2026-06-29 00:00:00
---

> Track how quickly work is moving through a project and where bottlenecks are forming.

The **Throughput** dashboard shows project velocity over time. Use it to monitor completed work, remaining work, and the time spent annotating and reviewing tasks.

For quality-focused metrics, see the [Data quality dashboard](dashboard_data_quality). For member-level productivity and agreement, see the [Members dashboard](dashboard_members).

## Access the dashboard

From the project, open the **Dashboard** tab and select **Throughput** from the dashboard navigation.

## Filter by date range

Use the date range filter in the dashboard toolbar to update the KPI cards and charts. Metrics are calculated for the selected time period.

If you include a precise time, the dashboard uses that timestamp when determining which task and work events fall within the range.

## KPI cards

The top of the dashboard shows summary cards for the selected date range.

| KPI | Description |
|-----|-------------|
| **Tasks Done** | Number of tasks that reached the [Done state](project_states#Task-states) during the selected date range. |
| **Avg Tasks Done / Day** | Average number of tasks completed per day in the selected date range. |
| **Total Time Spent** | Total time spent annotating and reviewing. Annotation time uses lead time, and review time uses reviewer activity time. |
| **Avg Time / Task** | Average time spent per completed task. |

!!! note
    Task state metrics are based on [project and task state management](project_states). If state tracking was enabled after some project work had already happened, earlier state transitions might not appear in the dashboard.

## Remaining Tasks by State

The **Remaining Tasks by State** chart is a stacked bar chart that shows how many tasks remain in each task state over time.

Use this chart as a burndown view:

- A steady decrease in remaining tasks indicates that work is progressing.
- A large or growing segment in one state can indicate a bottleneck.
- A high number of tasks in review states can indicate that reviewers are not keeping pace with annotation work.

## Tasks Done / Day

The **Tasks Done / Day** chart shows how many tasks were completed each day in the selected date range.

Use it to understand project velocity and spot changes in output after you adjust staffing, task instructions, review requirements, or project settings.

## Time Spent

The **Time Spent** chart shows time spent over the selected period, split between annotation and review work.

Use this chart to understand where effort is going:

- High annotation time can indicate complex tasks, unclear instructions, or a need for more annotators.
- High review time can indicate review backlog, difficult quality decisions, or a need for more reviewers.
- A gap between completed tasks and time spent can indicate process changes, idle time, or work shifting between annotation and review.

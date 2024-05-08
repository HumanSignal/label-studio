---
title: Annotator performance dashboard - Beta 🧪
short: Annotator dashboard
tier: enterprise
type: guide
order: 0
order_enterprise: 70
meta_title: Annotator dashboard
meta_description: Use annotator dashboards to track annotator work and progress. 
section: "Project Management"
parent: "dashboards"
parent_enterprise: "dashboards"
date: 2024-04-04 11:50:41
---


The annotator performance dashboard provides metrics about a user's annotation activities over a period of time, including how many tasks an annotator has completed and how quickly. 

This can be useful in a number of ways: 

- **Resource management optimization**: If you have a project that is on a rigid timeline, you can determine which annotators have the quickest turnaround and assign them as necessary. 
- **Annotator payment management**: If you are using outside contractors or otherwise paying annotators based on their output, you can use this dashboard to help calculate or verify contractor payments. 
- **Reduce costs associated with internal analytic reports**: With this report, you no longer need to develop complex tools or workflows to track annotator performance. 

## Access the dashboard

The dashboard is available from the Organization page, meaning that your user role must be an Owner or Administrator to have the necessary permissions to view it. 

From the organization members list, select the user you want to view. Annotator performance reports are available for users in all roles, not just the Annotator role. 

With the user selected, click **Performance Report** on the right. 

![Screenshot of Performance Report button](/images/project/user_report.png)

## Metrics

### Data used

The metrics are calculated from the following data:

* `last_action` -- The last action taken on an annotation. This can can be submitted, updated, fixed and accepted, accepted, rejected. 
* `lead_times` -- The time spent with annotations that have a last action matching those listed above.
* `submitted_or_reviewed` -- Annotations that have a last action matching those listed above.
* `updated`	-- Annotations filtered to only include `last_action = Updated`. 
* `skipped`	-- Annotations with `was_cancelled = true`.


### Performance summaries

![Screenshot of annotator dashboard summaries](/images/project/annotator_dashboard_summary.png)

| Metric | Calculation | Description | 
| --- | --- | --- |
| **Total Time** | Sum of `lead_times` | The total time spent annotating during the selected time frame. This is calculated based on annotations that meet the criteria for **Submitted Annotations** (see below). <br /><br />The total time does not include time spent on annotations that have not been submitted and/or updated. For example, it does not include time spent on drafts or time spent on skipped annotations. <br /><br />However, if they return to an annotation draft or a previously skipped annotation, then their earlier time spent on the annotation is included when calculating their total annotation time.  | 
| **Submitted Annotations** | Sum of `submitted_or_reviewed` | The total number of annotations the user submitted during the selected time frame. <br /><br />This includes annotations that have been submitted and updated. <br /><br />It does not include annotations that have been skipped. It also does not include annotations that were submitted and have since been rejected by a reviewer. However, if the annotator updates a rejected annotation and that fix is then accepted by a reviewer, the corrected annotation is included within their Submitted Annotation count. <br /><br />Note that each annotation is only included in their submitted count once. Label Studio does not count the same annotation twice based if it is later updated. | 
| **Total Time (Median)** | Sum of `submitted_or_reviewed` * the median of `lead_times` | The number of submitted annotations multiplied by their median annotation time. | 
| **Time per Annotation (Median)** | Median of `lead_times` | The median time they spent on each submitted annotation. | 
| **Time per Annotation (Average)** | Average of `lead_times` | The average time they spent on each submitted annotation. | 

### Graphs

![Screenshot of annotator dashboard graphs](/images/project/annotator_dashboard_graph.png)

| Graph | Description | 
| --- | --- | 
| **Annotation Summary** | A summary of all annotations done by the user over the selected time period, broken down by submitted, skipped, and updated.   | 
| **Annotations** | The same information as in the **Annotation Summary**, but segmented by date. | 
| **Total Time Annotating** | The total time spent annotating each day, calculated as either the median time spent or average time spent. | 
| **Time per Annotation** | The median and average time per submitted annotation segmented by date. <br /><br />Note that the date and time are calculated based on when they completed the annotation (see `last_action` above), and not when they began their annotation. | 

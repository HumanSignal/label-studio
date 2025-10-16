---
title: Member performance dashboard
short: Performance dashboard
tier: enterprise
type: guide
order: 0
order_enterprise: 72
meta_title: Member performance dashboard
meta_description: Use the performance dashboard to track user work and progress. 
section: "Project Management"
parent: "dashboards"
parent_enterprise: "dashboards"
date: 2024-04-04 11:50:41
---


The member performance dashboard provides metrics about a user's annotation and review activities over a period of time, including how many tasks a user has completed and how quickly. 

![Screenshot of Performance dashboard](/images/project/apd.png)


This can be useful in a number of ways: 

- **Resource management optimization**: If you have a project that is on a rigid timeline, you can determine which users have the quickest turnaround and assign them as necessary. 
- **Annotator payment management**: If you are using outside contractors or otherwise paying users based on their output, you can use this dashboard to help calculate or verify contractor payments. 
- **Reduce costs associated with internal analytic reports**: With this report, you no longer need to develop complex tools or workflows to track user performance. 

## Access the dashboard

| User role             | Access restrictions                                                                                  |
|-----------------------|------------------------------------------------------------------------------------------------------|
| **Owner** <br>and<br> **Admin**      | Can access from the Organization page, the Home page, and the Members dashboard. <br> Can filter for all users. <br> Can filter for all workspaces. |
| **Manager**               | Can access from the Home page and the Members dashboard. <br> Can filter for all users. <br> Can only filter for workspaces or projects in which they are a member. |
| **Reviewer** <br>and<br> **Annotator** | Can access from the Home page. <br> Can only see their own annotation and reviewer history. <br> Can only filter for workspaces or projects in which they are a member. |

There are three ways to access the dashboard. The options available to you depend on your user role (see the table above).

* From the **Organization** page, select a user on the **Members** page. Then select **Annotator Performance Report** on the right. 

    ![Screenshot of Performance Report button](/images/project/user_report.png)
* From the **Home** page, click **Annotator Dashboard**. This will pre-select your own annotator performance dashboard. 

    ![Screenshot of link on Home page](/images/project/apd-home.png)
* From the **Members** dashboard on a project, click the overflow menu next to a username in the **Annotation Summary** table. This will pre-select that user's annotator performance dashboard for that specific project.  

    ![Screenshot of link on Members page](/images/project/apd-members.png)


## Export data

You can use the **Export** drop-down to export the following:

* **Report** - Download the information in the dashboard as CSV or JSON. 

* **Timeline** - Download a detailed timeline of all the user's annotation actions within the time frame, including when the began and submitted each annotation. 

* **Comments Received** - Download a CSV file with all of the comments that other users have left on the user's annotations. 

## Metrics

### Data used

The metrics are calculated from the following data:

* `last_action` -- The last action taken on an annotation. This can can be submitted, updated, fixed and accepted, accepted, rejected. 
* `lead_times` -- The time spent with annotations that have a last action matching those listed above.
* `submitted_or_reviewed` -- Annotations that have a last action matching those listed above.
* `updated`	-- Annotations filtered to only include `last_action = Updated`. 
* `skipped`	-- Annotations with `was_cancelled = true`.


### Performance summaries

!!! note
    The performance summaries only apply to annotation activities, not reviewer activities. 

| Metric | Calculation | Description | 
| --- | --- | --- |
| **Total Time** | Sum of `lead_times` | The total time spent annotating during the selected time frame. This is calculated based on annotations that meet the criteria for **Submitted Annotations** (see below). <br /><br />All annotations have a `lead_time`. The lead time reflects how much time a user spent labeling from the moment the task was opened until they click **Submit** or **Update**. This includes idle time. <br /><br />The total time does not include time spent on annotations that have not been submitted and/or updated. For example, it does not include time spent on drafts or time spent on skipped annotations. <br /><br />However, if they return to an annotation draft or a previously skipped annotation, then their earlier time spent on the annotation is included when calculating their total annotation time.  | 
| **Submitted Annotations** | Sum of `submitted_or_reviewed` | The total number of annotations the user submitted during the selected time frame. <br /><br />This includes annotations that have been submitted and updated. <br /><br />It does not include annotations that have been skipped. It also does not include annotations that were submitted and have since been rejected by a reviewer. However, if the annotator updates a rejected annotation and that fix is then accepted by a reviewer, the corrected annotation is included within their Submitted Annotation count. <br /><br />Note that each annotation is only included in their submitted count once. Label Studio does not count the same annotation twice based if it is later updated. | 
| **Total Time (Median)** | Sum of `submitted_or_reviewed` * the median of `lead_times` | The number of submitted annotations multiplied by their median annotation time. | 
| **Time per Annotation (Median)** | Median of `lead_times` | The median time they spent on each submitted annotation. | 
| **Time per Annotation (Average)** | Average of `lead_times` | The average time they spent on each submitted annotation. | 
| **Performance Score** | Calculated from reviewer actions | The Performance Score reflects the overall performance of annotators in terms of review actions (**Accept**, **Reject**, **Fix+Accept**). <br /><br />The calculation is as follows:<ul><li>Each annotation review action (**Accept**, **Reject**, **Fix+Accept**) contributes to the score.</li><li>The score is calculated by summing the scores of all review actions and dividing by the total number of review actions. For example: </li><ul><li>If an annotation is rejected twice and then accepted once, the Performance Score would be (0 + 0 + 1) / 3 = 33%.</li><li>If an annotation is rejected once and then fixed+accepted with a score of 42%, the Performance Score would be (0 + 0.42) / 2 = 21%.</li></ul></ul> | 

### Graphs

![Screenshot of annotator dashboard graphs](/images/project/annotator_dashboard_graph.png)

| Graph | Description | 
| --- | --- | 
| **Annotation Summary** | A summary of all annotations done by the user over the selected time period, broken down by submitted, skipped, and updated.   | 
| **Annotations** | The same information as in the **Annotation Summary**, but segmented by date. | 
| **Total Time Annotating** | The total time spent annotating each day, calculated as either the median time spent or average time spent. | 
| **Time per Annotation** | The median and average time per submitted annotation segmented by date. <br /><br />Note that the date and time are calculated based on when they completed the annotation (see `last_action` above), and not when they began their annotation. | 
| **Review Time** | This is the time, in seconds, that a user spends looking at submitted annotations. This is calculated from when they open an annotation to when they either take action on it (such as approving it) or close it by moving away from the task. <br /><br />Note that the review time metric only began being collected on September 25, 2025. | 
| **Reviews** | These are are all review actions the user has taken. For example, if they reject and then later accept an annotation, this graph will reflect both the **Accepted** and **Rejected** actions.  | 

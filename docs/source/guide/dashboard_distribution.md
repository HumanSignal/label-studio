---
title: Label distribution dashboard
short: Label distribution
tier: enterprise
type: guide
order: 0
order_enterprise: 175
meta_title: Label distribution dashboard
meta_description: Use the label distribution dashboard to track the distribution of labels in a project. 
section: "Analytics"
date: 2024-04-04 11:50:41
---

The label distribution dashboard provides a visual representation of the label distribution in a project over time.

![Screenshot of Label distribution dashboard](/images/analytics/label-dist.png)

#### Access by user role

| User role | Access restrictions |
|-----------|---------------------|
| **Owner** and **Admin** | Can view the **Label Distribution** dashboard and filter for all projects. |
| **Manager** | Can view the **Label Distribution** dashboard, but can only filter for and view projects in which they are a member.  |
| **Reviewer** and **Annotator** | Cannot access the **Label Distribution** dashboard. <br/><br/>When they open **Analytics**, they are redirected to the [Member Performance dashboard](dashboard_annotator), where they can only see their own annotation and review history. |

## Supported control tags

The label distribution dashboard supports control tags that have nested child tags. 

For example, tags such as `<Choices>`, `<Labels>`, `<RectangleLabels>` are supported. 

But tags such as `<TextArea>`, `<Rating>`, and `<Number>` are not supported.

!!! note
    Taxonomy tags with nested `Choice` tags are supported, but not [taxonomies defined with an external source](/templates/taxonomy#Taxonomies-defined-using-a-remote-source).


## Label summaries and charts

At the top of the Label distribution dashboard, summary cards show how many annotations and predictions are in the project. 

The charts show distribution of labels from annotations and from predictions. 

![Screenshot of Label distribution dashboard](/images/analytics/label-dist-charts.png)

You can click the overflow menu next to each chart to view it as a pie chart or to export the data as a CSV file.

![Screenshot of Label distribution dashboard](/images/analytics/label-dist-menu.png)

## Label distribution tables

The label distribution table shows a detailed distribution of labels from annotations and from predictions, shown as total count and as a percentage relative to the total number of annotations/predictions. 

![Screenshot of Label distribution table](/images/analytics/label-dist-tables.png)


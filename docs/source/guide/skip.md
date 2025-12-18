---
title: Skipping tasks
short: Skipping tasks
tier: all
type: guide
order: 139
order_enterprise: 139
meta_title: Skipping project tasks in Label Studio
section: "Create & Manage Projects"
parent: "labeling"
parent_enterprise: "labeling"
date: 2025-05-24 17:19:21
---

<div class="opensource-only">

The **Skip** action is available when viewing tasks through the labeling stream (selecting **Label All Tasks** or **Label Tasks as Displayed** instead of clicking tasks in the Data Manager).

<img src="/images/label/skip.png" class="gif-border" style="max-width: 413px">

When you skip a task, the task is removed from your labeling queue. 

If another annotator is also working through the labeling queue, they will see the skipped task instead. If all annotators skip a task, it remains incomplete. 

You can see which tasks have been skipped using the **Cancelled** column in the Data Manager. 

!!! error Enterprise
    Task skipping, and how tasks can be skipped, is highly configurable in Label Studio Enterprise and Starter Cloud. For more information, see [the Enterprise documentation](https://docs.humansignal.com/guide/skip). 

</div>

<div class="enterprise-only">

The **Skip** action is available when viewing tasks through the labeling stream (selecting **Label All Tasks** or **Label Tasks as Displayed** instead of clicking tasks in the Data Manager).

<img src="/images/label/skip.png" class="gif-border" style="max-width: 413px">

## Configure task skipping

Whether annotators can skip tasks, and what should happen to skipped tasks, is configurable the following settings:

* [**Annotation > Task Skipping**](project_settings_lse#skip)

* [**Annotation > Skip Queue**](project_settings_lse#skip-queue)

While you can disallow skipping entirely from the project settings, if you want to have specific tasks be unskippable, you will need to configure that by adding a special key as part of the JSON task definition that you import to your project.

## Individual unskippable tasks

To make an individual task unskippable, specify `"allow_skip": false` as part of the [JSON task definition](tasks#Basic-Label-Studio-JSON-format) that you import to your project.

For example, the following JSON snippet would result in one skippable task and one unskippable task:

```json
[
  {
    "data": {
      "text": "Demo text 1"
    },
    "allow_skip": false
  },
  {
    "data": {
      "text": "Demo text 2"
    }
  }
]
```

!!! note
    Managers, Admins, and Owners can still skip these tasks. Only Annotators and Reviewers cannot skip tasks that have been marked unskippable using this method.  


!!! info Tip
    Use the **Allow Skip** column to see which tasks have skipping disabled and filter for unskippable tasks. This column is hidden by default and is only visible to Managers, Admins, and Owners. 

</div>




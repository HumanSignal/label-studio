---
title: Troubleshoot project issues
short: Troubleshooting
tier: all
type: guide
order: 166
order_enterprise: 71
meta_title: Troubleshooting general project issues in Label Studio
meta_description: Tips on troubleshooting issues with projects in Label Studio
section: "Project & Team Management"
date: 2023-12-20 12:18:46
---

If you encounter an issue loading a project, see if your issue is listed below. If you can't find your issue here, check our other troubleshooting pages:

- [Troubleshoot labeling issues](FAQ) for issues you encounter while labeling. 
- [Troubleshoot machine learning](ml_troubleshooting) for issues related to using an ML backend. 
- [Troubleshoot import and export issues](import_troubleshoot) for issues related to loading or syncing data from cloud storage (including CORS issues) and pre-annotations. 


## Blank page when loading a project

After starting Label Studio and opening a project, you see a blank page. Several possible issues could be the cause.

**Cause**

If you specify a host without a protocol such as `http://` or `https://` when starting Label Studio, Label Studio can fail to locate the correct files to load the project page.

**Solution**

<div class="opensource-only">

To resolve this issue, update the host specified as an environment variable or when starting Label Studio. See [Start Label Studio](start.html)

</div>

<div class="enterprise-only">

To resolve this issue, update the host specified as an environment variable or when starting Label Studio. Check LABEL_STUDIO_HOST environment variable.

</div>

<div class="enterprise-only">

## Extra annotations created in tasks

Label Studio can control the distribution of tasks across annotators. This is enabled in the project setting on the **Annotation** page under **Distribute Labeling Tasks**. For more information, see [Set up task distribution for labeling](setup_project#Set-up-task-distribution-for-labeling). 

Auto distribution mode doesn’t guarantee that all tasks will get exactly the specified amount of annotations - there are many scenarios where users can assign more annotations per task:

* Users with higher privileges than Annotator role can manually create extra annotations.
* When Manual mode is activated - no annotations limits are applied.
* When an Annotator leaves their task in “Draft” mode (edited, not submitted), they can revert back to the task and complete it. It doesn’t guarantee that the same task wasn’t returned back in the labeling queue and labeled by other project members.

</div>
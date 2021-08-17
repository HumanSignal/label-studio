---
title: Announcing Label Studio version 1.2.0 with Webhooks!
type: blog
image: /images/release-120/120-webhooks.jpg
order: 91
meta_title: Label Studio Release Notes 1.2.0
meta_description: Release notes and information about Label Studio version 1.2.0, featuring event webhook functionality for annotations and tasks. 
---

The latest version of Label Studio introduces webhooks, an oft-requested feature. Now you can subscribe to events such as annotation created, task created, or project created, and trigger changes in your machine learning model pipelines.

<br/><img src="/images/release-120/120-webhooks.jpg" alt="Diagram showing selecting webhook payload in Label Studio and processing the event payload and starting model training in your own pipeline" class="gif-border" width="800px" height="318px" />

Webhooks allow you to automatically make changes based on actions happening in Label Studio. Take advantage of the new webhook events to:
- Trigger updates to versioned datasets in Pachyderm or DVC.
- Set up an active learning workflow based on frequently-updated data annotations.
- Notify annotators about a new labeling project.
- Start training a machine learning model after a certain number of tasks have been annotated.

And more! Install or upgrade Label Studio and [start using webhooks](/guide/webhooks.html) today!

This release of Label Studio also includes the same [fixes and features in version 1.1.1](https://github.com/heartexlabs/label-studio/releases/tag/v1.1.1).
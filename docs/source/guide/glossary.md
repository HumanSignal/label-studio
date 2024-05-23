---
title: Label Studio terminology
short: Terminology
tier: all
type: guide
order: 16 
order_enterprise: 16
meta_title: Label Studio terminology
meta_description: A glossary of common terms seen throughout Label Studio. 
section: "Discover & Learn"
date: 2023-10-27 11:38:25
---

 The following table describes some terms you might encounter as you use Label Studio:


| Term   | Description   |
|--|-----|
| Annotations  | The output of a labeling task. Previously called "completions". The terms "annotations" and "labels" are frequently used interchangeably. |
| Bounding box | Region within an image. |
| Dataset | What you import into Label Studio, comprised of individual items, or labeling tasks. |
| Labels | What you add to each region while labeling a task in Label Studio.  |
| Label stream | When you click **Label All Tasks** from the Data Manager, you are working within the label stream. |
| Labeling configuration | The labeling configuration determines what annotators and reviewers will see. It is configured in the project settings. |
| Predictions, <br> Pre-annotations | Annotations in Label Studio format that machine learning models create for an unlabeled dataset. See [import pre-annotations](predictions.html)  |
| Relation   | A defined relationship between two labeled regions.  |
| Result | A label applied to a specific region as stored in an annotation or prediction. See [Label Studio JSON format of annotated tasks](export.html#Label-Studio-JSON-format-of-annotated-tasks). |
| Quick view   | The "quick view" is what you see when you click an individual item in the Data Manager to open it (different than viewing it in the "label stream").   |
| Record | Item in a dataset.   |
| Region | The portion of the task identified for labeling. For example, when working with text, this might be a specific span of text or field. For images, an example region is a bounding box. For text, an example region is a span of text. Often has a label assigned to it.         |
| Task  | When you upload data to Label Studio, each item in the dataset becomes a labeling *task*. A task is a distinct item from a dataset that is ready to be labeled, pre-annotated, or has already been annotated. For example: a text snippet, an image, or a video clip.  |
| Tags   | Configuration options to customize the labeling interface. See [more about tags](/tags).  |
| Templates | Example labeling configurations that you can use to specify the type of labeling that you're performing with your dataset. See [all available templates](/templates) |



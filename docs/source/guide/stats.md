---
title: Annotation statistics
short: Annotation statistics
badge: <i class='ent'></i>
type: guide
order: 413
meta_title: Data Labeling Statistics
meta_description: Label Studio Enterprise documentation about task agreement, annotator consensus, and other data annotation statistics for data labeling and machine learning projects.
---

> Beta documentation: Label Studio Enterprise v2.0.0 is currently in Beta. As a result, this documentation might not reflect the current functionality of the product.

<div class="enterprise"><p>
Label Studio Enterprise Edition includes various annotation and labeling statistics. The open source Community Edition of Label Studio does not perform these statistical calculations. If you're using Label Studio Community Edition, see <a href="label_studio_compare.html">Label Studio Features</a> to learn more.
</p></div>

## Task agreement

Task agreement shows the consensus between multiple annotators when labeling the same task. There are several types of task agreement in Label Studio Enterprise:
- a per-task agreement score, visible on the Data Manager page for a project. This displays how well the annotations on a particular task match across annotators. 
- an inter-annotator agreement matrix, visible on the Members page for a project. This displays how well the annotations from specific annotators agree with each other in general, or for specific tasks. 

You can also see how the annotations from a specific annotator compare to the prediction scores for a task, or how they compare to the ground truth labels for a task.

For more about viewing agreement in Label Studio Enterprise, see [Verify model and annotator performance](quality.html#Verify-model-and-annotator-performance)

## Matching score

A matching score assesses the similarity of annotations for a specific task. The matching score is used differently depending on which agreement metrics are being calculated. 

Matching scores are used to determine whether two given annotations for a task, represented by `x` and `y` in this example, match. 
- If both `x` and `y` are empty annotations for a task, the matching score is `1`.
- If `x` and `y` share no similar points, the matching score is `0`. 
- If there are different labeling types used in the annotations in `x` and/or `y`, partial matching scores for each data labeling type are averaged.
- For categorical task labeling, such as those using the Choices tag, Cohen's Kappa index is computed if specified in the project settings. 

The type of data labeling being performed affects how the matching score is computed. The following examples describe how the matching scores for various labeling configuration tags are computed. 

### Choices
For data labeling where annotators select a choice, the matching score for two given task annotations `x` and `y` is computed like follows:

- If `x` and `y` are the same choice, the matching score is `1`. 
- If `x` and `y` are different choices, the matching score is `0`.

### TextArea
For data labeling where annotators transcribe text in a text area, the resulting annotations contain a list of text. The matching score for two given task annotations `x` and `y` is computed like follows:
- The list of text items in each annotation is indexed, such that `x = [x1, x2, ..., xn]` and similarly, `y = [y1, y2, ..., yn]`.  
- For each aligned pair of text items across the two annotations `(x1, y1)` the similarity of the text is calculated.
- For each unaligned pair, for example, when one list of text is longer than the other, the similarity is zero. 
- The similarity scores are averaged across all pairs, and the result is the matching score for the task. 

The matching score for each aligned pair can be calculated in multiple ways:
- Using an [edit distance algorithm](https://en.wikipedia.org/wiki/Edit_distance)
- Splitting the list by words
- Splitting the list by characters
Decide what method to use to calculate the matching score based on your use case and how important precision is for your data labels.
### Labels

The matching score is calculated by comparing the intersection of annotations over the result spans, normalized by the length of each span. For two given task annotations `x` and `y`, the matching score formula is `m(x, y) = spans(x) ∩ spans(y)`.

### Rating

For data labeling where annotators select a rating, the matching score for two given task annotations `x` and `y` is computed like follows:

- If `x` and `y` are the same rating, the matching score is `1`. 
- If `x` and `y` are different ratings, the matching score is `0`.

### Ranker

The matching score is calculated using the mean average precision (mAP) for the annotation results.

### RectangleLabels

The method used to calculate the matching score depends on what you choose as the **Metric name** on the **Annotation Settings** page from the following options: 
- Intersection over Union (IoU), averaged over all bounding box pairs with the best match. Default.
- Precision computed for some threshold imposed on IoU.
- Recall computed for some threshold imposed on IoU.
- F-score computed for some threshold imposed on IoU.

### PolygonLabels

The method used to calculate the matching score depends on what you choose as the **Metric name** on the **Annotation Settings** page from the following options:
- Intersection over Union (IoU), averaged over all polygon pairs with the best match. Default. 
- Precision computed for some threshold imposed on IoU.
- Recall computed for some threshold imposed on IoU.
- F-score computed for some threshold imposed on IoU.

## Agreement method

The agreement method defines how [matching scores](stats.html#Matching-score) across all annotations for a task are combined to form a single inter-annotator agreement score.

There are several possible methods you can specify on the **Annotation Settings** for a project.

### Complete linkage
Complete linkage task agreement groups annotations so that all the matching scores within a given group are higher than the threshold. The agreement score is the maximum group size divided by the total count of annotations. 

Review the diagram for a full explanation:
<div style="text-align:center"><img alt="Diagram showing annotations are collected for each task, matching scores are computed for each pair, and grouping and agreement score calculation happens as detailed in the surrounding text." width=800 height=375 src="/images/LSE/stats-complete-linkage.png"/></div>

### Single linkage

Single linkage task agreement groups annotations so that at least one of the matching scores within a given group is higher than the threshold. The agreement score is the maximum group size divided by the total count of annotations. 

Review the diagram for a full explanation:
<div style="text-align:center"><img alt="Diagram showing annotations are collected for each task, matching scores are computed for each pair, and grouping and agreement score calculation happens as detailed in the surrounding text." width=800 height=360 src="/images/LSE/stats-single-linkage.png"/></div>

### No grouping

No grouping task agreement uses the mean average of all inter-annotation matching scores for each annotation pair as the final task agreement score. 

Review the diagram for a full explanation:
<div style="text-align:center"><img alt="Diagram showing annotations are collected for each task, matching scores are computed for each pair, the resulting scores are averaged for a task." width=800 height=365 src="/images/LSE/stats-no_grouping.png"/></div>

### Example
One annotation that labels the text span "Excellent tool" as "positive", a second annotation that labels the span "tool" as "positive", and a third annotation that labels the text span "tool" as "negative".
<br/><div style="text-align:center"><img alt="diagram showing example labeling scenario duplicated in surrounding text" width=800 height=100 src="/images/LSE/stats-agreement-example.jpg"/></div>

The matching score for the first two annotations is 50%, based on the intersection of the text spans. The matching score comparing the second annotation with the third annotation is 0%, because the same text span was labeled differently. 

The task agreement conditions use a threshold of 40% to group annotations based on the matching score, so the first and second annotations are matched with each other, and the third annotation is considered mismatched. In this case, task agreement exists for 2 of the 3 annotations, so the overall task agreement score is 67%.  



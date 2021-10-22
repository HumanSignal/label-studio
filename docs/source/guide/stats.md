---
title: Annotation statistics
short: Annotation statistics
badge: <i class='ent'></i>
type: guide
order: 413
meta_title: Data Labeling Statistics
meta_description: Label Studio Enterprise documentation about task agreement, annotator consensus, and other data annotation statistics for data labeling and machine learning projects.
---

<div class="enterprise"><p>
Label Studio Enterprise Edition includes various annotation and labeling statistics. The open source Community Edition of Label Studio does not perform these statistical calculations. If you're using Label Studio Community Edition, see <a href="label_studio_compare.html">Label Studio Features</a> to learn more.
</p></div>

Annotation statistics help you determine the quality of your dataset, its readiness to be used to train models, and assess the performance of your annotators. 

## Task agreement

Task agreement shows the consensus between multiple annotators when labeling the same task. There are several types of task agreement in Label Studio Enterprise:
- a per-task agreement score, visible on the Data Manager page for a project. This displays how well the annotations on a particular task match across annotators. 
- an inter-annotator agreement matrix, visible on the Members page for a project. This displays how well the annotations from specific annotators agree with each other in general, or for specific tasks. 

You can also see how the annotations from a specific annotator compare to the prediction scores for a task, or how they compare to the ground truth labels for a task.

For more about viewing agreement in Label Studio Enterprise, see [Verify model and annotator performance](quality.html#Verify-model-and-annotator-performance).

## Agreement method

The agreement method defines how [agreement scores](stats.html#Agreement-score) across all annotations for a task are combined to form a single inter-annotator agreement score. Label Studio uses the mean average of all inter-annotation agreement scores for each annotation pair as the final task agreement score. 

Review the diagram for a full explanation:
<div style="text-align:center"><img alt="Diagram showing annotations are collected for each task, agreement scores are computed for each pair, the resulting scores are averaged for a task." width=800 height=365 src="/images/LSE/stats-no_grouping.png"/></div>

### Example
One annotation that labels the text span "Excellent tool" as "positive", a second annotation that labels the span "tool" as "positive", and a third annotation that labels the text span "tool" as "negative".
<br/><div style="text-align:center"><img alt="diagram showing example labeling scenario duplicated in surrounding text" width=800 height=100 src="/images/LSE/stats-agreement-example.jpg"/></div>

The agreement score for the first two annotations is 50%, based on the intersection of the text spans. The agreement score comparing the second annotation with the third annotation is 0%, because the same text span was labeled differently. 

The task agreement conditions use a threshold of 40% to group annotations based on the agreement score, so the first and second annotations agree with each other, and the third annotation is considered mismatched. In this case, task agreement exists for 2 of the 3 annotations, so the overall task agreement score is 67%.

## Agreement score

Depending on the type of labeling that you perform, you can select a different type of agreement metric to use to calculate the agreement score used in task agreement statistics. See [Define the agreement metric for annotation statistics](setup_project.html#Define-the-agreement-metric-for-annotation-statistics). 

The agreement score assesses the similarity of annotations for a specific task. For example, for two given annotations `x` and `y`, an agreement metric that performs a naive comparison of the results works like the following:
- If both `x` and `y` are empty annotations, the agreement score is `1`.
- If `x` and `y` share no similar points, the agreement score is `0`. 
- If different labeling types are used in `x` and `y`, the partial agreement scores for each data labeling type are averaged. 

For categorical or classification labeling tasks, such as those using the Choices tag, the agreement score is calculated using the agreement function specified in the project settings. 

You can also create your own [custom agreement metric](custom_metric.html) to calculate an agreement metric. 

The following examples describe how the agreement scores for various labeling configuration tags can be computed. 

### Choices
For data labeling tasks where annotators select a choice, such as image or text classification, you can select from multiple agreement metrics.

If you select the `Exact matching choices` agreement metric, the agreement score for two given task annotations `x` and `y` is computed like follows:
- If `x` and `y` are the same choice, the agreement score is `1`.
- If `x` and `y` are different choices, the agreement score is `0`.

### TextArea
For data labeling tasks where annotators transcribe text in a text area, the resulting annotations contain a list of text. 

You can select agreement metrics based on the intersection over one-dimensional text spans such as splitting the text area by words or characters, or using an [edit distance algorithm](https://en.wikipedia.org/wiki/Edit_distance). Decide what method to use to calculate the agreement score based on your use case and how important precision is for your data labels.

Using edit distance, the agreement score for two given task annotations `x` and `y` is computed like follows:
- The list of text items in each annotation is indexed, such that `x = [x1, x2, ..., xn]` and similarly, `y = [y1, y2, ..., yn]`.  
- For each aligned pair of text items across the two annotations `(x1, y1)` the similarity of the text is calculated.
- For each unaligned pair, for example, when one list of text is longer than the other, the similarity is zero. 
- The similarity scores are averaged across all pairs, and the result is the agreement score for the task. 

### Labels

For data labeling tasks where annotators assign specific labels to regions or text spans, the agreement score is calculated by comparing the intersection of annotations over the result spans, normalized by the length of each span. 

For two given task annotations `x` and `y`, the agreement score formula is `m(x, y) = spans(x) ∩ spans(y)`.

### Rating

For data labeling tasks where annotators select a rating, the agreement score for two given task annotations `x` and `y` is computed like follows, using an exact agreement function:

- If `x` and `y` are the same rating, the agreement score is `1`. 
- If `x` and `y` are different ratings, the agreement score is `0`.

### Ranker

For data labeling tasks where annotators perform ranking, the agreement score is based on the mean average precision (mAP) of the annotation results.

### RectangleLabels

For data labeling tasks where annotators create bounding boxes of rectangles and label those rectangles, the agreement score calculation depends on what you select as the **Metric name** on the **Annotation Settings** page. Select one of the following options: 
- Intersection over Union (IoU), averaged over all bounding box pairs with the best match. This is the default agreement metric for bounding boxes. 
- Precision computed for some threshold imposed on IoU.
- Recall computed for some threshold imposed on IoU.
- F1 score, or F-score, computed for some threshold imposed on IoU.

### PolygonLabels

For data labeling tasks where annotators create polygons and label those polygonal regions, the agreement score calculation depends on what you select as the **Metric name** on the **Annotation Settings** page. Select one of the following options:
- Intersection over Union (IoU), averaged over all polygon pairs with the best match. This is the default agreement metric for polygons.  
- Precision computed for some threshold imposed on IoU.
- Recall computed for some threshold imposed on IoU.
- F1 score, or F-score, computed for some threshold imposed on IoU.
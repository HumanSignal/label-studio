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

Annotation statistics help you determine the quality of your dataset, its readiness to be used to train models, and assess the performance of your annotators. 

## Task agreement

Task agreement shows the consensus between multiple annotators when labeling the same task. There are several types of task agreement in Label Studio Enterprise:
- a per-task agreement score, visible on the Data Manager page for a project. This displays how well the annotations on a particular task match across annotators. 
- an inter-annotator agreement matrix, visible on the Members page for a project. This displays how well the annotations from specific annotators agree with each other in general, or for specific tasks. 

You can also see how the annotations from a specific annotator compare to the prediction scores for a task, or how they compare to the ground truth labels for a task.

For more about viewing agreement in Label Studio Enterprise, see [Verify model and annotator performance](quality.html#Verify-model-and-annotator-performance).

## Agreement method

The agreement method defines how [matching scores](stats.html#Matching-score) across all annotations for a task are combined to form a single inter-annotator agreement score. Label Studio uses the mean average of all inter-annotation matching scores for each annotation pair as the final task agreement score. 

Review the diagram for a full explanation:
<div style="text-align:center"><img alt="Diagram showing annotations are collected for each task, matching scores are computed for each pair, the resulting scores are averaged for a task." width=800 height=365 src="/images/LSE/stats-no_grouping.png"/></div>

### Example
One annotation that labels the text span "Excellent tool" as "positive", a second annotation that labels the span "tool" as "positive", and a third annotation that labels the text span "tool" as "negative".
<br/><div style="text-align:center"><img alt="diagram showing example labeling scenario duplicated in surrounding text" width=800 height=100 src="/images/LSE/stats-agreement-example.jpg"/></div>

The matching score for the first two annotations is 50%, based on the intersection of the text spans. The matching score comparing the second annotation with the third annotation is 0%, because the same text span was labeled differently. 

The task agreement conditions use a threshold of 40% to group annotations based on the matching score, so the first and second annotations are matched with each other, and the third annotation is considered mismatched. In this case, task agreement exists for 2 of the 3 annotations, so the overall task agreement score is 67%.

## Matching score

Depending on the type of labeling that you perform, you can select a different type of matching function to use to calculate the matching score used in task agreement statistics. See how to [Define the matching function for annotation statistics](setup_project.html#Define-the-matching-function-for-annotation-statistics). 

The matching score assesses the similarity of annotations for a specific task.

### Available matching functions

The following table lists the matching functions available in Label Studio Enterprise. If you want to use a different matching function, you can [create a custom matching function](custom_metric.html).


| Matching Function | Tag | Labeling Type | Description |
| --- | --- | --- | --- | 
| Exact matching choices | Choices | Categorical, Classification | Evaluates whether annotations exactly match. | 
| Choices per span region | Choices | Categorical, Classification | Evaluates whether specific choices applied to specific text spans match. | 
| Choices per hypertext span region | Choices | Categorical, Classification | Evaluates whether specific choices applied to specific hypertext spans match. |
| Choices per bbox region | Choices | Bounding Boxes, Categorical, Classification | Evaluates whether specific choices applied to specific bounding box regions match. |  
| Precision on Choices per bbox region | Choices | Bounding Boxes, Categorical, Classification | Evaluates the precision of specific choices applied to specific bounding box regions. |   
| Recall on Choices per bbox region | Choices | Bounding Boxes, Categorical, Classification | Evaluates the recall of specific choices applied to specific bounding box regions. |   
| F1 on Choices per bbox region | Choices | Bounding Boxes, Categorical, Classification | Evaluates the F1, or F-score, of specific choices applied to specific bounding box regions. |
| Choices per polygon region | Choices | Polygons, Categorical, Classification | Evaluates whether specific choices applied to specific polygon regions match. |   
| Precision on Choices per polygon region | Choices | Polygons, Categorical, Classification |  Evaluates the precision of specific choices applied to specific polygon regions. |   
| Recall on Choices per polygon region | Choices | Polygons, Categorical, Classification | Evaluates the recall of specific choices applied to specific polygon regions. |   
| F1 on Choices per polygon region | Choices | Polygons, Categorical, Classification | Evaluates the F1, or F-score, of specific choices applied to specific polygon regions. |
| Text edit distance | TextArea | Transcription | Uses the edit distance algorithm to calculate how dissimilar two text annotations are to one another. | 
| Text edit distance per span region | TextArea | Text | Uses the edit distance algorithm to calculate how dissimilar two text spans are to one another. |
| Text edit distance per span region, with percentage of matched spans by IOU w.r.t threshold | TextArea | Text | Uses the edit distance algorithm to calculate how dissimilar two text spans are to one another, then calculate the percentage of overlap compared to the union (IOU) of matching spans and compare the IOU to a threshold. |
| Text edit distance per hypertext span region, with percentage of matched spans by IOU w.r.t threshold | TextArea | Hypertext | Uses the edit distance algorithm to calculate how dissimilar two text spans are to one another, then calculate the intersection over union (IOU) for the percentage of matching spans and compare the IOU to a threshold. |
| Text edit distance per bbox region | TextArea | Optical character recognition (OCR) with bounding boxes | Uses the edit distance algorithm to calculate how dissimilar two text areas are to each other for each bounding box region they are associated with. | 
| Text edit distance per polygon region | TextArea | OCR with polygons | Uses the edit distance algorithm to calculate how dissimilar two text areas are to each other for each polygonal region they are associated with. | 
| Intersection over 1D regions | Labels | Semantic Segmentation, Named Entity Recognition | Evaluates whether two given one-dimensional labeled regions have points in common. | 
| Percentage of matched spans by IOU w.r.t threshold | Labels | Semantic Segmentation, Named Entity Recognition | Evaluates the percentage by which two given labeled regions overlap compared to the union (IOU) of the regions, and compare the IOU to a threshold.
| Intersection over 1D spans without labels | Region | Image Segmentation, Computer Vision | Evaluates whether two given one-dimensional regions have points in common. |
| Percentage of matched spans without labels by IOU w.r.t threshold | Region | Image Segmentation, Object Detection | Evaluates the percentage by which two given regions overlap compared to the union (IOU) of the regions, and compare the IOU to a threshold.|
| Intersection over 1D timeseries spans | TimeSeriesLabels | Time Series | Evaluates whether two given one-dimensional time series spans have points in common. |
| Intersection over HTML spans | HyperTextLabels | HTML | Evaluates whether two given hypertext spans have points in common. |
| Percentage of matched spans by IOU w.r.t threshold |  HyperTextLabels | HTML | Evaluates the percentage by which two given hypertext regions overlap compared to the union (IOU) of the regions, and compare the IOU to a threshold. |
| Intersection over Paragraphs | ParagraphLabels | Dialogue, Text | Evaluates whether two given one-dimensional paragraph-labeled spans have points in common. |
| Percentage of matched spans by IOU w.r.t threshold | ParagraphLabels | Dialogue, Text | Evaluates the percentage by which two given paragraph-labeled regions overlap compared to the union (IOU) of the regions, and compare the IOU to a threshold. |
| Average precision for ranking | Ranker | All | Calculates the precision for the ranking. |
| IOU for bounding boxes | RectangleLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two bounding box regions. |
| Precision at specific IOU threshold for bounding boxes | RectangleLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two bounding box regions, then computes the precision for the values above a threshold. |
| Recall at specific IOU threshold for bounding boxes | RectangleLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two bounding box regions, then computes the recall for the values above a threshold. |
| F1 score at specific IOU threshold for bounding boxes | RectangleLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two bounding box regions, then computes the F1-score for the values above a threshold. |
| IOU for polygons | PolygonLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two polygonal regions. | 
| Precision at specific IOU threshold for polygons | PolygonLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two polygonal regions, then computes the precision for the values above a threshold. |
| Recall at specific IOU threshold for polygons | PolygonLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two polygonal regions, then computes the recall for the values above a threshold. |
| F1 score at specific IOU threshold for polygons | PolygonLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two polygonal regions, then computes the F1-score for the values above a threshold. |
| Exact matching pairwise comparison | Pairwise | Comparison | Evaluates whether the results exactly match. | 
| Naive comparison of result dict | All tags | All types | Evaluates whether annotation results match. | 
| Exact matching rating | Rating | Evaluation, Rating | Evaluates the ratings assigned to tasks exactly match. |
| Common subtree matches | Taxonomy | Categorization, Classification | Evaluates common subtree matches for a taxonomy of choices. |
| Common labels matches | Taxonomy | Categorization, Classification, Named Entity Recognition | Evaluates common label matches for a taxonomy of labels assigned to regions. | 
| Your custom AWS function | All tags | All types | Performs the evaluation function that you define. See [create a custom matching function](custom_metric.html). |
| KeyPoint matching function | KeyPointLabels | Computer Vision | Evaluates whether key point annotations match. | 
| OCR distance | Rectangle | Optical Character Recognition | Uses the edit distance algorithm to calculate how dissimilar two text areas are to each other for each rectangular region they are associated with. |


### Naive matching function example 

For example, for two given annotations `x` and `y`, a matching function that performs a naive comparison of the results works like the following:
- If both `x` and `y` are empty annotations, the matching score is `1`.
- If `x` and `y` share no similar points, the matching score is `0`. 
- If different labeling types are used in `x` and `y`, the partial matching scores for each data labeling type are averaged.

The following examples describe how the matching scores for various labeling configuration tags can be computed. 

### Choices
For data labeling tasks where annotators select a choice, such as image or text classification, multiple matching functions are available to select.

If you select the `Exact matching choices` matching function, the matching score for two given task annotations `x` and `y` is computed like follows:
- If `x` and `y` are the same choice, the matching score is `1`. 
- If `x` and `y` are different choices, the matching score is `0`.

### TextArea
For data labeling tasks where annotators transcribe text in a text area, the resulting annotations contain a list of text. 

You can select matching functions based on the intersection over one-dimensional text spans such as splitting the text area by words or characters, or using an [edit distance algorithm](https://en.wikipedia.org/wiki/Edit_distance). Decide what method to use to calculate the matching score based on your use case and how important precision is for your data labels.

The matching score for two given task annotations `x` and `y` is computed like follows:
- The list of text items in each annotation is indexed, such that `x = [x1, x2, ..., xn]` and similarly, `y = [y1, y2, ..., yn]`.  
- For each aligned pair of text items across the two annotations `(x1, y1)` the similarity of the text is calculated.
- For each unaligned pair, for example, when one list of text is longer than the other, the similarity is zero. 
- The similarity scores are averaged across all pairs, and the result is the matching score for the task. 

### Labels

For data labeling tasks where annotators assign specific labels to regions or text spans, the matching score is calculated by comparing the intersection of annotations over the result spans, normalized by the length of each span. 

For two given task annotations `x` and `y`, the matching score formula is `m(x, y) = spans(x) ∩ spans(y)`.

### Rating

For data labeling tasks where annotators select a rating, the matching score for two given task annotations `x` and `y` is computed like follows, using an exact matching function:

- If `x` and `y` are the same rating, the matching score is `1`. 
- If `x` and `y` are different ratings, the matching score is `0`.

### Ranker

For data labeling tasks where annotators perform ranking, the matching score is based on the mean average precision (mAP) of the annotation results.

### RectangleLabels

For data labeling tasks where annotators create bounding boxes of rectangles and label those rectangles, the matching score calculation depends on what you select as the **Metric name** on the **Annotation Settings** page. Select one of the following options: 
- Intersection over Union (IoU), averaged over all bounding box pairs with the best match. This is the default matching function. 
- Precision computed for some threshold imposed on IoU.
- Recall computed for some threshold imposed on IoU.
- F1 score, or F-score, computed for some threshold imposed on IoU.

### PolygonLabels

For data labeling tasks where annotators create polygons and label those polygonal regions, the matching score calculation depends on what you select as the **Metric name** on the **Annotation Settings** page. Select one of the following options:
- Intersection over Union (IoU), averaged over all polygon pairs with the best match. This is the default matching function.  
- Precision computed for some threshold imposed on IoU.
- Recall computed for some threshold imposed on IoU.
- F1 score, or F-score, computed for some threshold imposed on IoU.
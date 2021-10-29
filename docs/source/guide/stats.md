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

The task agreement conditions use a threshold of 40% to group annotations based on the agreement score, so the first and second annotations are matched with each other, and the third annotation is considered mismatched. In this case, task agreement exists for 2 of the 3 annotations, so the overall task agreement score is 67%.

## Agreement score

Depending on the type of labeling that you perform, you can select a different type of agreement metric to use to calculate the agreement score used in task agreement statistics. See how to [Define the agreement metric for annotation statistics](setup_project.html#Define-the-matching-function-for-annotation-statistics). 

The agreement score assesses the similarity of annotations for a specific task.

### Available agreement metrics

The following table lists the agreement metrics available in Label Studio Enterprise. If you want to use a different agreement metric, you can [create a custom agreement metric](custom_metric.html).

| Agreement Metric | Tag | Labeling Type | Description |
| --- | --- | --- | --- | 
| [Naive comparison of result](#Naive-agreement-metric-example) | All tags | All types | Evaluates whether annotation results match, ignoring any label weights. |
| [Custom agreement metric](custom_metric.html) | All tags | All types | Performs the evaluation function that you define. See [create a custom agreement metric](custom_metric.html). |
| [Exact matching choices](#Exact-matching-choices-example) | Choices | Categorical, Classification | Evaluates whether annotations exactly match, considering label weights. | 
| [Choices per span region](#Exact-matching-choices-example) | Choices | Categorical, Classification | Evaluates whether specific choices applied to specific text spans match. | 
| [Choices per hypertext span region](#Exact-matching-choices-example) | Choices | Categorical, Classification | Evaluates whether specific choices applied to specific hypertext spans match. |
| [Choices per bbox region](#Exact-matching-choices-example) | Choices | Bounding Boxes, Categorical, Classification | Evaluates whether specific choices applied to specific bounding box regions match. |  
| Precision on Choices per bbox region | Choices | Bounding Boxes, Categorical, Classification | Evaluates the precision of specific choices applied to specific bounding box regions. |   
| Recall on Choices per bbox region | Choices | Bounding Boxes, Categorical, Classification | Evaluates the recall of specific choices applied to specific bounding box regions. |   
| F1 on Choices per bbox region | Choices | Bounding Boxes, Categorical, Classification | Evaluates the F1, or F-score, of specific choices applied to specific bounding box regions. |
| [Choices per polygon region](#Exact-matching-choices-example) | Choices | Polygons, Categorical, Classification | Evaluates whether specific choices applied to specific polygon regions match. |   
| Precision on Choices per polygon region | Choices | Polygons, Categorical, Classification |  Evaluates the precision of specific choices applied to specific polygon regions. |   
| Recall on Choices per polygon region | Choices | Polygons, Categorical, Classification | Evaluates the recall of specific choices applied to specific polygon regions. | 
| F1 on Choices per polygon region | Choices | Polygons, Categorical, Classification | Evaluates the F1, or F-score, of specific choices applied to specific polygon regions. |
| Intersection over 1D regions | Labels | Semantic Segmentation, Named Entity Recognition | Evaluates whether two given one-dimensional labeled regions have points in common. | 
| [Percentage of matched spans by IOU w.r.t threshold](#Intersection-over-Union-example) | Labels | Semantic Segmentation, Named Entity Recognition | Evaluates the percentage by which two given labeled regions overlap compared to the union (IOU) of the regions, and compare the IOU to a threshold.
| Common subtree matches | Taxonomy | Categorization, Classification | Evaluates common subtree matches for a taxonomy of choices. |
| Common labels matches | Taxonomy | Categorization, Classification, Named Entity Recognition | Evaluates common label matches for a taxonomy of labels assigned to regions. | 
| Intersection over 1D spans without labels | Region | Image Segmentation, Computer Vision | Evaluates whether two given one-dimensional regions have points in common. |
| [Percentage of matched spans without labels by IOU w.r.t threshold](#Intersection-over-Union-example) | Region | Image Segmentation, Object Detection | Evaluates the percentage by which two given regions overlap compared to the union (IOU) of the regions, and compare the IOU to a threshold.|
| [Text edit distance](#Edit-distance-algorithm-example) | TextArea | Transcription | Uses the edit distance algorithm to calculate how dissimilar two text annotations are to one another. | 
| [Text edit distance per span region](#Edit-distance-algorithm-example) | TextArea | Text | Uses the edit distance algorithm to calculate how dissimilar two text spans are to one another. |
| [Text edit distance per span region](#Edit-distance-algorithm-example), with percentage of matched spans by [IOU w.r.t threshold](#Intersection-over-Union-example) | TextArea | Text | Uses the edit distance algorithm to calculate how dissimilar two text spans are to one another, then calculate the percentage of overlap compared to the union (IOU) of matching spans and compare the IOU to a threshold. |
| [Text edit distance per hypertext span region](#Edit-distance-algorithm-example), with percentage of matched spans by IOU w.r.t threshold | TextArea | Hypertext | Uses the edit distance algorithm to calculate how dissimilar two text spans are to one another, then calculate the intersection over union (IOU) for the percentage of matching spans and compare the IOU to a threshold. |
| [Text edit distance per bbox region](#Edit-distance-algorithm-example) | TextArea | Optical character recognition (OCR) with bounding boxes | Uses the edit distance algorithm to calculate how dissimilar two text areas are to each other for each bounding box region they are associated with. | 
| [Text edit distance per polygon region](#Edit-distance-algorithm-example) | TextArea | OCR with polygons | Uses the edit distance algorithm to calculate how dissimilar two text areas are to each other for each polygonal region they are associated with. |
| [OCR distance](#Edit-distance-algorithm-example) | Rectangle | Optical Character Recognition | Uses the [edit distance algorithm](#Edit-distance-algorithm-example) to calculate how dissimilar two text areas are to each other for each rectangular region they are associated with. |
| Intersection over HTML spans | HyperTextLabels | HTML | Evaluates whether two given hypertext spans have points in common. |
| [Percentage of matched spans by IOU w.r.t threshold](#Intersection-over-Union-example) |  HyperTextLabels | HTML | Evaluates the percentage by which two given hypertext regions overlap compared to the union (IOU) of the regions, and compare the IOU to a threshold. |
| Intersection over Paragraphs | ParagraphLabels | Dialogue, Text | Evaluates whether two given one-dimensional paragraph-labeled spans have points in common. |
| [Percentage of matched spans by IOU w.r.t threshold](#Intersection-over-Union-example) | ParagraphLabels | Dialogue, Text | Evaluates the percentage by which two given paragraph-labeled regions overlap compared to the union (IOU) of the regions, and compare the IOU to a threshold. |
| Average precision for ranking | Ranker | All types | Calculates the precision for the ranking. |
| [IOU for bounding boxes](#Intersection-over-Union-example) | RectangleLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two bounding box regions. |
| Precision at specific [IOU threshold](#Intersection-over-Union-example) for bounding boxes | RectangleLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two bounding box regions, then computes the precision for the values above a threshold. |
| Recall at specific [IOU threshold](#Intersection-over-Union-example) for bounding boxes | RectangleLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two bounding box regions, then computes the recall for the values above a threshold. |
| F1 score at specific [IOU threshold](#Intersection-over-Union-example) for bounding boxes | RectangleLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two bounding box regions, then computes the F1-score for the values above a threshold. |
| [IOU for polygons](#Intersection-over-Union-example) | PolygonLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two polygonal regions. | 
| Precision at specific [IOU threshold](#Intersection-over-Union-example) for polygons | PolygonLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two polygonal regions, then computes the precision for the values above a threshold. |
| Recall at specific [IOU threshold](#Intersection-over-Union-example) for polygons | PolygonLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two polygonal regions, then computes the recall for the values above a threshold. |
| F1 score at specific [IOU threshold](#Intersection-over-Union-example) for polygons | PolygonLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two polygonal regions, then computes the F1-score for the values above a threshold. |
| KeyPoint agreement metric | KeyPointLabels | Computer Vision | Evaluates whether key point annotations match. |
| Intersection over 1D timeseries spans | TimeSeriesLabels | Time Series | Evaluates whether two given one-dimensional time series spans have points in common. |
| [Exact matching pairwise comparison](#Exact-matching-choices-example) | Pairwise | Comparison | Evaluates whether the results exactly match. | 
| [Exact matching rating](#Exact-matching-choices-example) | Rating | Evaluation, Rating | Evaluates the ratings assigned to tasks exactly match. |

### Naive agreement metric example 

For example, for two given annotations `x` and `y`, an agreement metric that performs a naive comparison of the results works like the following:
- If both `x` and `y` are empty annotations, the agreement score is `1`.
- If `x` and `y` share no similar points, the agreement score is `0`. 
- If different labeling types are used in `x` and `y`, the partial agreement scores for each data labeling type are averaged.

### Exact matching choices example
For data labeling tasks where annotators select a choice, such as image or text classification, or data labeling tasks where annotators select a rating, you can select the `Exact matching choices` agreement metric. For this function, the agreement score for two given task annotations `x` and `y` is computed as follows:
- If `x` and `y` are the same choice, the agreement score is `1`. 
- If `x` and `y` are different choices, the agreement score is `0`.

### Edit distance algorithm example 

For data labeling tasks where annotators transcribe text in a text area, the resulting annotations contain a list of text. 

You can select agreement metrics based on the intersection over one-dimensional text spans such as splitting the text area by words or characters, or using an [edit distance algorithm](https://en.wikipedia.org/wiki/Edit_distance). Decide what method to use to calculate the agreement score based on your use case and how important precision is for your data labels.

The agreement score for two given task annotations `x` and `y` is computed as follows:
- The list of text items in each annotation is indexed, such that `x = [x1, x2, ..., xn]` and similarly, `y = [y1, y2, ..., yn]`.  
- For each aligned pair of text items across the two annotations `(x1, y1)` the similarity of the text is calculated.
- For each unaligned pair, for example, when one list of text is longer than the other, the similarity is zero. 
- The similarity scores are averaged across all pairs, and the result is the agreement score for the task.

### Intersection over Union example

The Intersection over Union (IoU) metric compares the area of overlapping regions, such as bounding boxes or polygons, with the overall area, or union, of the regions.

For example, for two annotations `x` and `y` containing either bounding boxes or polygons, the following calculation occurs:
- LSE identifies whether any regions overlap across the two annotations.  
- For each pair of overlapping regions across the annotations, the area of the overlap, or intersection `aI` is compared to the combined area `aU` of both regions, referred to as the union of the regions: `aI` ÷ `aU`
- The average of `aI` ÷ `aU` for each pair of regions is used as the IoU calculation for a pair of annotations.
For example, if there are two bounding boxes for each `x` and `y` annotations, the agreement of `x` and `y` = ((`aI` ÷ `aU`) + (`aI` ÷ `aU`)) ÷2 .

INSERT IMAGES

#### Intersection over union with threshold

You can use IoU with a threshold to calculate agreement. With a threshold you can consider only the regions that are most similar to each other. 

In this case, the same metric IoU metric of `aI` ÷ `aU` is calculated, but only the percentage of those above a threshold, say .75, are considered for the final agreement score. For example:

IoU for regions x1 and y1: `aI` ÷ `aU` = .99
IoU for regions x2 and y2: `aI` ÷ `aU` = .70
IoU for regions x3 and y3: `aI` ÷ `aU` = .82

Number of region pairs with IoU above the threshold of .75 = 2 of 3 

Agreement of `x` and `y` = .66

OR If it's an average of the IoU scores above the threshold, then it'd be .91 instead but that seems too high? 

#### Intersection over union with other metrics 
The IoU metric can be combined with other metrics. Several metrics in Label Studio Enterprise use IoU to establish initial agreement across annotations, then computes the precision, recall, or F1-score for the IoU values above a specific threshold. Text IoU can also include the edit distance algorithm. 




Precision at specific IOU threshold for polygons	PolygonLabels	Object Detection, Semantic Segmentation	Evaluates the overlap compared to the union (IOU) of two polygonal regions, then computes the precision for the values above a threshold.
Recall at specific IOU threshold for polygons	PolygonLabels	Object Detection, Semantic Segmentation	Evaluates the overlap compared to the union (IOU) of two polygonal regions, then computes the recall for the values above a threshold.
F1 score at specific IOU threshold for polygons	PolygonLabels	Object Detection, Semantic Segmentation	Evaluates the overlap compared to the union (IOU) of two polygonal regions, then computes the F1-score for the values above a threshold.
Precision at specific IOU threshold for bounding boxes	RectangleLabels	Object Detection, Semantic Segmentation	Evaluates the overlap compared to the union (IOU) of two bounding box regions, then computes the precision for the values above a threshold.
Recall at specific IOU threshold for bounding boxes	RectangleLabels	Object Detection, Semantic Segmentation	Evaluates the overlap compared to the union (IOU) of two bounding box regions, then computes the recall for the values above a threshold.
F1 score at specific IOU threshold for bounding boxes	RectangleLabels	Object Detection, Semantic Segmentation	Evaluates the overlap compared to the union (IOU) of two bounding box regions, then computes the F1-score for the values above a threshold.


Text edit distance per span region, with percentage of matched spans by IOU w.r.t threshold	TextArea	Text	Uses the edit distance algorithm to calculate how dissimilar two text spans are to one another, then calculate the percentage of overlap compared to the union (IOU) of matching spans and compare the IOU to a threshold.
Text edit distance per hypertext span region, with percentage of matched spans by IOU w.r.t threshold	TextArea	Hypertext	Uses the edit distance algorithm to calculate how dissimilar two text spans are to one another, then calculate the intersection over union (IOU) for the percentage of matching spans and compare the IOU to a threshold.





Percentage of matched spans by IOU w.r.t threshold	HyperTextLabels	HTML	Evaluates the percentage by which two given hypertext regions overlap compared to the union (IOU) of the regions, and compare the IOU to a threshold.
Percentage of matched spans by IOU w.r.t threshold	ParagraphLabels	Dialogue, Text	Evaluates the percentage by which two given paragraph-labeled regions overlap compared to the union (IOU) of the regions, and compare the IOU to a threshold.






IoU wrt threshold

IoU matched spans

For data labeling tasks where annotators assign specific labels to regions or text spans, the agreement score is calculated by comparing the intersection of annotations over the result spans, normalized by the length of each span. 

For two given task annotations `x` and `y`, the agreement score formula is `m(x, y) = spans(x) ∩ spans(y)`








### Intersection over one dimension example

Intersection over Paragraphs	ParagraphLabels	Dialogue, Text	Evaluates whether two given one-dimensional paragraph-labeled spans have points in common.

Intersection over HTML spans	HyperTextLabels	HTML	Evaluates whether two given hypertext spans have points in common.

Intersection over 1D spans without labels	Region	Image Segmentation, Computer Vision	Evaluates whether two given one-dimensional regions have points in common.

Intersection over 1D regions	Labels	Semantic Segmentation, Named Entity Recognition	Evaluates whether two given one-dimensional labeled regions have points in common.

Intersection over 1D timeseries spans	TimeSeriesLabels	Time Series	Evaluates whether two given one-dimensional time series spans have points in common.

### Precision example

For a given set of annotations, this agreement metric

### Recall example

For a given set of annotations, this agreement metric

### F1 score example

For a given set of annotations, this agreement metric

### Common matches example
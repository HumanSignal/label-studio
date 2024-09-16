---
title: How task agreement and labeling consensus are calculated
short: Task agreements
tier: enterprise
type: guide
order: 0
order_enterprise: 307
meta_title: Task agreement in Label Studio Enterprise
meta_description: Task agreement, or labeling consensus, and other data annotation statistics for data labeling and machine learning projects.
section: "Review & Measure Quality"
---

Label Studio Enterprise Edition includes various annotation and labeling statistics. The open source Community Edition of Label Studio does not perform these statistical calculations. If you're using Label Studio Community Edition, see <a href="https://labelstud.io/guide/label_studio_compare.html">Label Studio Features</a> to learn more.

Annotation statistics help you determine the quality of your dataset, its readiness to be used to train models, and assess the performance of your annotators and reviewers.


## Task agreement

Task agreement, also known as "labeling consensus" or "annotation consensus," shows the consensus between multiple annotators when labeling the same task. There are several types of task agreement in Label Studio Enterprise:
- a per-task agreement score, visible on the Data Manager page for a project. This displays how well the annotations on a particular task match across annotators. 
- an inter-annotator agreement matrix, visible on the Members page for a project. This displays how well the annotations from specific annotators agree with each other in general, or for specific tasks. 

You can also see how the annotations from a specific annotator compare to the prediction scores for a task, or how they compare to the ground truth labels for a task.

For more about viewing agreement in Label Studio Enterprise, see [Verify model and annotator performance](quality.html#Verify-model-and-annotator-performance).


### Configure task agreement settings for a project

To configure task agreement settings for a project, go to the project **Settings** page and select **Quality**. From here you can configure several the following:

* Select which agreement metric to use. The default metric is the [basic matching function](#Basic-matching-function). 
* Set a low agreement threshold. 

    A low agreement threshold  ensures that a task cannot be marked complete until it meets a minimum agreement threshold. 
* Customize the weight of different labels when calculating agreement. 

For more information, see [Project settings - Task agreement](project_settings_lse#task-agreement). 

## Agreement method

The agreement method defines how [agreement scores](stats.html#Agreement-score) across all annotations for a task are combined to form a single inter-annotator agreement score. Label Studio uses the mean average of all inter-annotation agreement scores for each annotation pair as the final task agreement score. 

Review the diagram for a full explanation:
<div style="text-align:center"><img alt="Diagram showing annotations are collected for each task, agreement scores are computed for each pair, the resulting scores are averaged for a task." src="/images/stats-no_grouping.png"/></div>

### Example
One annotation that labels the text span "Excellent tool" as "positive", a second annotation that labels the span "tool" as "positive", and a third annotation that labels the text span "tool" as "negative".
<br/><div style="text-align:center"><img alt="diagram showing example labeling scenario duplicated in surrounding text" src="/images/stats-agreement-example.png"/></div>

The agreement score for the first two annotations is 50%, based on the intersection of the text spans. The agreement score comparing the second annotation with the third annotation is 0%, because the same text span was labeled differently. 

The task agreement conditions use a threshold of 40% to group annotations based on the agreement score, so the first and second annotations are matched with each other, and the third annotation is considered mismatched. In this case, task agreement exists for 2 of the 3 annotations, so the overall task agreement score is 67%.

## Agreement score

Depending on the type of labeling that you perform, you can select a different type of agreement metric to use to calculate the agreement score used in task agreement statistics. See how to [Define the agreement metric for annotation statistics](setup_project.html#Define-the-matching-function-for-annotation-statistics). 

The agreement score assesses the similarity of annotations for a specific task.

### Available agreement metrics

The following table lists the agreement metrics available in Label Studio Enterprise. If you want to use a different agreement metric, you can [create a custom agreement metric](custom_metric.html).

| Agreement Metric | Tag | Labeling Type | Description |
| --- | --- | --- | --- | 
| [Basic matching function](#Basic-matching-function) | All tags | All types | Performs the default evaluation function for each control tag. |
| [Exact matching](#Exact-matching) | All tags | All types | Evaluates whether annotation results exactly match, ignoring any label weights. |
| [Custom agreement metric](custom_metric.html) | All tags | All types | Performs the evaluation function that you define. See [create a custom agreement metric](custom_metric.html). |
| [Exact matching choices](#Exact-matching-choices-example) | Choices | Categorical, Classification | Evaluates whether annotations exactly match, considering label weights. | 
| [Choices per span region](#Exact-matching-choices-example) | Choices | Categorical, Classification | Evaluates whether specific choices applied to specific text spans match. | 
| [Choices per hypertext span region](#Exact-matching-choices-example) | Choices | Categorical, Classification | Evaluates whether specific choices applied to specific hypertext spans match. |
| [Choices per bbox region](#Exact-matching-choices-example) | Choices | Bounding Boxes, Categorical, Classification | Evaluates whether specific choices applied to specific bounding box regions match. |  
| [Precision on Choices per bbox region](#Precision-example) | Choices | Bounding Boxes, Categorical, Classification | Evaluates the precision of specific choices applied to specific bounding box regions. |   
| [Recall on Choices per bbox region](#Recall-example) | Choices | Bounding Boxes, Categorical, Classification | Evaluates the recall of specific choices applied to specific bounding box regions. |   
| [F1 on Choices per bbox region](#F1-score-example) | Choices | Bounding Boxes, Categorical, Classification | Evaluates the F1, or F-score, of specific choices applied to specific bounding box regions. |
| [Choices per polygon region](#Exact-matching-choices-example) | Choices | Polygons, Categorical, Classification | Evaluates whether specific choices applied to specific polygon regions match. |   
| [Precision on Choices per polygon region](#Precision-example) | Choices | Polygons, Categorical, Classification |  Evaluates the precision of specific choices applied to specific polygon regions. |   
| [Recall on Choices per polygon region](#Recall-example) | Choices | Polygons, Categorical, Classification | Evaluates the recall of specific choices applied to specific polygon regions. | 
| [F1 on Choices per polygon region](#F1-score-example) | Choices | Polygons, Categorical, Classification | Evaluates the F1, or F-score, of specific choices applied to specific polygon regions. |
| [Intersection over 1D regions](#Intersection-over-one-dimension-example) | Labels | Semantic Segmentation, Named Entity Recognition | Evaluates whether two given one-dimensional labeled regions have points in common. | 
| [Percentage of matched spans by IOU w.r.t threshold](#Intersection-over-union-with-threshold) | Labels | Semantic Segmentation, Named Entity Recognition | Evaluates the percentage by which two given labeled regions overlap compared to the union (IOU) of the regions, and compare the IOU to a threshold.
| [Common subtree matches](#Common-matches-taxonomy-example) | Taxonomy | Categorization, Classification | Evaluates common subtree matches for a taxonomy of choices. |
| [Common labels matches](#Common-matches-taxonomy-example) | Taxonomy | Categorization, Classification, Named Entity Recognition | Evaluates common label matches for a taxonomy of labels assigned to regions. | 
| [Intersection over 1D spans without labels](#Intersection-over-one-dimension-example) | Region | Image Segmentation, Computer Vision | Evaluates whether two given one-dimensional regions have points in common. |
| [Percentage of matched spans without labels by IOU w.r.t threshold](#Intersection-over-union-with-threshold) | Region | Image Segmentation, Object Detection | Evaluates the percentage by which two given regions overlap compared to the union (IOU) of the regions, and compare the IOU to a threshold.|
| [Text edit distance](#Edit-distance-algorithm-example) | TextArea | Transcription | Uses the edit distance algorithm to calculate how dissimilar two text annotations are to one another. | 
| [Text edit distance per span region](#Edit-distance-algorithm-example) | TextArea | Text | Uses the edit distance algorithm to calculate how dissimilar two text spans are to one another. |
| [Text edit distance per span region](#Edit-distance-algorithm-example), with percentage of matched spans by [IOU w.r.t threshold](#Intersection-over-Union-example) | TextArea | Text | Uses the edit distance algorithm to calculate how dissimilar two text spans are to one another, then calculate the percentage of overlap compared to the union (IOU) of matching spans and compare the IOU to a threshold. |
| [Text edit distance per hypertext span region](#Edit-distance-algorithm-example), with percentage of matched spans by [IOU w.r.t threshold](#Intersection-over-Union-example) | TextArea | Hypertext | Uses the edit distance algorithm to calculate how dissimilar two text spans are to one another, then calculate the intersection over union (IOU) for the percentage of matching spans and compare the IOU to a threshold. |
| [Text edit distance per bbox region](#Edit-distance-algorithm-example) | TextArea | Optical character recognition (OCR) with bounding boxes | Uses the edit distance algorithm to calculate how dissimilar two text areas are to each other for each bounding box region they are associated with. | 
| [Text edit distance per polygon region](#Edit-distance-algorithm-example) | TextArea | OCR with polygons | Uses the edit distance algorithm to calculate how dissimilar two text areas are to each other for each polygonal region they are associated with. |
| [OCR distance](#Edit-distance-algorithm-example) | Rectangle | Optical Character Recognition | Uses the [edit distance algorithm](#Edit-distance-algorithm-example) to calculate how dissimilar two text areas are to each other for each rectangular region they are associated with. |
| [Intersection over HTML spans](#Intersection-over-one-dimension-example) | HyperTextLabels | HTML | Evaluates whether two given hypertext spans have points in common. |
| [Percentage of matched spans by IOU w.r.t threshold](#Intersection-over-union-with-threshold) |  HyperTextLabels | HTML | Evaluates the percentage by which two given hypertext regions overlap compared to the union (IOU) of the regions, and compare the IOU to a threshold. |
| [Intersection over Paragraphs](#Intersection-over-one-dimension-example) | ParagraphLabels | Dialogue, Text | Evaluates whether two given one-dimensional paragraph-labeled spans have points in common. |
| [Percentage of matched spans by IOU w.r.t threshold](#Intersection-over-union-with-threshold) | ParagraphLabels | Dialogue, Text | Evaluates the percentage by which two given paragraph-labeled regions overlap compared to the union (IOU) of the regions, and compare the IOU to a threshold. |
| [Average precision for ranking](#Precision-example) | Ranker | All types | Calculates the precision for the ranking. |
| [IOU for bounding boxes](#Intersection-over-Union-example) | RectangleLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two bounding box regions. |
| [Precision](#Precision-example) at specific [IOU threshold](#Intersection-over-union-with-threshold) for bounding boxes | RectangleLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two bounding box regions, then computes the precision for the values above a threshold. |
| [Recall](#Recall-example) at specific [IOU threshold](#Intersection-over-union-with-threshold) for bounding boxes | RectangleLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two bounding box regions, then computes the recall for the values above a threshold. |
| [F1 score](#F1-score-example) at specific [IOU threshold](#Intersection-over-union-with-threshold) for bounding boxes | RectangleLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two bounding box regions, then computes the F1-score for the values above a threshold. |
| [IOU for polygons](#Intersection-over-Union-example) | PolygonLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two polygonal regions. | 
| [Precision](#Precision-example) at specific [IOU threshold](#Intersection-over-union-with-threshold) for polygons | PolygonLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two polygonal regions, then computes the precision for the values above a threshold. |
| [Recall](#Recall-example) at specific [IOU threshold](#Intersection-over-union-with-threshold) for polygons | PolygonLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two polygonal regions, then computes the recall for the values above a threshold. |
| [F1 score](#F1-score-example) at specific [IOU threshold](#Intersection-over-union-with-threshold) for polygons | PolygonLabels | Object Detection, Semantic Segmentation | Evaluates the overlap compared to the union (IOU) of two polygonal regions, then computes the F1-score for the values above a threshold. |
| [KeyPoint agreement metric](#Intersection-over-one-dimension-example) | KeyPointLabels | Computer Vision | Evaluates whether key point annotations match. |
| [Intersection over 1D timeseries spans](#Intersection-over-one-dimension-example) | TimeSeriesLabels | Time Series | Evaluates whether two given one-dimensional time series spans have points in common. |
| [Exact matching pairwise comparison](#Exact-matching-choices-example) | Pairwise | Comparison | Evaluates whether the results exactly match. | 
| [Exact matching rating](#Exact-matching-choices-example) | Rating | Evaluation, Rating | Evaluates the ratings assigned to tasks exactly match. |

### Basic matching function

Performs the default evaluation function for each control tag. For example for `TextArea` tag `Edit distance` metric is used.

### Exact matching

For example, for two given annotations `x` and `y`, an agreement metric that performs a naive comparison of the results would work as follows:
- If both annotations `x` and `y` are empty, the agreement score is `1`.
- If the annotations share no similar regions, the agreement score is `0`.
- If multiple regions are in `x` and `y`, the partial agreement scores that are calculated for the corresponding region pairs are averaged.

#### Example 1

```
x:  choices1 => A
    choices2 => B

y:  choices1 => A
    choices2 => B
```

Agreement Calculation:

Both annotations `x` and `y` match exactly.
Agreement(x, y) = 1.0 (100%).

#### Example 2

```
x:  choices1 => A
    choices2 => B

y:  choices1 => A
    choices2 => C
```

Agreement Calculation:

`choices1` match, but `choices2` do not.
Agreement(x, y) = 0.5 (50%).

#### Example 3

```
x:  choices1 => A
    choices2 => B

y:  choices1 => C
    choices2 => D
```

Agreement Calculation:

Neither `choices1` nor `choices2` match.
Agreement(x, y) = 0 (0%).


#### Example 4

```
x:  choices1 => A
    choices2 => B
    choices3 => [not selected]

y:  choices1 => A
    choices2 => C
    choices3 => [not selected]
```

Agreement Calculation:

`choice1` match, `choice2` don't match, and `choices3` are not selected, which is treated as a <b>match</b>.
Agreement(x, y) = 0.6666 (66.66%).


### Exact matching choices example
For data labeling tasks where annotators select a choice, such as image or text classification, or data labeling tasks where annotators select a rating, you can select the `Exact matching choices` agreement metric. For this function, the agreement score for two given task annotations `x` and `y` is computed as follows:
- If `x` and `y` are the same choice, the agreement score is `1`. 
- If `x` and `y` are different choices, the agreement score is `0`.

When calculating agreement between selected choices conditional on a specific region, such as when `perRegion="true"` attribute is specified for the `<Choices>` tag, corresponding choice agreement is multiplied with region agreements. 

For example, [calculating intersection over union](#Intersection-over-Union-example) with two bounding boxes and corresponding choice selections:
* The IoU for the bounding box annotations results in an agreement score of 0.9.
* The conditional choices selected do not match, so that agreement score is 0. 
* As a result, the final agreement score for these two annotations is 0 (0.9 * 0 = 0).

### Edit distance algorithm example 

For data labeling tasks where annotators transcribe text in a text area, the resulting annotations contain a list of text. 

You can select agreement metrics based on the [intersection over one-dimensional text spans](#Intersection-over-one-dimension-example) such as splitting the text area by words or characters, or using an [edit distance algorithm](https://en.wikipedia.org/wiki/Edit_distance). Decide what method to use to calculate the agreement score based on your use case and how important precision is for your data labels.

The agreement score for two given task annotations `x` and `y` is computed as follows:
- The list of text items in each annotation is indexed, such that `x = [x1, x2, ..., xn]` and similarly, `y = [y1, y2, ..., yn]`.  
- For each aligned pair of text items across the two annotations `(x1, y1)` the similarity of the text is calculated.
- For each unaligned pair, for example, when one list of text is longer than the other, the similarity is zero. 
- The similarity scores are averaged across all pairs, and the result is the agreement score for the task.

The following **text edit distance** algorithms are available:
- Levenshtein
- Damerau-Levenshtein
- Hamming
- MLIPNS
- Jaro-Winkler
- Strcmp95
- Needleman-Wunsch
- Smith-Waterman

### Intersection over union example

The Intersection over Union (IoU) metric is used to compare the overlap between regions such as bounding boxes, polygons, or textual/time series one-dimensional spans—against the combined area, or union, of the regions.

For two annotations, `x` and `y`, which contain either bounding boxes or polygons, the following steps occur:

* **Identifying Overlapping Regions**: The system identifies whether any regions overlap across the two annotations. Overlaps are only considered for matched labels (i.e., regions assigned the same label or class).
* **Calculating IoU for Each Pair**: For each pair of overlapping regions, the area of overlap, or intersection (aI), is divided by the total combined area of the two regions, known as the union (aU). This gives the IoU for that pair as `aI ÷ aU`, which results in a value between `0` and `1`, where `1` indicates perfect overlap and `0` indicates no overlap.
* **Tracking the Maximum IoU**: When comparing multiple regions (e.g., multiple bounding boxes), the system tracks the highest IoU value for the pair using the formula `max_iou = max(iou, max_iou)`. This ensures that the most significant agreement between the two annotations is captured.
* **Avoiding Averaging Misconceptions**: In some cases, there may be multiple overlapping regions between annotations `x` and `y`. Rather than averaging all IoU values (which could be misleading), the highest IoU for each pair is retained, ensuring the most representative comparison of agreement between the annotations.

This method ensures that only the strongest level of overlap between regions is recorded for each annotation pair, reflecting the highest possible agreement between the two annotations.

#### Intersection over union with text

For data labeling tasks where annotators assign specific labels to text spans in **text**, **hypertext**, or **paragraphs of dialogue**, the agreement score is calculated by comparing the intersection of annotations over the result spans, normalized by the length of each span.

For two given task annotations `x` and `y`, the agreement score formula is `m(x, y) = spans(x) ∩ spans(y)`
- For text annotations, the span is defined by the `start` and `end` keys.
- For hypertext annotations, the span is defined by the `startOffset` and `endOffset` keys. 
- For paragraphs of dialogue annotations, the span is defined by the `startOffset` and `endOffset` keys. 

#### Intersection over union with time series

Intersection over Union (IoU) for time series data evaluates the overlap between two labeled regions within the time series. Here's how it works:

1. **Identify Regions**: Determine the start and end points of the labeled regions in the time series data.
2. **Calculate Intersection**: Find the overlapping duration between the two regions.
3. **Calculate Union**: Determine the total duration covered by both regions.
4. **Compute IoU**: Divide the intersection duration by the union duration.

For example, if you have two regions:
- Region A: (0, 20)
- Region B: (10, 30)
The intersection is (10, 20) with a duration of 10 units, and the union is (0, 30) with a duration of 30 units. The IoU would be 10/30 = 0.33.

#### Intersection over union with other metrics 
The IoU metric can be combined with other metrics. Several metrics in Label Studio Enterprise use IoU to establish initial agreement across annotations, then computes the [precision](#precision-example), [recall](#recall-example), or [F1-score](#f1-score-example) for the IoU values above a specific threshold. Text IoU can also include the [edit distance algorithm](#edit-distance-algorithm-example).

### Intersection over union with threshold

You can use IoU with a threshold to calculate agreement. With a threshold you can consider only the regions that are most similar to each other. 

In this case, the [same IoU metric](#Intersection-over-Union-example) of `aI` ÷ `aU` is calculated, but only the percentage of those above a threshold, say 0.5, are considered for the final agreement score. For example:

IoU for regions x1 and y1: `aI` ÷ `aU` = 0.99
IoU for regions x2 and y2: `aI` ÷ `aU` = 0.34
IoU for regions x3 and y3: `aI` ÷ `aU` = 0.82

Number of region pairs with IoU above the threshold of 0.5 = 2 of 3 

Agreement of `x` and `y` = 0.66

### Intersection over one dimension example

The intersection over one dimension metric is similar to the exact matching choices. This metric evaluates whether two given spans or regions have points in common. 

For example, for given one dimensional annotations `x` and `y`, identify whether any points are common between the annotations:
- Identify the list of points for annotation `x` and the list of points for annotation `y`.
- Compare the two lists. 
- Compare the total number of points in common against the total number of points, for example, 8 common points and 10 total points across the annotations.
- The resulting comparison is the agreement score for the annotations. For example, `0.80`.

### Precision example

For a given set of annotations, this agreement metric compares the number of true positives with the total number of positive results from the annotations. 

Precision is calculated for IoU with a threshold like the following example using an annotation `x` and an annotation `y`:

- Calculate the IoU for all relevant pairs of regions: 
IoU for regions x1 and y1: `aI` ÷ `aU` = 0.99, both labeled `Car`
IoU for regions x2 and y2: `aI` ÷ `aU` = 0.34, both labeled `Car`
IoU for regions x3 and y3: `aI` ÷ `aU` = 0.82, x3 labeled `Car`, y3 labeled `Airplane`
IoU for regions x4 and y4: `aI` ÷ `aU` = 0.44, x3 labeled `Car`, y3 labeled `Airplane`
IoU for regions x5 and y5: `aI` ÷ `aU` = 0.67, x5 labeled `Car`, y5 labeled `Airplane`
- Determine which labels are assigned to each region.
- For each pair of regions, determine whether the labels match and whether the IoU is above a threshold of 0.5.
  - True positive (TP) annotated regions are those with IoU values above the threshold and with matching labels. TP = 1, because x1 and y1 match and have an IoU above the threshold.
  - False positive (FP) regions are those where the labels do not match but the IoU values are above the threshold. FP = 2, because x3 and y3 do not match but the IoU value is above the threshold, and the same is true for x5 and y5. 
- Precision is calculated as TP ÷ (TP + FP), in this case, 1/3, or `0.33`. 


### Recall example

For a given set of annotations, this agreement metric compares the number of true positives with the total number of true positives and false negatives in the annotation results. 

Recall is calculated for IoU with a threshold like the following example using an annotation `x` and an annotation `y`:

- Calculate the IoU for all relevant pairs of regions: 
IoU for regions x1 and y1: `aI` ÷ `aU` = 0.99, both labeled `Car`
IoU for regions x2 and y2: `aI` ÷ `aU` = 0.34, both labeled `Car`
IoU for regions x3 and y3: `aI` ÷ `aU` = 0.82, x3 labeled `Car`, y3 labeled `Airplane`
IoU for regions x4 and y4: `aI` ÷ `aU` = 0.44, x4 labeled `Car`, y4 labeled `Airplane`
IoU for regions x5 and y5: `aI` ÷ `aU` = 0.67, x5 labeled `Car`, y5 labeled `Airplane`
- Determine which labels are assigned to each region.
- For each pair of regions, determine whether the labels match and whether the IoU is above a threshold of 0.5.
  - True positive (TP) annotated regions are those with IoU values above the threshold and with matching labels. TP = 1, because x1 and y1 match and have an IoU above the threshold.
  - False negative (FN) annotated regions are those with IoU values below the threshold, but the labels still match. FN = 1, because x2 and y2 match, but the IoU is below the threshold.
- Recall is calculated as TP ÷ (TP + FN), in this case, 1/2, or `0.5`.

### F1 score example

For a given set of annotations, this agreement metric compares the precision and recall for two annotations using the following formula:

F1 = 2 * (precision * recall) ÷ (precision + recall)

The F1-score is calculated for IoU with a threshold like the following example using an annotation `x` and an annotation `y`:

- Calculate the IoU for all relevant pairs of regions: 
IoU for regions x1 and y1: `aI` ÷ `aU` = 0.99, both labeled `Car`
IoU for regions x2 and y2: `aI` ÷ `aU` = 0.34, both labeled `Car`
IoU for regions x3 and y3: `aI` ÷ `aU` = 0.82, x3 labeled `Car`, y3 labeled `Airplane`
IoU for regions x4 and y4: `aI` ÷ `aU` = 0.44, x4 labeled `Car`, y5 labeled `Airplane`
IoU for regions x5 and y5: `aI` ÷ `aU` = 0.67, x5 labeled `Car`, y5 labeled `Airplane`
- Determine which labels are assigned to each region.
- For each pair of regions, determine whether the labels match and whether the IoU is above a threshold of 0.5.
  - True positive (TP) annotated regions are those with IoU values above the threshold and with matching labels. TP = 1, because x1 and y1 match and have an IoU above the threshold. 
  - False positive (FP) regions are those where the labels do not match but the IoU values are above the threshold. FP = 2, because x3 and y3 do not match but the IoU value is above the threshold, and the same is true for x5 and y5. 
  - False negative (FN) annotated regions are those with IoU values below the threshold, but the labels still match. FN = 1, because x2 and y2 match, but the IoU is below the threshold.
- Precision is calculated as TP ÷ (TP + FP), in this case, 1/3, or `0.33`. 
- Recall is calculated as TP ÷ (TP + FN), in this case, 1/2, or `0.5`.


For `x` and `y` annotations in this case, the F1-score =
```
2 * ((0.33 * 0.5) ÷ (0.33 + 0.5)) = 0.40
```

### Common matches taxonomy example

This metric applies for classification and taxonomy tasks. It looks at which items are selected, and if matching items are selected, counts the number of common items and compares them to the total number of selected items across both annotations.

For annotations `x` and `y`, if `x` has 3 selections in common with `y` out of a possible 4 selections, the agreement score is `0.75` because 3 of 4 possible selections match. This can happen for example if the first three options in a boolean classification task with three layers of nested options, but the fourth subtree option is different.

---
title: Task agreement
short: Agreement
tier: enterprise
type: guide
order: 0
order_enterprise: 307
meta_title: Task agreement in Label Studio Enterprise
meta_description: Task agreement, or labeling consensus, and other data annotation statistics for data labeling and machine learning projects.
section: "Review & Measure Quality"
---

In Label Studio Enterprise, you can apply different metrics to measure agreement between annotators. 

Task agreement, also known as "labeling consensus" or "annotation consensus," shows the agreement between multiple annotators when labeling the same task. 

Agreement helps you determine the quality of your dataset, its readiness to be used to train models, and assess the performance of your annotators and reviewers.

## View agreement

You can view agreement in the following ways:
- **Data Manager** - Displays per-task agreements and inter-annotator agreement for each task. See [Agreement columns in the Data Manager](manage_data#Agreement-columns). 
- **Members Dashboard** - Displays an inter-annotator agreement matrix and agreement distribution. See [Members dashboard](dashboard_members). 

!!! note
    All agreement scores displayed in the Members Dashboard are calculated using the **Pairwise** methodology.

## Overall vs per-control-tag agreement

Agreement is calculated at two levels: 

* Per-control-tag agreement
* Overall agreement

![Screenshot](/images/review/agreement-annotated.png)


### Per-control-tag agreement

Control tags are the tags that you use to annotate your data. Object tags are the tags that you use to identify the data to be annotated, such as `Image`, `Text`, and `Audio`.

For example, if your labeling configuration involves annotating an image with `RectangleLabels`, `Choices`, and `Rating`, then you would have three control tags.

Agreement is calculated for each control tag separately, and you can configure the metric used to calculate agreement for each control tag. See [Built-in agreement metrics reference](agreement_metrics).

In the Data Manager, you can see an agreement score for each control tag separately. This lets you see which parts of the task have higher or lower agreement (e.g., good agreement on bounding boxes but low agreement on a choice field).

### Overall agreement

Label Studio aggregates per-control-tag scores into a single task-level score. 

By default, this is calculated as the mean of all control-tag scores. This is what appears in the main **Agreement** column when you do not filter by control tag.

You can customize how overall agreement is calculated by setting the **weight** of different control tags when calculating agreement. This ensures that a critical control tag is has more bearing on the overall agreement score than a less important control tag.

## Categorical vs. non-categorical control tags

The way agreement is calculated differs meaningfully depending on whether the control tag is *categorical* or *non-categorical* (also known as *discrete* and *continuous* respectively). 

This distinction affects extraction, comparison metrics, and how scoring works.

### Categorical control tags

Categorical control tags produce discrete, finite values. An annotator picks from a defined set of options. 

Examples include:

- **Choices** (e.g., "Small", "Medium", "Large")
- **Rating** (e.g., 1-5 stars)

Since categorical values are discrete, the typical metric is **Exact Match** -- the two values either match (score = `1.0`) or they don't (score = `0.0`). 

However, tags such as **Rating** or **Number** can also use **Numeric Difference with Threshold**, where you define how much numeric deviation is tolerable (e.g., a threshold of `0` means only identical ratings count as a match).

Categorical comparisons inherently produce binary scores (`0` or `1`). This means they work with both agreement methodologies:

- [**Pairwise Average**](#Pairwise): Average all the 0s and 1s across annotator pairs. 
- [**Consensus**](#Consensus): Because the scores are already binary, no threshold conversion is needed. The consensus method naturally reflects majority agreement. 

See [Categorical examples](#Categorical-examples) for an example of how agreement is calculated for categorical control tags.
    
### Non-categorical control tags

Non-categorical control tags produce spatial, geometric, or structural data. Annotators draw regions, highlight spans, or position elements. 

For example:

- **RectangleLabels** (bounding boxes around objects)
- **Labels** (text spans / NER annotations)
- **PolygonLabels**, **EllipseLabels**, **KeyPointLabels**, etc.

Because two annotators rarely draw identical regions, the system uses continuous similarity metrics that measure degree of overlap. For example:

- **IoU (Intersection over Union)** for bounding boxes and polygons. Returns a float between `0.0` (no overlap) and `1.0` (perfect overlap)
- **Span Overlap** for text spans -- measures how much two highlighted text regions overlap

See [Non-categorical examples](#Non-categorical-examples) for an example of how agreement is calculated for non-categorical control tags.


##### Summary of differences

| Aspect | Categorical Tags | Non-Categorical Tags |
|---|---|---|
| **Output type** | Discrete values (labels, ratings) | Spatial/structural data (boxes, spans) |
| **Typical metrics** | Exact Match, Numeric Difference | IoU, Span Overlap |
| **Score type** | Binary (`0` or `1`) | Continuous (`0.0` to `1.0`) |
| **Pairwise** | Works directly; averages binary scores | Works directly; averages continuous scores |
| **Consensus** | Works directly; no threshold needed | Requires a user-defined threshold to binarize scores first |


## Methodology 

You can configure the methodology to use for each project under **Settings > Quality > Agreement** section.

<img src="/images/review/agreement-methodology.png" class="gif-border" style="max-width:600px">

You have the following methodologies to choose from:

* **Consensus**: Consensus measures *"What percentage of annotators chose the most common answer?"*
* **Pairwise**: Pairwise measures *"What is the average agreement score across all pairs of annotators?"*

!!! info Tip
    You can switch between methodologies at any time.

### Consensus

Agreement is computed across all annotators at once, measuring how much they converge to a common answer. The result aligns with “How many annotators agree?”

Consensus measures operates on binary scores -- each pair of annotators either matches (`1`) or does not match (`0`). 

* For categorical tags like **Choices** or **Rating**, this binary outcome happens naturally: two annotators either selected the same value or they didn't. 

* For non-categorical tags like bounding boxes or text spans, the raw comparison produces a continuous score (e.g., IoU of 0.82), so a user-defined threshold is applied to convert it into a binary decision -- at or above the threshold counts as a match (`1`), below it does not (`0`). 

Once annotations have been reduced to a `1` or `0`, consensus calculates how much the group converges overall, giving proportional credit for majority agreement. 

This is why, in a group of three annotators where two agree and one disagrees, consensus returns `66%` rather than the `33%` you'd get from pairwise -- it recognizes that most of the group reached the same answer.

![Screenshot](/images/review/consensus-agreement.png)

!!! note 
    **Consensus and continuous/non-categorical metrics**: Consensus uses binary match/no-match. For continuous metrics (e.g., IoU), you must set a threshold in the control tag’s metric parameters; scores above the threshold count as a match, below as no match. 

### Pairwise

As the name "Pairwise" indicates, Pairwise looks at agreement between every unique *pair* of annotators, and then averages that agreement. 

Pairwise measures agreement by comparing every unique pair of annotators independently, calculating a score for each pair, and then averaging all those scores together. 

For categorical tags, each pair produces a binary result: a match scores `1` and a mismatch scores `0`. The average of these binary values becomes the overall agreement. 

For non-categorical tags like bounding boxes, each pair produces a continuous score (e.g., an IoU of `0.82`), and these raw scores are averaged directly without any threshold conversion. 

This means Pairwise preserves the full granularity of non-categorical comparisons, rewarding partial overlap rather than reducing it to all-or-nothing. 

<div style="text-align:center"><img alt="Diagram showing annotations are collected for each task, agreement scores are computed for each pair, the resulting scores are averaged for a task." src="/images/stats-no_grouping.png"/></div>

### Consensus vs. Pairwise at a glance

| | **Pairwise** | **Consensus** |
|---|---|---|
| **How it works** | Compares every unique pair of annotators, scores each pair, and averages all pair scores | Measures how much the full group converges toward a common answer using binary match/no match |
| **Score type used** | Uses raw scores directly (binary for categorical, continuous for non-categorical) | Always requires binary scores (match or no match) |
| **Threshold needed?** | No -- works with raw scores as-is | Only for non-categorical tags; categorical tags are already binary |
| **Partial credit** | Yes -- a bounding box overlap of 0.6 contributes 0.6 to the average | No -- overlap is either above the threshold (match) or below it (no match) |
| **Sensitivity to outliers** | High -- one disagreeing annotator creates multiple low-scoring pairs, pulling the average down | Low -- one disagreeing annotator is outvoted by the majority |
| **3 annotators, 2 agree (categorical)** | 33% (only 1 of 3 pairs match) | 66% (majority agreement recognized) |
| **3 annotators, all agree** | 100% | 100% |
| **3 annotators, none agree** | 0% | 0% |
| **Best suited for** | Projects with 2 annotators per task, or when you want granular continuous scores | Projects with 3+ annotators per task, or when majority agreement matters most |

#### When to select Pairwise vs. Consensus

In extremely simple terms:

* Pairwise is best if you're more focused on your annotators. 
* Consensus is best if you're more focused on whether the majority of annotators agree on a particular answer.

##### Pairwise 

**Pairwise** tells you how much annotators agree with each other overall. 

* Best for when you care about assessing your annotators, want to understand inconsistencies/fragmentation in the annotation pool, and find ambiguity in your tasks and/or instructions.

* Can be more sensitive to outliers which could be desired (a single disagreeing annotator can significantly lower the score)

* Pairwise does not require you to define thresholds for non-categorical control tags (e.g. `RectangleLabels` and `TextArea`), and so might be simpler to set up in those cases.  

##### Consensus

**Consensus** tells you how strongly the task converged on one answer.

* Better reflects majority agreement and is more intuitive for most users.

* More robust to outliers (a single disagreeing annotator has less impact).

* The Consensus measurement is a good proxy for label stability and task convergence.

* Requires thresholds for non-categorical control tags (e.g. bounding boxes and text spans). Thresholds are how you define what "close enough" means. See [Non-categorical examples](#Non-categorical-examples) for an of consensus calculation with a threshold.


### Examples

#### Categorical examples 

[Categorical control tags](#Categorical-control-tags) are control tags that have a fixed set of choices. For example, a control tag that has the choices "Cat", "Dog", "Bird".

<div class="code-tabs">
  <div data-name="Pairwise">

Say you have 3 annotators select between 3 different choices: "A", "B", "C".

If all three annotators select a different choice, Pairwise is `0`:

* Annotator 1 is compared with Annotator 2 (no match = `0`)
* Annotator 1 is compared with Annotator 3 (no match = `0`)
* Annotator 2 is compared with Annotator 3 (no match = `0`)

`(0 + 0 + 0)/3 = 0`

If Annotator 2 were to change their choice to agree with Annotator 1, the agreement would change to `33.33%`:

* Annotator 1 is compared with Annotator 2 (match = `100`)
* Annotator 1 is compared with Annotator 3 (no match = `0`)
* Annotator 2 is compared with Annotator 3 (no match = `0`) 

`(100 + 0 + 0)/3 = 33.33 `
</div>

<div data-name="Consensus">

Say you have 3 annotators select between 3 different choices: "A", "B", "C".

If all three annotators select a different choice, Consensus is `33.33%`:

* Annotator 1 chose "A"
* Annotator 2 chose "B"
* Annotator 3 chose "C"

In Consensus, we are looking at the most common answer. In this case, `A`, `B`, and `C` were each chosen once, and are therefore equally common. 

So 1 out of 3 annotators chose the most common answer (`1/3 = 33.33`). 

* It does not matter what the value of their choice was, just that there are 3 choices and no overlapping choice between annotators. 
* In this case, any one of the choices becomes the "most common answer" as they are all equally common (all were selected once). 
    
If Annotator 2 were to change their choice to agree with Annotator 1, the agreement would increase to `66.67%`:

* Annotator 1 chose "A"
* Annotator 2 chose "A"
* Annotator 3 chose "C"

In this case, `A` was chosen twice and `C` was chosen once. 

So 2 out of 3 annotators chose the most common answer (`2/3 = 66.67`). 

</div>
</div>

#### Non-categorical examples

[Non-categorical control tags](#Non-categorical-control-tags) are control tags have continuous values that are not as simple to quantify as "match" or "no match". For example, **RectangleLabels**, **PolygonLabels**, **Labels**, **TextArea**.


<div class="code-tabs">
  <div data-name="Pairwise">

Say you have 3 annotators drawing boxes using **RectangleLabels**. You are using the **Intersection over Union (IoU)** metric to calculate agreement. 

If all three annotators draw their boxes in completely different areas of the image with no overlap, Pairwise is `0`:

* Annotator 1 is compared with Annotator 2 (no overlap, IoU = `0`)
* Annotator 1 is compared with Annotator 3 (no overlap, IoU = `0`)
* Annotator 2 is compared with Annotator 3 (no overlap, IoU = `0`)

`(0 + 0 + 0) / 3 = 0`

Now the annotators adjust their boxes so that there is some overlap between them. In this case, the agreement is `72%`:

- Annotators 1 vs Annotator 2 (IoU = `.74`)
- Annotators 1 vs Annotator 3 (IoU = `.90`)
- Annotators 2 vs Annotator 3 (IoU = `.52`)

`(.74 + .90 + .52) / 3 = 72%`

</div>

<div data-name="Consensus">

Say you have 3 annotators drawing boxes using **RectangleLabels**. 

However, Consensus requires binary (`0` or `1`) scores. So this time, you are using the **Intersection over Union (IoU) (Threshold)** metric to calculate agreement. 

This is the same as the **Intersection over Union** metric used in the Pairwise example, but with a threshold applied. A threshold is necessary to determine what is considered a match (`1`) and what is not a match (`0`). 

Let's say you set the threshold to `65%`: any pair with IoU >= 0.65 counts as a match (`1`), and anything below is not a match (`0`).

You have the following raw IoU scores:

- Annotators 1 vs Annotator 2 (IoU = `.74`)
- Annotators 1 vs Annotator 3 (IoU = `.90`)
- Annotators 2 vs Annotator 3 (IoU = `.52`)

**Step 1 – Binarize using the threshold (65%):**

- Annotators 1 vs Annotator 2: `.74` >= `.65` → match = 1
- Annotators 1 vs Annotator 3: `.90` >= `.65` → match = 1
- Annotators 2 vs Annotator 3: `.52` <= `.65` → no match = 0

**Step 2 – Calculate consensus:**

You have two matches out of three pairs. So the consensus score is `66.67%` 

(`2/3 = 66.67`).


**How the threshold changes the result:**

The threshold you choose directly affects the consensus score. Using the same raw IoU values:

| Threshold | Pair 1-2 (`.74`) | Pair 1-3 (`.90`) | Pair 2-3 (`.52`) | Consensus |
|---|---|---|---|---|
| **50%** | match | match | match | **100%** (all agree) |
| **75%** | no match | match | no match | **33%** (1 of 3 agree) |
| **95%** | no match | no match | no match | **0%** (none agree) |

At a lenient 50% threshold, all three boxes overlap "enough" and consensus is perfect. At a strict 95% threshold, no pair is close enough and consensus drops to zero. 

This is why choosing the right threshold is critical for non-categorical consensus -- it determines where you draw the line between "these annotations agree" and "these annotations disagree."

  </div>
</div>


## Other agreement settings

With methodology selected, you can configure other settings for agreement under **Settings > Quality > Agreement**

### Built-in vs custom metrics

Under **Built-in Metrics vs Custom**, you can select whether you want to customize your own agreement metrics or use the built-in metrics.

* **Built-In Agreement Metrics** - If you select **Built-in metrics**, you will see the built-in metrics listed in the [built-in metrics reference](agreement_metrics).

* **Custom Agreement Metrics** - If you select **Custom metrics**, you will be able to create your own custom metrics for agreement by writing code in the text box. See [Add a custom agreement metric to Label Studio](custom_metric). 

### Configure weight for the overall agreement  

Overall agreement is the average of all control tag agreement scores. It is displayed in the main **Agreement** column in the Data Manager.

Under **Settings > Quality > Agreement > Overall Agreement**, you can customize how overall agreement is calculated by setting the **weight** of different control tags when calculating agreement. 

This ensures that a critical control tag has more bearing on the overall agreement score than a less important control tag.

<img src="/images/review/agreement-overall.png" class="gif-border" style="max-width:600px">

For example, if you have a project with the following control tags and weights:
- RectangleLabels: 1.0
- Choices: 0.3
- Rating: 0.2

And the following per-control-tag agreement scores for a task:
- RectangleLabels: 83%
- Choices: 33%
- Rating: 33%

Then the overall agreement is calculated as:

`(1.0 * 83% + 0.3 * 33% + 0.2 * 33%) / (1.0 + 0.3 + 0.2) = 60.67%`


### Configure agreement for each control tag

Under **Settings > Quality > Agreement > Agreement Columns**, you can customize how agreement is calculated for each control tag. 

<img src="/images/review/agreement-column-settings.png" class="gif-border" style="max-width:600px">

Your options depend on the agreement methodology you have selected and what type of control tag you are configuring. 

For information on the different metrics available for each control tag, see the [built-in metrics reference](agreement_metrics).

!!! info "Tip"
    For IoU-based control tags, you can set a threshold to determine what is considered a match. Click **Try it** to open a preview window to see how the threshold affects the agreement score. 

    <img src="/images/review/agreement-iou.png" class="gif-border" style="max-width:600px">








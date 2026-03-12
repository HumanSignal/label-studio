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

## Dimensions and agreement metrics

Agreement is built on dimensions. 

A dimension is one aspect of annotations that you want to measure for agreement. Dimensions directly map to control tags in your labeling interface (those tags that you use to annotate your data). 

For example, if your labeling configuration involves annotating an image with `RectangleLabels`, `Choices`, and `Rating`, then you will have three dimensions - one for each control tag. 

Because you would not measure `RectangleLabels` the same way you would measure `Choices`, each dimension has its own metric (either a pre-defined metric that you select or a custom metric that your write). ADDDDD LIIIINNNN

### Per-dimension and overall agreement

You can explore task agreement at two levels: overall agreement and per-dimension agreement. 

- **Per-dimension scores** — You see an agreement score for each dimension (each control tag) separately. This lets you see which parts of the task have higher or lower agreement (e.g., good agreement on bounding boxes but low agreement on a choice field).

- **Overall task agreement** — Label Studio aggregates per-dimension scores into a single task-level score. By default, this is calculated as the mean of all dimension scores. This is what appears in the main Agreement column when you do not filter by dimension.

You can see both the per-dimension score and the overall agreement score in the Data Manager:

![Screenshot](/images/review/agreement-columns.png)

For more information, see LINnnnnnnnNK. 

## View agreement

You can view task agreement in the following ways:
- **Data Manager** - Displays per-task agreements and inter-annotator agreement for each task. See LIIIIIIIIIINK. 
- **Members Dashboard** - Displays an inter-annotator agreement matrix and agreement distribution. See [Members dashboard](dashboard_members). 


## Configure agreement

You can configure how agreement is measured under **Settings > Quality > Agreement**. 

### Methodology 

![Screenshot](/images/review/agreement-methodology.png)

Select one of the following:


* **Consensus**: Consensus measures *"What percentage of annotators chose the most common answer?"*
* **Pairwise**: Pairwise measures *"What is the average agreement score across all pairs of annotators?"*

!!! info Tip
    You can switch between methodologies at any time; both pairwise and consensus scores are stored.

#### Consensus

Agreement is computed across all annotators at once, measuring how much they converge to a common answer. The result aligns with “How many annotators agree?”

NEED A DIAGRAM HERE LIKE THE ONE BELOW FOR PAIRWISE. 

!!! note 
    **Consensus and continuous metrics**: Consensus uses binary match/no-match. For continuous metrics (e.g., IoU), you must set a threshold in the dimension’s metric parameters; scores above the threshold count as match, below as no match. See LIIIIIIIIINK below. 

##### Example

Say you have 3 annotators select between 3 different choices: "A", "B", "C". 

If all three annotators select a different choice, Consensus is `33.33%`. 

This is because the most common answer was given by 1 of the 3 annotators (`1/3 = 33.33`). 

* It does not matter what the value of their choice was, just that there are 3 choices and no overlapping choice between annotators. 
* In this case, any one of the choices becomes the "most common answer" as they are all equally common (all were selected once). 
    
If two annotators select the same choice, agreement increases to `66.67%`, because 2 out of the 3 annotators (`2/3 = 66.67`) chose the most common choice. 

#### Pairwise

As the name "Pairwise" indicates, Pairwise looks at agreement between every unique *pair* of annotators, and then averages that agreement. 

<div style="text-align:center"><img alt="Diagram showing annotations are collected for each task, agreement scores are computed for each pair, the resulting scores are averaged for a task." src="/images/stats-no_grouping.png"/></div>

##### Example

Say you have 3 annotators select between 3 different choices: "A", "B", "C". 

If all three annotators select a different choice, Pairwise is `0`:

* Annotator 1 is compared with Annotator 2 (no match = `0`)
* Annotator 1 is compared with Annotator 3 (no match = `0`)
* Annotator 2 is compared with Annotator 3 (no match = `0`)

`(0 + 0 + 0)/3 = 0`

If Annotator 2 were to change their choice to agree with Annotator 1, the agreement for the Choices dimension would change to `33.33%`:

* Annotator 1 is compared with Annotator 2 (match = `100`)
* Annotator 1 is compared with Annotator 3 (no match = `0`)
* Annotator 2 is compared with Annotator 3 (no match = `0`) 

`(100 + 0 + 0)/3 = 33.33 `


#### When to select Pairwise vs. Consensus

In extremely simple terms, Pairwise is best if you're more focused on your annotators. Consensus is best if you're more focused on the final labeled data.

##### Pairwise 

**Pairwise** tells you how much annotators agree with each other overall. 

* Best for when you care about assessing your annotators, want to understand inconsistencies/fragmentation in the annotation pool, and find ambiguity in your tasks and/or instructions.

* This is a  a stricter metric and better highlights when there is disagreement amongst your annotators.

* Pairwise does not require you to define thresholds for non-categorical dimensions (e.g. bounding boxes and text spans), and so might be simpler to set up in those cases.  


Pairwise might be particularly useful for teams where annotators are direct reports or contractors and you are responsible for your annotator's performance. 

##### Consensus

**Consensus** tells you how strongly the task converged on one answer.

* Best for when you care more about arriving at the "final answer" and getting your data labeled. 

* The Consensus measurement is a good proxy for label stability and task convergence.

* Requires thresholds for non-categorical dimensions (e.g. bounding boxes and text spans). Thresholds are how you define what "close enough" means. As such, Consensus is only intuitive if you define what thresholds well. 

Consensus may be more useful for teams more focused on data quality than annotator performance. 

### Built-in vs custom metrics

Here you can select whether you want to customize your own metrics for agreement or use the built-in metrics.

* **Built-In Agreement Metrics** - If you select **Built-in metrics**, you will see the built-in metrics listed in the [built-in metrics reference](agreement_metrics).

* **Custom Agreement Metrics** - If you select **Custom metrics**, you will be able to create your own custom metrics for agreement by writing code in the text box. See [Add a custom agreement metric to Label Studio](custom_metric). 


### Overall agreement

![Screenshot](/images/review/agreement-overall.png)

Overall agreement is the average of all per-dimension agreement scores. It is displayed in the main **Agreement** column in the Data Manager.

You can customize how overall agreement is calculated by setting the **weight** of different dimensions when calculating agreement. This ensures that a critical dimension is has more bearing on the overall agreement score than a less important dimension.

For example, if you have a project with the following dimensions and weights:
- RectangleLabels: 1.0
- Choices: 0.3
- Rating: 0.2

And the following per-dimension agreement scores for a task:
- RectangleLabels: 83%
- Choices: 33%
- Rating: 33%

Then the overall agreement is calculated as:

`(1.0 * 83% + 0.3 * 33% + 0.2 * 33%) / (1.0 + 0.3 + 0.2) = 60.67%`


### Agreement columns

This is where you customize how agreement is calculated for each dimension. 

Your options depend on the agreement methodology you have selected and what type of dimension you are configuring. 

!!! info "Tip"
    For IoU-based dimensions, you can set a threshold to determine what is considered a match. Click **Try it** to open a preview window to see how the threshold affects the agreement score. 

For information on the different metrics available for each dimension, see the [built-in metrics reference](agreement_metrics).






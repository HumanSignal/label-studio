---
title: Built-in agreement metrics reference
short: Built-in metrics
tier: enterprise
type: guide
order: 0
order_enterprise: 308
meta_title: Built-in agreement metrics in Label Studio Enterprise
meta_description: Built-in agreement metrics in Label Studio Enterprise.
section: "Review & Measure Quality"
parent: "stats"
parent_enterprise: "stats"
---

The following metrics are available out-of-the-box in Label Studio Enterprise. You can use them as is, or you can create your own [custom metrics](custom_metric).

## Categorical/discrete dimensions

A categorical/discrete dimension is a dimension that has a fixed set of choices. For example, a dimension that has the choices "Cat", "Dog", "Bird".

| Display Name | Default For | Methodologies |
|-------------|-------------|---------------|
| **Exact Match** | `Choices`, `Taxonomy`, `Pairwise`, `DateTime`, `EllipseLabels`, `BitmaskLabels`, `BrushLabels`, and their per-region variants | Pairwise + Consensus |
| **Taxonomy Path Matching** | — | Pairwise only |
| **Taxonomy Path Matching (Threshold)** | — | Pairwise + Consensus |
| **Taxonomy Subtree Matching** | — | Pairwise only |
| **Taxonomy IOU (Threshold)** | — | Pairwise + Consensus |

!!! note
    **Taxonomy Path Matching** computes partial credit along taxonomy paths.

    **Taxonomy IOU (Threshold)** computes IoU over the subtree of selected taxonomy nodes.

## Numeric dimensions


| Display Name | Default For | Methodologies |
|-------------|-------------|---------------|
| **Numeric Difference** | `Number`, `Rating` | Pairwise only |
| **Numeric Difference (Threshold)** | — | Pairwise + Consensus |

## Bounding box (rectangle) dimensions


| Display Name | Default For | Methodologies |
|-------------|-------------|---------------|
| **Intersection over Union** | `RectangleLabels`, `Rectangle` | Pairwise only |
| **Intersection over Union (Threshold)** | — | Pairwise + Consensus |
| **Bounding Box Labels Similarity** | `Choices` (per RectangleLabels), `Choices` (per Rectangle) | Pairwise only |
| **Bounding Box Labels Similarity (Threshold)** | — | Pairwise + Consensus |
| **Bounding Box Text Similarity** | `TextArea` (per RectangleLabels), `TextArea` (per Rectangle) | Pairwise only |
| **Bounding Box Text Similarity (Threshold)** | — | Pairwise + Consensus |

!!! note
    **Bounding Box Labels Similarity** combines bounding box overlap (IoU) with Jaccard similarity over the assigned labels.
    **Bounding Box Text Similarity** combines bounding box overlap (IoU) with text similarity over transcribed text.


## Polygon dimensions

| Display Name | Default For | Methodologies |
|-------------|-------------|---------------|
| **Polygon IoU** | `PolygonLabels`, `Polygon` | Pairwise only |
| **Polygon IoU (Threshold)** | — | Pairwise + Consensus |
| **Polygon Labels Similarity** | `Choices` (per PolygonLabels), `Choices` (per Polygon) | Pairwise only |
| **Polygon Labels Similarity (Threshold)** | — | Pairwise + Consensus |
| **Polygon Text Similarity** | `TextArea` (per PolygonLabels), `TextArea` (per Polygon) | Pairwise only |
| **Polygon Text Similarity (Threshold)** | — | Pairwise + Consensus |


## Span/segment dimensions

A span/segment dimension is a dimension that has a variable set of choices.  These are typically used for labeling text spans, time series, or paragraphs.

| Display Name | Default For | Methodologies |
|-------------|-------------|---------------|
| **Overlap** | `Labels`, `ParagraphLabels`, `TimeSeriesLabels`, `TimelineLabels` | Pairwise only |
| **Overlap (Threshold)** | — | Pairwise + Consensus |
| **Span Labels Similarity** | `Choices` (per Labels) | Pairwise only |
| **Span Labels Similarity (Threshold)** | — | Pairwise + Consensus |
| **Span Text Similarity** | `TextArea` (per Labels) | Pairwise only |
| **Span Text Similarity (Threshold)** | — | Pairwise + Consensus |
| **Timeline Event Matching** | — | Pairwise + Consensus |

!!! note
    `UNORDERED_NAIVE` compares `TimelineLabels` spans without regard to order.

## HTML spans (hypertext) dimensions

| Display Name | Default For | Methodologies |
|-------------|-------------|---------------|
| **Overlap over HTML Spans** | `HyperTextLabels` | Pairwise only |
| **Overlap over HTML Spans (Threshold)** | — | Pairwise + Consensus |
| **HTML Span Labels Similarity** | `Choices` (per HyperTextLabels) | Pairwise only |
| **HTML Span Labels Similarity (Threshold)** | — | Pairwise + Consensus |
| **HTML Span Text Similarity** | `TextArea` (per HyperTextLabels) | Pairwise only |
| **HTML Span Text Similarity (Threshold)** | — | Pairwise + Consensus |

## Text dimensions

| Display Name | Default For | Methodologies |
|-------------|-------------|---------------|
| **Text Similarity** | `TextArea` | Pairwise only |
| **Text Similarity (Threshold)** | — | Pairwise + Consensus |
| **Semantic Similarity** | — | Pairwise + Consensus |

!!! note
    **Text Similarity** uses surface-level string similarity (e.g. edit distance / n-gram).
    **Semantic Similarity** uses embedding-based semantic similarity; applicable to any user-defined dimension.

## Video/landmarks dimensions

| Display Name | Default For | Methodologies |
|-------------|-------------|---------------|
| **Exact Frame Matching** | `VideoRectangle` | Pairwise only |
| **Exact Frame Matching (Threshold)** | — | Pairwise + Consensus |
| **Object Tracking** | — | Pairwise + Consensus |
| **Keypoint Distance** | — | Pairwise + Consensus |

!!! note
    **Object Tracking** and **Keypoint Distance** have no predefined control tag associations and are intended for user-defined dimensions.



## Control tag default metric reference

| Control Tag | Category | Default Metric |
|-------------|----------|----------------|
| **Choices** | categorical | **Exact Match** |
| **Taxonomy** | categorical | **Exact Match** |
| **Pairwise** | categorical | **Exact Match** |
| **DateTime** | datetime | **Exact Match** |
| **Number** | numeric | **Numeric Difference** |
| **Rating** | numeric | **Numeric Difference** |
| **RectangleLabels** | vision | **Intersection over Union** |
| **Rectangle** | vision | **Intersection over Union** |
| **PolygonLabels** | vision | **Polygon IoU** |
| **Polygon** | vision | **Polygon IoU** |
| **EllipseLabels** | vision | **Exact Match** |
| **BitmaskLabels** | vision | **Exact Match** |
| **BrushLabels** | vision | **Exact Match** |
| **Choices (per RectangleLabels)** | vision | **Bounding Box Labels Similarity** |
| **Choices (per Rectangle)** | vision | **Bounding Box Labels Similarity** |
| **Choices (per PolygonLabels)** | vision | **Polygon Labels Similarity** |
| **Choices (per Polygon)** | vision | **Polygon Labels Similarity** |
| **Choices (per EllipseLabels)** | vision | **Exact Match** |
| **Choices (per BitmaskLabels)** | vision | **Exact Match** |
| **Choices (per BrushLabels)** | vision | **Exact Match** |
| **TextArea (per RectangleLabels)** | vision | **Bounding Box Text Similarity** |
| **TextArea (per Rectangle)** | vision | **Bounding Box Text Similarity** |
| **TextArea (per PolygonLabels)** | vision | **Polygon Text Similarity** |
| **TextArea (per Polygon)** | vision | **Polygon Text Similarity** |
| **TextArea (per EllipseLabels)** | vision | **Exact Match** |
| **TextArea (per BitmaskLabels)** | vision | **Exact Match** |
| **TextArea (per BrushLabels)** | vision | **Exact Match** |
| **KeypointLabels** | vision_landmarks | **Exact Match*** |
| **VectorLabels** | vision_landmarks | **Exact Match*** |
| **Labels** | segment | **Overlap** |
| **ParagraphLabels** | segment | **Overlap** |
| **TimeSeriesLabels** | segment | **Overlap** |
| **TimelineLabels** | segment | **Overlap** |
| **HyperTextLabels** | segment | **Overlap over HTML Spans** |
| **TextArea** | text | **Text Similarity** |
| **VideoRectangle** | video_tracking | **Exact Frame Matching** |

!!! note
    No explicit default set; **Exact Match** is the only registered metric for these tags.



## Metric examples

**Exact match**  
For choices, ratings, or other discrete values: two annotations either match (1) or do not (0). For multiple choices, partial agreement can be averaged (e.g., two of three choices match → 2/3).

**IoU (Intersection over Union)**  
Used for regions (bounding boxes, polygons, brush masks). For each pair of regions with the same label, IoU = intersection area ÷ union area (0–1). The metric can return raw IoU or, with a threshold, the fraction of region pairs above that IoU.

**Overlap**  
Used for spans (text, paragraphs, time series, HTML). Compares overlap of spans (and optionally labels or text) between annotations. Threshold variants binarize the overlap score for consensus.

**Numeric difference**  
For Number or Rating: compares the numeric values (e.g., difference, or whether the difference is within a threshold). The threshold variant is used for consensus.

**Consensus and thresholds**  
When using **Consensus** methodology with a continuous metric (e.g., IoU), you must pick the metric’s **threshold** variant and set the threshold (e.g., 0.75). Pairs with raw score ≥ threshold count as agreement (1), others as no agreement (0), so consensus can be computed.
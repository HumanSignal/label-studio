---
title: Built-in agreement metrics reference
short: Built-in metrics
tier: enterprise
type: guide
order: 0
order_enterprise: 309
meta_title: Built-in agreement metrics in Label Studio Enterprise
meta_description: Built-in agreement metrics in Label Studio Enterprise.
section: "Review & Measure Quality"
parent: "stats"
parent_enterprise: "stats"
---

The following metrics are available for control tags out-of-the-box in Label Studio Enterprise. You can use them as is, or you can create your own [custom metrics](custom_metric).

## All control tags

| Metric | Description | Tags | Methodology |
|--------|-------------|------|-------------|
| **Exact Match** | Evaluates whether annotation results exactly match, with optional label weights | All tags | Pairwise, Consensus |


## Choices and taxonomy

Categorical metrics are used for categorical control tags, such as `Choices` and `Taxonomy`.

| Metric | Description | Tags | Methodology |
|--------|-------------|------|-------------|
| **Common Labels Matches** | Evaluates common label matches for a taxonomy of labels assigned to regions. Computes partial credit along taxonomy paths. | Taxonomy | Pairwise |
| **Common Labels Matches (Threshold)** | Evaluates common label matches for a taxonomy of labels, returns binarized match based on threshold | Taxonomy | Pairwise, Consensus |
| **Common Subtree Matches** | Evaluates common subtree matches for a taxonomy of choices. Computes IoU over the subtree of selected taxonomy nodes. | Taxonomy | Pairwise |
| **Common Subtree Matches (Threshold)** | Evaluates common subtree matches for a taxonomy of choices, returns binarized match based on threshold | Taxonomy | Pairwise, Consensus |
| **Jaccard Similarity** | Evaluates common label matches using set intersection divided by set union | Choices (multi-select) | Pairwise |
| **Jaccard Similarity (Threshold)** | Evaluates common label matches, returns binary match based on threshold | Choices (multi-select) | Pairwise, Consensus |

## Numeric

| Metric | Description | Tags | Methodology |
|--------|-------------|------|-------------|
| **Numeric Difference** | Evaluates how similar two numeric values are based on their absolute difference | Number<br/><br/>Rating | Pairwise |
| **Numeric Difference (Threshold)** | Evaluates whether two numeric values match within a specified tolerance | Number<br/><br/>Rating | Pairwise, Consensus |

## Rectangles

| Metric | Description | Tags | Methodology |
|--------|-------------|------|-------------|
| **Intersection over Union** | Evaluates overlap between bounding box regions, returns raw IoU score | RectangleLabels<br/><br/>Rectangle | Pairwise |
| **Intersection over Union (Threshold)** | Evaluates overlap between bounding box regions, returns binarized match based on threshold | RectangleLabels<br/><br/>Rectangle | Pairwise, Consensus |
| **Bounding Box Labels Similarity** | Evaluates bbox overlap with Jaccard similarity for label matching, returns raw Jaccard score | Choices*  | Pairwise |
| **Bounding Box Labels Similarity (Threshold)** | Evaluates bbox overlap with Jaccard similarity for label matching, returns binary match based on threshold | Choices* | Pairwise, Consensus |
| **Bounding Box Text Similarity** | Evaluates bounding box overlap with text similarity for text matching, returns raw similarity score | TextArea* | Pairwise |
| **Bounding Box Text Similarity (Threshold)** | Evaluates bounding box overlap with text similarity for text matching, returns binary match based on threshold | TextArea* | Pairwise, Consensus |

\* Nested Choices or TextArea tags inside RectangleLabels/Rectangle tags

## Polygons

| Metric | Description | Tags | Methodology |
|--------|-------------|------|-------------|
| **Intersection over Union for Polygons** | Evaluates overlap between polygon regions, returns raw IoU score | PolygonLabels<br/><br/>Polygon | Pairwise |
| **Intersection over Union for Polygons (Threshold)** | Evaluates overlap between polygon regions, returns binarized match based on threshold | PolygonLabels<br/><br/>Polygon | Pairwise, Consensus |
| **Polygon Labels Similarity** | Evaluates polygon overlap with Jaccard similarity for label matching, returns raw Jaccard score | Choices* | Pairwise |
| **Polygon Labels Similarity (Threshold)** | Evaluates polygon overlap with Jaccard similarity for label matching, returns binary match based on threshold | Choices* | Pairwise, Consensus |
| **Polygon Text Similarity** | Evaluates polygon overlap with text similarity for text matching, returns raw similarity score | TextArea* | Pairwise |
| **Polygon Text Similarity (Threshold)** | Evaluates polygon overlap with text similarity for text matching, returns binary match based on threshold | TextArea* | Pairwise, Consensus |

\* Nested Choices or TextArea tags inside PolygonLabels/Polygon tags

## Brush

| Metric | Description | Tags | Methodology |
|--------|-------------|------|-------------|
| **Brush Intersection over Union** | Evaluates pixel overlap between brush mask regions, returns raw IoU score | BrushLabels<br/><br/>Brush | Pairwise |
| **Brush Intersection over Union (Threshold)** | Evaluates pixel overlap between brush mask regions, returns binarized match based on threshold | BrushLabels<br/><br/>Brush | Pairwise, Consensus |

## Span and segment

| Metric | Description | Tags | Methodology |
|--------|-------------|------|-------------|
| **Span Overlap** | Evaluates overlap between one-dimensional labeled regions, returns raw IoU score | Labels<br/><br/>ParagraphLabels<br/><br/>TimeSeriesLabels<br/><br/>TimelineLabels | Pairwise |
| **Span Overlap (Threshold)** | Evaluates overlap between labeled regions, returns binarized match based on threshold | Labels<br/><br/>ParagraphLabels<br/><br/>TimeSeriesLabels<br/><br/>TimelineLabels | Pairwise, Consensus |
| **Span Labels Similarity** | Evaluates span overlap with Jaccard similarity for label matching, returns raw Jaccard score | Choices* | Pairwise |
| **Span Labels Similarity (Threshold)** | Evaluates span overlap with Jaccard similarity, returns binary match based on threshold | Choices* | Pairwise, Consensus |
| **Span Text Similarity** | Evaluates span overlap with text edit distance, returns raw similarity score | TextArea* | Pairwise |
| **Span Text Similarity (Threshold)** | Evaluates span overlap with text similarity, returns binary match based on threshold | TextArea* | Pairwise, Consensus |
| **Unordered Naive Comparison for Timeline Labels** | Compares timeline label annotations without regard to label order | TimelineLabels | Pairwise, Consensus |

\* Nested Choices or TextArea tags inside Labels tags

## HTML spans

| Metric | Description | Tags | Methodology |
|--------|-------------|------|-------------|
| **Overlap over HTML Spans** | Evaluates whether two given hypertext spans have points in common | HyperTextLabels | Pairwise |
| **Overlap over HTML Spans (Threshold)** | Evaluates HTML span overlap, returns binarized match based on threshold | HyperTextLabels | Pairwise, Consensus |
| **HTML Span Labels Similarity** | Evaluates HTML span overlap with Jaccard similarity for label matching, returns raw Jaccard score | Choices* | Pairwise |
| **HTML Span Labels Similarity (Threshold)** | Evaluates HTML span overlap with Jaccard similarity, returns binary match based on threshold | Choices* | Pairwise, Consensus |
| **HTML Span Text Similarity** | Evaluates HTML span overlap with text edit distance, returns raw similarity score | TextArea* | Pairwise |
| **HTML Span Text Similarity (Threshold)** | Evaluates HTML span overlap with text similarity, returns binary match based on threshold | TextArea* | Pairwise, Consensus |

\* Nested Choices or TextArea tags inside HyperTextLabels tags

## Text

| Metric | Description | Tags | Methodology |
|--------|-------------|------|-------------|
| **Text Similarity** | Uses the edit distance algorithm to calculate how similar two text annotations are to one another | TextArea | Pairwise |
| **Text Similarity (Threshold)** | Uses the edit distance algorithm to determine if two text annotations match based on a similarity threshold | TextArea | Pairwise, Consensus |
| **Semantic Similarity** | Evaluates text similarity by comparing semantic meaning using embeddings | User-defined | Pairwise, Consensus |

## Video 

| Metric | Description | Tags | Methodology |
|--------|-------------|------|-------------|
| **Exact Frames Matching for Video** | Evaluates video annotations by comparing exact frame matches | VideoRectangle | Pairwise |
| **Exact Frames Matching for Video (Threshold)** | Evaluates video annotations by comparing exact frame matches, returns binarized match based on threshold | VideoRectangle | Pairwise, Consensus |
| **Video Tracking** | Evaluates video tracking by comparing bounding boxes using IoU score across frames | User-defined | Pairwise, Consensus |

## Keypoints

| Metric | Description | Tags | Methodology |
|--------|-------------|------|-------------|
| **Keypoint Distance** | Evaluates keypoint annotations by checking if corresponding labeled keypoints are within a coordinate distance threshold | KeypointLabels<br/><br/>Keypoint | Pairwise |

## Examples

### Exact Match

Exact Match is the simplest agreement metric. It checks whether two annotators gave the exact same answer, and returns either a perfect score (1.0) or zero (0.0). There is no partial credit.

This is the default metric for `Choices`, `Taxonomy`, `Pairwise`, and `DateTime` tags. It is also available as an alternative metric for many other tag types.

#### What affects the score

| Scenario | Score |
|----------|-------|
| Annotators give the exact same answer | 1.0 |
| Annotators give different answers | 0.0 |
| Neither annotator provides an answer | 1.0 |
| One annotator provides an answer, the other doesn't | 0.0 |

Unlike Span Overlap or IoU, there is no partial credit with Exact Match. The annotators either agree completely or they don't.

#### Single-select classification

When a labeling configuration uses a single-select `Choices` tag (e.g., sentiment analysis), each annotator picks one option. Exact Match compares the two selections directly.

**Example**: A project classifies customer reviews as Positive, Negative, or Neutral.

| Annotator A | Annotator B | Score |
|-------------|-------------|-------|
| Positive | Positive | **1.0** |
| Positive | Negative | **0.0** |
| Neutral | Neutral | **1.0** |

#### Multi-select classification

When a `Choices` tag allows multiple selections, each annotator's response is a list. Exact Match compares the two lists and requires them to contain the same items in the same order.

**Example**: A project tags articles with topics: Sports, Politics, Technology, Health.

| Annotator A | Annotator B | Score |
|-------------|-------------|-------|
| [Sports, Politics] | [Sports, Politics] | **1.0** |
| [Sports, Politics] | [Politics, Sports] | **0.0** (different order) |
| [Sports, Politics] | [Sports] | **0.0** (different selections) |

!!! note
    If you want partial credit for multi-select classifications (e.g., matching 2 out of 3 selected items), use [Jaccard Similarity](#Jaccard-similarity) instead of Exact Match.

#### Taxonomy

For `Taxonomy` tags, the annotator's selection is a specific path through the taxonomy tree. Exact Match requires the full path to be identical.

**Example**: A project uses a taxonomy to classify animals.

| Annotator A | Annotator B | Score |
|-------------|-------------|-------|
| Animals > Dogs > Labrador | Animals > Dogs > Labrador | **1.0** |
| Animals > Dogs > Labrador | Animals > Dogs > Poodle | **0.0** |
| Animals > Dogs > Labrador | Animals > Dogs | **0.0** |

!!! note
    If you want partial credit for taxonomy paths that share a common prefix, use [Common Labels Matches](#Common-labels-matches) or [Common Subtree Matches](#Common-subtree-matches) instead.

#### DateTime

For `DateTime` tags, Exact Match compares the two date/time values. They must be identical to score 1.0.

| Annotator A | Annotator B | Score |
|-------------|-------------|-------|
| 2025-03-19 | 2025-03-19 | **1.0** |
| 2025-03-19 | 2025-03-20 | **0.0** |

### Span Overlap

Span Overlap measures how much two annotators agree on the position of labeled spans in text (or other one-dimensional data like audio segments or time series). It is the default metric for `Labels`, `ParagraphLabels`, `TimeSeriesLabels`, and `TimelineLabels` tags.

#### What affects the score

| Scenario | Effect on score |
|----------|----------------|
| Annotators highlight the exact same characters with the same label | `1.0` (perfect agreement) |
| Spans overlap partially with the same label | Between `0.0` and `1.0`, proportional to the overlap |
| Spans have different labels, even if positions are identical | `0.0` |
| One annotator creates a span that the other doesn't | Pulls the average down (unmatched span scores `0.0`) |
| Neither annotator creates any spans | `1.0` (agreement that there is nothing to label) |

#### What counts as a "span"

When annotators highlight a region of text and assign it a label, Label Studio records the character positions where the highlight starts and ends, along with the label. For example, in the sentence:

`Dr. Maria Chen presented her findings at the Berlin conference.`

If an annotator highlights `Dr. Maria Chen` and labels the span as "Person", the span is recorded as characters 0 through 14.

#### Step 1: Check that labels match

Before measuring any positional overlap, Span Overlap first checks whether two spans share the same label. If the labels are different, the score for that pair is **0.0** regardless of how much they overlap positionally.

For example, if Annotator A labels characters 0–14 as **Person** and Annotator B labels characters 0–14 as **Organization**, the score is 0.0 even though the character ranges are identical.

#### Step 2: Calculate IoU (Intersection over Union)

For two spans with matching labels, the metric calculates how much they overlap using IoU:

```
IoU = Intersection length / Union length
```

- **Intersection** is the region where both spans overlap.
- **Union** is the total region covered by either span.

**Example**: Consider two annotators labeling the same sentence:

`Dr. Maria Chen presented her findings at the Berlin conference.`

| | Span | Characters | Label |
|---|------|------------|-------|
| Annotator A | "Dr. Maria Chen" | `0–14` | Person |
| Annotator B | "Maria Chen" | `4–14` | Person |

The labels match (both **Person**), so we calculate IoU:

- Intersection: characters 4–14 (the overlap) = **10 characters**
- Union: characters 0–14 (the combined extent) = **14 characters**
- IoU = 10 / 14 = **0.71**

#### Step 3: Match spans across annotations using greedy matching

When annotators create multiple spans, the metric needs to figure out which spans from Annotator A correspond to which spans from Annotator B. It does this using **greedy matching**:

1. For every span in Annotator A's work, find the span in Annotator B's work with the highest IoU score.
2. For every span in Annotator B's work, find the span in Annotator A's work with the highest IoU score.
3. Average all of these best-match scores together.

This two-way matching means that unmatched spans (spans one annotator created but the other didn't) naturally pull the overall score down, because their best-match score will be 0.0.

**Full example**: Two annotators label named entities in this sentence:

`Dr. Maria Chen presented her findings at the Berlin conference.`

| | Span | Characters | Label |
|---|------|------------|-------|
| Annotator A | "Dr. Maria Chen" | 0–14 | Person |
| Annotator A | "Berlin" | 41–47 | Location |
| Annotator B | "Maria Chen" | 4–14 | Person |
| Annotator B | "Berlin conference" | 41–58 | Location |

First, compute the IoU for each possible pair:

| | B: "Maria Chen" (Person) | B: "Berlin conference" (Location) |
|---|---|---|
| **A: "Dr. Maria Chen" (Person)** | Labels match → IoU = 10/14 = **0.71** | Labels differ → **0.0** |
| **A: "Berlin" (Location)** | Labels differ → **0.0** | Labels match → IoU = 6/17 = **0.35** |

Then, find the best match for each span:

| Span | Best match | Score |
|------|------------|-------|
| A: "Dr. Maria Chen" | B: "Maria Chen" | 0.71 |
| A: "Berlin" | B: "Berlin conference" | 0.35 |
| B: "Maria Chen" | A: "Dr. Maria Chen" | 0.71 |
| B: "Berlin conference" | A: "Berlin" | 0.35 |

**Final score** = average of all best-match scores = `(0.71 + 0.35 + 0.71 + 0.35) / 4` = **0.53**

#### How the threshold variant works

The base Span Overlap metric returns a continuous score (0.53 in the example above). The **Span Overlap (Threshold)** variant converts this into a simple yes-or-no match by comparing the score against a threshold.

For example, with a threshold of 0.5:
- Score 0.53 >= 0.5 → **1.0** (match)

With a threshold of 0.75:
- Score 0.53 < 0.75 → **0.0** (no match)

The threshold variant is required when using the consensus methodology, which needs binary match/no-match decisions.

### Intersection over Union (for bounding boxes)

Intersection over Union (IoU) measures how much two annotators agree on the position and size of bounding boxes drawn on an image. It is the default metric for `RectangleLabels` and `Rectangle` tags.

#### What affects the score

| Scenario | Effect on score |
|----------|----------------|
| Annotators draw boxes in the exact same position and size with the same label | 1.0 (perfect agreement) |
| Boxes overlap partially with the same label | Between 0.0 and 1.0, proportional to the overlapping area |
| Boxes have different labels, even if positions are identical | 0.0 |
| One annotator draws a box that the other doesn't | Pulls the average down (unmatched box scores 0.0) |
| Neither annotator draws any boxes | 1.0 (agreement that there is nothing to label) |

#### What counts as a bounding box

When an annotator draws a rectangle on an image and assigns it a label, Label Studio records the box's position (x, y coordinates of the top-left corner) and its width and height. For example, if an annotator draws a box around a dog in a photo and labels it **Dog**, Label Studio stores the box's coordinates along with that label.

#### Step 1: Check that labels match

Just like Span Overlap, IoU first checks whether two bounding boxes share the same label. If the labels are different, the score for that pair is **0.0** regardless of how much the boxes overlap.

For example, if Annotator A draws a box and labels it **Dog** and Annotator B draws a box in the exact same position but labels it **Cat**, the score is 0.0.

#### Step 2: Calculate IoU

For two boxes with matching labels, the metric calculates how much area they share:

```
IoU = Intersection area / Union area
```

- **Intersection** is the area where both boxes overlap (the region covered by both).
- **Union** is the total area covered by either box (both boxes combined, not double-counting the overlap).

Another way to express this:

```
IoU = Intersection area / (Area of box A + Area of box B − Intersection area)
```

**Example**: Two annotators are labeling dogs in a photo.

Annotator A draws a box around the dog:
- Position: `x=10`, `y=20`
- Size: `100` wide × `80` tall
- Label: **Dog**

Annotator B draws a slightly different box around the same dog:
- Position: `x=30`, `y=20`
- Size: `100` wide × `80` tall
- Label: **Dog**

The labels match (both **Dog**), so we calculate IoU:

- Box A covers `x=10` to `110`, `y=20` to `100`
- Box B covers `x=30` to `130`, `y=20` to `100`
- Intersection: `x=30` to `110`, `y=20` to `100` = `80` wide × `80` tall = **6,400 sq. units**
- Area of Box A = `100` × `80` = **8,000 sq. units**
- Area of Box B = `100` × `80` = **8,000 sq. units**
- Union = `8,000` + `8,000` − `6,400` = **9,600 sq. units**
- IoU = `6,400` / `9,600`  = **0.67**

#### Step 3: Match boxes across annotations using greedy matching

When annotators draw multiple bounding boxes, the metric uses the same **greedy matching** algorithm described in Span Overlap:

1. For every box in Annotator A's work, find the box in Annotator B's work with the highest IoU score.
2. For every box in Annotator B's work, find the box in Annotator A's work with the highest IoU score.
3. Average all of these best-match scores together.

**Full example**: Two annotators label objects in a photo containing a dog and a cat.

| | Box | Label |
|---|-----|-------|
| Annotator A | Box around the dog | Dog |
| Annotator A | Box around the cat | Cat |
| Annotator B | Box around the dog (shifted slightly) | Dog |
| Annotator B | Box around the cat (slightly larger) | Cat |

Suppose the IoU for matching pairs is:

| | B: Dog box | B: Cat box |
|---|---|---|
| **A: Dog box** | Labels match → IoU = **0.67** | Labels differ → **0.0** |
| **A: Cat box** | Labels differ → **0.0** | Labels match → IoU = **0.85** |

Best match for each box:

| Box | Best match | Score |
|-----|------------|-------|
| A: Dog box | B: Dog box | 0.67 |
| A: Cat box | B: Cat box | 0.85 |
| B: Dog box | A: Dog box | 0.67 |
| B: Cat box | A: Cat box | 0.85 |

**Final score** = (0.67 + 0.85 + 0.67 + 0.85) / 4 = **0.76**

#### How the threshold variant works

The base IoU metric returns a continuous score (0.76 in the example above). The **Intersection over Union (Threshold)** variant converts this into a binary match/no-match result.

For example, with a threshold of 0.5:
- Score 0.76 >= 0.5 → **1.0** (match)

With a threshold of 0.8:
- Score 0.76 < 0.8 → **0.0** (no match)


### IoU for other region types

The IoU concept applies to more than just rectangular bounding boxes. Label Studio adapts the same core idea for different annotation types:

- **Intersection over Union for Polygons** works the same way, but calculates the overlapping area between polygon shapes instead of rectangles. This is useful when annotators draw freeform outlines around irregular objects.
- **Brush Intersection over Union** compares pixel-level brush masks by counting how many pixels overlap versus the total pixels painted by either annotator. This is useful for segmentation tasks where annotators paint regions rather than drawing shapes.

In all cases, the overall process is the same: check that labels match, calculate the overlap ratio for the specific shape type, then use greedy matching to pair up regions and average the scores.

### Jaccard Similarity

Jaccard Similarity measures how much two annotators' selections overlap when they can each choose multiple items from a list. Unlike Exact Match, it gives partial credit when annotators agree on some selections but not all of them.

This metric is dynamically available for Choices tags with multi-select enabled.

#### What affects the score

| Scenario | Score |
|----------|-------|
| Annotators select the exact same items | 1.0 |
| Annotators share some but not all selections | Between 0.0 and 1.0, based on the overlap |
| Annotators select completely different items | 0.0 |
| Neither annotator selects anything | 1.0 (agreement that nothing applies) |
| One annotator selects items, the other selects nothing | 0.0 |

#### The formula

Jaccard Similarity treats each annotator's selections as a set and computes:

```
Jaccard Similarity = number of shared selections / total number of distinct selections
```

Or more formally:

```
J(A, B) = |A ∩ B| / |A ∪ B|
```

- **Intersection** (A ∩ B) is the set of items both annotators selected.
- **Union** (A ∪ B) is the set of all items selected by either annotator.

#### A simple example

A project asks annotators to tag articles with all relevant topics from a list: Sports, Politics, Technology, Health, Science.

Annotator A selects: **Sports, Politics, Technology**
Annotator B selects: **Politics, Technology, Health**

- Shared selections (intersection): Politics, Technology = **2 items**
- All distinct selections (union): Sports, Politics, Technology, Health = **4 items**
- Jaccard Similarity = 2 / 4 = **0.50**

#### How it compares to Exact Match

Using the same example above:

| Metric | Annotator A | Annotator B | Score |
|--------|-------------|-------------|-------|
| **Exact Match** | [Sports, Politics, Technology] | [Politics, Technology, Health] | **0.0** (not identical) |
| **Jaccard Similarity** | [Sports, Politics, Technology] | [Politics, Technology, Health] | **0.50** (2 out of 4 distinct items match) |

This is why Jaccard Similarity is useful for multi-select tasks — it recognizes that agreeing on 2 out of 4 topics is meaningfully different from agreeing on 0.

#### More examples

| Annotator A | Annotator B | Intersection | Union | Score |
|-------------|-------------|--------------|-------|-------|
| [Sports] | [Sports] | `1` | `1` | **1.0** |
| [Sports, Politics] | [Sports, Politics] | `2` | `2` | **1.0** |
| [Sports] | [Politics] | 0 | 2 | **0.0** |
| [Sports, Politics, Technology] | [Sports] | `1` | `3` | **0.33** |
| [Sports, Politics] | [Sports, Politics, Technology, Health] | `2` | `4` | **0.50** |

Note that **order does not matter**. `[Sports, Politics]` and `[Politics, Sports]` produce the same score because both are treated as sets.

#### How the threshold variant works

The base Jaccard Similarity metric returns a continuous score (like 0.50). The **Jaccard Similarity (Threshold)** variant converts this into a binary match/no-match result.

For example, with a threshold of 0.5:
- Score `0.50` >= `0.5` → **1.0** (match)

With a threshold of 0.75:
- Score `0.50` < `0.75` → **0.0** (no match)

The threshold variant is required when using the consensus methodology.



### Text Similarity

Text Similarity measures how closely two free-text annotations match at the surface level — that is, how similar the actual characters or words are. It is the default metric for TextArea tags.

#### The core idea

Text Similarity uses **edit distance** algorithms to calculate how many changes (insertions, deletions, substitutions) would be needed to transform one text into the other. Fewer changes means higher similarity.

By default, it uses the **Levenshtein** algorithm, which counts the minimum number of single-character edits needed. The raw edit distance is then normalized to a score between 0.0 and 1.0, where 1.0 means the texts are identical.

#### Examples

| Annotator A | Annotator B | Score | Why |
|-------------|-------------|-------|-----|
| "The cat sat on the mat" | "The cat sat on the mat" | **1.0** | Identical text |
| "The cat sat on the mat" | "The cat sat on the mat." | **~0.96** | One extra character (period) |
| "The cat sat on the mat" | "The cat sit on the mat" | **~0.96** | One character substitution (a→i) |
| "The cat sat on the mat" | "A dog lay on the rug" | **~0.43** | Many differences |
| "hello" | "world" | **~0.20** | Almost entirely different |

#### Configurable parameters

Text Similarity lets you adjust two settings:

**Algorithm** — the method used to compare strings:

| Algorithm | How it works | Good for |
|-----------|-------------|----------|
| Levenshtein (default) | Counts insertions, deletions, and substitutions | General-purpose text comparison |
| Damerau-Levenshtein | Like Levenshtein, but also counts transpositions (swapped adjacent characters) as a single edit | Text where typos often involve swapped letters |
| Jaro-Winkler | Weighs matching characters by position, with a bonus for shared prefixes | Short strings like names or codes |
| Jaro | Similar to Jaro-Winkler but without the prefix bonus | Short strings |
| Hamming | Counts positions where characters differ (strings must be the same length) | Fixed-length codes or identifiers |
| Ratcliff-Obershelp | Finds the longest common subsequences | Texts with rearranged sections |

**Granularity** — the level at which the text is split before comparison:

| Granularity | What it compares | Example |
|-------------|------------------|---------|
| Character (default) | Individual characters | "cat" → [c, a, t] |
| Bigram (2-gram) | Pairs of characters | "cat" → [ca, at] |
| Trigram (3-gram) | Triples of characters | "cats" → [cat, ats] |
| Word | Whole words | "the cat sat" → [the, cat, sat] |

Character-level comparison is the most fine-grained and catches small typos. Word-level comparison is more forgiving of minor spelling differences but stricter about missing or extra words.

#### Multiple text fields

When a TextArea tag allows multiple lines of text, each annotator's response is a list of strings. Text Similarity compares each line in order and averages the scores.

**Example**: Annotators are asked to transcribe three lines of text from an image.

| | Line 1 | Line 2 | Line 3 |
|---|--------|--------|--------|
| Annotator A | "John Smith" | "123 Main St" | "New York" |
| Annotator B | "John Smith" | "123 Main Street" | "New York" |

- Line 1: "John Smith" vs "John Smith" → **1.0**
- Line 2: "123 Main St" vs "123 Main Street" → **~0.81**
- Line 3: "New York" vs "New York" → **1.0**
- **Final score** = (1.0 + 0.81 + 1.0) / 3 = **0.94**

If one annotator writes more lines than the other, the extra lines are compared against nothing and score 0.0, pulling the average down.

#### How the threshold variant works

The base Text Similarity metric returns a continuous score. The **Text Similarity (Threshold)** variant converts this into a binary match/no-match result. The default threshold for text similarity is **0.85** (compared to 0.5 for most other metrics), reflecting the expectation that free-text annotations should be fairly close to count as agreement.

### Semantic Similarity

Semantic Similarity measures whether two text annotations convey the **same meaning**, regardless of how they are worded. Instead of comparing characters or words directly, it compares the underlying meaning using AI embeddings.

#### The core idea

Semantic Similarity works in three steps:

1. **Convert each text to an embedding** — A numerical representation (a vector) that captures the meaning of the text.
2. **Compute cosine similarity** between the two vectors — This measures how close the two meanings are on a scale from `0.0` to `1.0`.
3. **Compare against a threshold** — If the similarity meets the threshold (default: 0.85), the texts are considered a match.

#### When meaning matters more than wording

The key difference from Text Similarity is that Semantic Similarity understands that different words can express the same idea.

| Annotator A | Annotator B | Text Similarity | Semantic Similarity |
|-------------|-------------|-----------------|---------------------|
| "The cat is on the mat" | "The cat is on the mat" | **1.0** (identical) | **~1.0** (identical meaning) |
| "The cat is on the mat" | "A feline is sitting on the rug" | **~0.35** (very different words) | **~0.90** (very similar meaning) |
| "The patient has a fever" | "The patient's temperature is elevated" | **~0.42** (different words) | **~0.88** (same clinical meaning) |
| "The cat is on the mat" | "The stock market crashed today" | **~0.25** (different words) | **~0.10** (completely different meaning) |

Text Similarity would score the second and third rows low because the actual words are quite different. Semantic Similarity recognizes that the underlying meaning is essentially the same.

#### Configurable parameters

Semantic Similarity has one parameter:

- **Threshold** (default: 0.85) — the minimum cosine similarity for two texts to be considered a match. Lower values are more lenient; higher values require closer meaning.

### Choosing between Text Similarity and Semantic Similarity

| Consider | Text Similarity | Semantic Similarity |
|----------|-----------------|---------------------|
| **How it compares** | Character-by-character or word-by-word | Meaning and intent |
| **Best for** | Tasks where exact wording matters | Tasks where meaning matters more than wording |
| **Handles synonyms** | No — "couch" vs "sofa" scores low | Yes — "couch" vs "sofa" scores high |
| **Handles paraphrasing** | No — rephrased text scores low | Yes — same meaning scores high |
| **Catches typos** | Yes — small edits produce high scores | Yes — typos rarely change meaning |

**Use Text Similarity when:**
- Annotators are transcribing text (OCR, audio transcription)
- Annotators are entering structured data (names, addresses, codes)
- Exact wording is important to the task
- You want to detect and measure minor typos or formatting differences

**Use Semantic Similarity when:**
- Annotators are writing descriptions, summaries, or captions
- Multiple valid phrasings exist for the same answer
- You care about whether annotators understood the content the same way, not whether they used the same words
- Annotators may be working in slightly different styles or vocabularies

---

### Numeric Difference

Numeric Difference measures how close two numeric values are. Unlike Exact Match, which only cares whether two numbers are identical, Numeric Difference gives partial credit when values are close but not equal. It is the default metric for Number and Rating tags.

#### The formula

Numeric Difference converts the absolute difference between two values into a similarity score using this formula:

```
score = 1 / (1 + difference)
```

This produces a score between 0.0 and 1.0. Identical values score 1.0, and the score decreases smoothly as the difference increases.

#### Examples with a 1–5 rating scale

A project asks annotators to rate the quality of customer support responses on a scale from 1 to 5.

| Annotator A | Annotator B | Difference | Score | Interpretation |
|-------------|-------------|------------|-------|----------------|
| 4 | 4 | 0 | **1.0** | Perfect agreement |
| 4 | 5 | 1 | **0.50** | Close, one step apart |
| 4 | 3 | 1 | **0.50** | Close, one step apart |
| 5 | 3 | 2 | **0.33** | Moderate disagreement |
| 5 | 1 | 4 | **0.20** | Strong disagreement |

#### Examples with continuous numeric values

A project asks annotators to estimate the age of a person in a photo.

| Annotator A | Annotator B | Difference | Score |
|-------------|-------------|------------|-------|
| 30 | 30 | 0 | **1.0** |
| 30 | 32 | 2 | **0.33** |
| 30 | 35 | 5 | **0.17** |
| 30 | 50 | 20 | **0.05** |

Notice that the score drops quickly for larger differences. A difference of 1 already halves the score, and a difference of 5 brings it down to 0.17. This makes the base metric most useful for detecting whether annotators are in close agreement.

#### How the threshold variant works

The threshold variant, **Numeric Difference (Threshold)**, works differently from other threshold variants. Instead of binarizing the similarity score, it uses a **maximum difference** parameter (default: 1.0). If the absolute difference between two values is within this tolerance, the score is 1.0; otherwise it's 0.0.

**Example**: With a max difference of `1.0` on a 1–5 rating scale:

| Annotator A | Annotator B | Difference | Within tolerance? | Score |
|-------------|-------------|------------|-------------------|-------|
| 4 | 4 | 0 | Yes (`0 <= 1.0`) | **1.0** |
| 4 | 5 | 1 | Yes (`1 <= 1.0`) | **1.0** |
| 4 | 2 | 2 | No (`2 > 1.0`) | **0.0** |

This is often more intuitive for rating scales: "Annotators agree if they're within 1 point of each other."

### Taxonomy metrics

Label Studio offers two alternative metrics for `Taxonomy` tags that provide partial credit, unlike Exact Match which requires the full taxonomy selection to be identical. Both are useful when you want to recognize that two annotators who selected nearby items in a taxonomy are in closer agreement than two who selected completely unrelated items.

#### Understanding taxonomy paths

A taxonomy is a tree structure. When an annotator makes a selection, it is recorded as a **path** from the root to the selected node. For example, in this taxonomy:

```
Animals
├── Dogs
│   ├── Labrador
│   └── Poodle
├── Cats
│   ├── Siamese
│   └── Persian
└── Birds
    ├── Eagle
    └── Sparrow
```

Selecting "Labrador" produces the path: **Animals > Dogs > Labrador**
Selecting "Siamese" produces the path: **Animals > Cats > Siamese**

Annotators can also select multiple paths (e.g., both "Labrador" and "Eagle").

#### Common Labels Matches

Common Labels Matches compares taxonomy selections by treating each complete path as an item, then computing **Jaccard Similarity over the set of paths**. A path either matches exactly or it doesn't — there is no partial credit within a single path.

**Example**: An annotator can select multiple species from the taxonomy above.

| Annotator A | Annotator B | Shared paths | All distinct paths | Score |
|-------------|-------------|--------------|--------------------|-------|
| [Labrador] | [Labrador] | 1 | 1 | **1.0** |
| [Labrador, Eagle] | [Labrador, Eagle] | 2 | 2 | **1.0** |
| [Labrador, Eagle] | [Labrador, Sparrow] | 1 (Labrador) | 3 (Labrador, Eagle, Sparrow) | **0.33** |
| [Labrador] | [Poodle] | 0 | 2 | **0.0** |

Note that in the last row, Labrador and Poodle are both dogs, but Common Labels Matches treats them as completely different paths. If you want credit for shared ancestry, use Common Subtree Matches instead.

#### Common Subtree Matches

Common Subtree Matches gives partial credit for shared ancestry in the taxonomy tree. Before comparing, it **expands each selected path into all of its ancestor prefixes**. Then it computes Jaccard Similarity over these expanded sets.

**How expansion works**: The path "Animals > Dogs > Labrador" expands into:
- Animals
- Animals > Dogs
- Animals > Dogs > Labrador

This means that even if two annotators selected different leaf nodes, they'll still get credit for agreeing on the parent categories.

**Example**: Comparing "Labrador" vs. "Poodle":

| | Expanded nodes |
|---|---------------|
| Annotator A: **Labrador** | {Animals}, {Animals > Dogs}, {Animals > Dogs > Labrador} |
| Annotator B: **Poodle** | {Animals}, {Animals > Dogs}, {Animals > Dogs > Poodle} |

- Shared nodes (intersection): {Animals}, {Animals > Dogs} = **2 nodes**
- All distinct nodes (union): {Animals}, {Animals > Dogs}, {Animals > Dogs > Labrador}, {Animals > Dogs > Poodle} = **4 nodes**
- Score = 2 / 4 = **0.50**

Compare this to "Labrador" vs. "Siamese":

| | Expanded nodes |
|---|---------------|
| Annotator A: **Labrador** | {Animals}, {Animals > Dogs}, {Animals > Dogs > Labrador} |
| Annotator B: **Siamese** | {Animals}, {Animals > Cats}, {Animals > Cats > Siamese} |

- Shared nodes: {Animals} = **1 node**
- All distinct nodes: {Animals}, {Animals > Dogs}, {Animals > Dogs > Labrador}, {Animals > Cats}, {Animals > Cats > Siamese} = **5 nodes**
- Score = 1 / 5 = **0.20**

And "Labrador" vs. "Eagle":

| | Expanded nodes |
|---|---------------|
| Annotator A: **Labrador** | {Animals}, {Animals > Dogs}, {Animals > Dogs > Labrador} |
| Annotator B: **Eagle** | {Animals}, {Animals > Birds}, {Animals > Birds > Eagle} |

- Shared nodes: {Animals} = **1 node**
- All distinct nodes: 5 nodes
- Score = 1 / 5 = **0.20**

The scores reflect how closely related the selections are in the taxonomy tree. Two dog breeds (0.50) score higher than a dog and a cat (0.20), which makes intuitive sense.

#### Comparing all three taxonomy metrics

Using the taxonomy above, here's how the three available metrics score the same pairs:

| Annotator A | Annotator B | Exact Match | Common Labels Matches | Common Subtree Matches |
|-------------|-------------|-------------|----------------------|----------------------|
| Labrador | Labrador | **1.0** | **1.0** | **1.0** |
| Labrador | Poodle | **0.0** | **0.0** | **0.50** |
| Labrador | Siamese | **0.0** | **0.0** | **0.20** |
| Labrador | Eagle | **0.0** | **0.0** | **0.20** |
| [Labrador, Eagle] | [Labrador, Sparrow] | **0.0** | **0.33** | **0.67** |

- **Exact Match** is strictest — any difference at all scores 0.0.
- **Common Labels Matches** gives credit when some of the selected paths match exactly, but not for shared ancestry.
- **Common Subtree Matches** is most lenient — it recognizes that selecting two items in the same branch of the taxonomy represents partial agreement.




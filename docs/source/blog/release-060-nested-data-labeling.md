---
title: Label Studio Release Notes 0.6.0 - Nested Data Labeling
type: blog
order: 101
---

Two months in the baking, this release features the evolution of the labeling interface into supporting not only multiple data types and labeling scenarios, but also exploring the path of bringing additional dimensions into the labeling task.

## Nested Labeling 

Nested labeling enables you to specify multiple classification options that show up after you’ve selected a connected parent class:

<br/>
<img src="/images/release-060/nested_labeling.gif" class="gif-border" />
<br/>

It can match based on the selected Choice or Label value, and works with a `required` attribute too, smart selecting the region that you’ve not labeled. To try it out check [Choices](/tags/choices.html) documentation and look for the following attributes: `visibleWhen`, `whenTagName`, `whenLabelValue`, `whenChoiceValue`.

## Per region labeling

With per region labeling you can now provide additional attributes to the labeled regions. For example, when doing audio segmentation you can further classify the region. Per region is available for any data type and the following control tags: [Choices](/tags/choices.html), [TextArea](/tags/textarea.html), and [Rating](/tags/rating.html).

<br/>
<img src="/images/release-060/per-region.gif" class="gif-border" />

It nicely integrates with the nested labeling, for example, you can provide multiple levels of classification for any particular region. 

## Filtering

When the number of labels or choices is big, looking for a particular one becomes tedious. New <Filter /> tag to the rescue. It works with any list of Labels / Choices, and is keyboard-driven. Here is an example of the interaction: 

<br/> 
<img src="/images/release-060/filtering.gif" class="gif-border" />

Hitting `shift+f` puts focus, then hitting Enter key selects the first matching item.

## Display Label Names

Displaying labels on top of the labeled regions proved to be a useful feature if you’d like to do a verification of the labeling. Visually inspecting the regions takes smaller amounts of time than doing so through switching between regions.

<br/>
<img src="/images/release-060/show-labels.gif" class="gif-border" />

### Models Scores 

Along with the names of the labels you can provide a prediction score for specific regions. That score may either come from the data that you upload or from the model that you’ve connected. When it’s available you can **Sort by the score**, and quickly verify/adjust the labeling for the most “uncertain” regions. 
   	
## Keeping the label active

If you label the same type of data it may be cumbersome to keep selecting the same label over and over again, now you can choose to keep the last label active and use it for new labeling. 

<br/>
<img src="/images/release-060/keep-label-active.gif" class="gif-border" />

Don’t forget to unselect the region when you want to select a new label, otherwise, you’d change the label of the existing region.

## Bug fixes & improvements

* --host argument now available via command-line argument (thanks to [@hachreak](https://github.com/hachreak))
* fixed upload with plain text tasks (thanks to [@gauthamsuresh09](https://github.com/gauthamsuresh09))
* fixed one-click deploy on Google Cloud (thanks to [@iCorv](https://github.com/iCorv))

---
title: Label Studio Release Notes 0.6.0 - Nested Data Labeling
type: blog
order: 101
meta_title: Label Studio Release Notes 0.6.0 - Nested Data Labeling
meta_description: Label Studio Release 0.6.0 includes nested data labeling, per-region labeling, updates to machine learning backend integration, filtering, and more.
---

Two months in the baking, this release features the evolution of the labeling interface into supporting not only multiple data types and labeling scenarios, but also exploring the path of bringing additional dimensions into the labeling task. Along with that purely UI work a major update to the model assisted labeling.

We've had a panel for the predictions for a while, the idea behind it is to provide a set of predictions possibly coming from different models to explore and adjust, and now there is a new models page to easier manage what is connected and used for generating those predictions.

Here is more on the results of this update: 

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

## Machine Learning Updates

New ML page in UI, where you can specify URLs to connect ML backends, manually trigger model training, explore training statuses, and quickly check predictions by drag-n-dropping tasks.

<br/>
<img src="/images/release-060/model_page.png" class="gif-border" />


### Multiple Backends

Label Studio now supports multiple ML backends connected together. You can simultaneously get multiple predictions for each task and do comparative performance analysis for different models or different hyperparameters of a single model. It's possible to connect as many backends as you want by using `--ml-backend url1 url2 ...` command-line option or adding them via UI.

### Connecting models

Creating & connecting machine learning backend becomes way easier - simply define your model.py script with `.fit()` / `.predict()` methods and run ML backend with `label-studio-ml start --init --script=model.py`. Check quickstart and tutorials on how to connect sklearn and PyTorch models

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
* fixed URL paths for proxy safety (thanks to [ezavesky](https://github.com/ezavesky))

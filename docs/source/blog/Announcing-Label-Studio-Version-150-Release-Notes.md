---
title: Announcing the Label Studio 1.5.0 Features and Release Notes
type: blog
image: /images/release-150/visual-label.png
order: 97
meta_title: Label Studio Release Notes 1.5.0
meta_description: Release notes and information about Label Studio version 1.5.0.
---

Label Studio 1.5.0 is dedicated to more dynamic and custom ways to define, change, and display label sets. The exciting new features include the ability to show labels dynamically (as opposed statically), the capability to use images instead of text for the label name,and allowing annotators to create new labels and evolve the taxonomy as they work through the dataset.

## [Dynamic Labels](https://labelstud.io/templates/serp_ranking.html)

Prior to Label Studio 1.5.0, annotators used to scroll through an extensive list of choices. Starting with Label Studio 1.5.0, you can now show labels dynamically as a task input, either as a prediction from the model, or from a database lookup. With a broader set of options, dynamic labeling saves time and increases the consistency of labeling the objects.

<i>Figure 1: Dynamic Labels</i>
<br/><img src="/images/release-150/dynamic-label.gif" alt="Gif of Dynamic Labels" class="gif-border" />

## [Visual Labels](https://labelstud.io/templates/inventory_tracking.html)

In the earlier releases, the only option was to label data with text. Starting with Label Studio 1.5.0, you can create label sets with images and hyperlinks. This results in better visual signals for annotators. You can also customize the view of choices to be displayed by using HTML markup.

<i>Figure 2: Visual Labels</i>
<br/><img src="/images/release-150/visual-label.png" alt="Image of Visual Labels" class="gif-border" />

## [User-defined Labels](http://labelstud.io/tags/taxonomy.html)

Label Studio 1.5.0 allows annotators to add new classes in a taxonomy as they work through the dataset. Now, teams can start annotating a new dataset without the need to predefine classes. This feature is helpful when you are not sure what classes might be inside the dataset, and want to provide those as you explore your dataset. This configuration option can be enabled or disabled depending on the use case and maturity of the model. 

<i>Figure 3: User-defined Labels</i>
<br/><img src="/images/release-150/user-defined-label.gif" alt="Gif of User-defined Labels" class="gif-border" />

The Label Studio 1.5.0 release also includes exciting improvements and bug fixes. To see the full list of updates and contributors to this release, check out the [changelog on GitHub](https://github.com/heartexlabs/label-studio/releases).


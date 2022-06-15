---
title: Announcing the Label Studio SDK with Label Studio 1.5.0
type: blog
image: /images/release-150/visual-label.gif
order: 98
meta_title: Label Studio Release Notes 1.5.0
meta_description: Release notes and information about Label Studio version 1.5.0, announcing the Label Studio SDK to work with the open source data labeling tool Label Studio, or the enterprise version Label Studio Enterprise. 
---

# Label Studio 1.5.0: New features to customize label sets

The latest release of Label Studio is dedicated to more dynamic and custom ways to define, change, and display label sets. Big new features include the ability to show labels dynamically (as opposed statically), the ability to use images (and more) rather than text for the label name, and allowing annotators to create new labels and evolve the taxonomy as they work through the dataset.

## Dynamic Labels

Rather than having annotators scroll through an extensive list of choices, Label Studio can now show labels dynamically as a task input, either as a prediction from the model, or from a database lookup. Users are shown the most likely options, which saves time and increases consistency. 

<i>Figure 1: Dynamic Labels</i>
<br/><img src="/images/release-150/dynamic-label.gif" alt="Gif of Dynamic Labels" class="gif-border" />

## Visual Labels

Before the Label Studio 1.5.0 release, the only option was to label data with text. Now you can create label sets with images, hyperlinks, and more, resulting in better visual cues for annotators. You can also customize the view of choices to be displayed by using HTML markup.

<i>Figure 2: Visual Labels</i>
<br/><img src="/images/release-150/visual-label.png" alt="Image of Visual Labels" class="gif-border" />

## User-defined Labels

The latest release allows annotators to add new classes in a taxonomy as they work through the dataset, so teams can start annotating a new dataset without the need to predefine classes in advance. This is helpful when you are not sure what classes might be inside the dataset, and want to provide those as you explore your dataset. This configuration option can be enabled or disabled depending on the use case and maturity of the model. 

<i>Figure 3: User-defined Labels</i>
<br/><img src="/images/release-150/user-defined-label.gif" alt="Gif of User-defined Labels" class="gif-border" />

The Label Studio 1.5.0 release also includes updates to XX, XX, and other exciting improvements and bug fixes. To see the full list of updates and contributors to this release, check out the [changelog on GitHub](**LINK TO CHANGELOG ON GITHUB**).

stats to acquire:

- number of bug fixes (anything notable for users?)
- number of pull requests
- any contributors outside of heartex org?
- notes: slack crossed 5,000 participants
- current number of total users
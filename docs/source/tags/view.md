---
title: View
type: tags
order: 506
meta_title: View Tag for Defining How Blocks are Displayed
meta_description: Customize how blocks are displayed on the labeling interface in Label Studio for machine learning and data science projects.
---

The `View` element is used to configure the display of blocks, similar to the div tag in HTML.

{% insertmd includes/tags/view.md %}

### Example

Create two cards that flex to take up 50% of the screen width on the labeling interface

```html
<View style="display: flex;">
  <!-- Left side -->
  <View style="flex: 50%">
    <Header value="Facts:" />
    <Text name="text" value="$fact" />
  </View>
  <!-- Right side -->
  <View style="flex: 50%; margin-left: 1em">
    <Header value="Enter your question:" />
    <TextArea name="question" />
  </View>
</View>
```
### Example
```html
<View>
  <Text name="text" value="$text"/>
  <Choices name="sentiment" toName="text">
    <Choice value="Positive"/>
    <Choice value="Negative"/>
    <Choice value="Neutral"/>
  </Choices>
  <!-- Shown only when Positive or Negative is selected -->
  <View visibleWhen="choice-selected" whenTagName="sentiment"
        whenChoiceValue="Positive,Negative">
    <Header value="Why?"/>
    <TextArea name="why_positive" toName="text"/>
  </View>
</View>
```
### Example
```html
<View>
  <Labels name="label" toName="text">
    <Label value="PER" background="red"/>
    <Label value="ORG" background="darkorange"/>
    <Label value="LOC" background="orange"/>
    <Label value="MISC" background="green"/>
  </Labels>
  <Text name="text" value="$text"/>
  <!-- Shown only when region PER or ORG is selected -->
  <View visibleWhen="region-selected" whenLabelValue="PER,ORG">
    <Header value="yoho"/>
  </View>
</View>
```

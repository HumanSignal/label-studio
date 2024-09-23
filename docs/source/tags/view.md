---
title: View
type: tags
order: 505
meta_title: View Tag for Defining How Blocks are Displayed
meta_description: Customize how blocks are displayed on the labeling interface in Label Studio for machine learning and data science projects.
---

The `View` element is used to configure the display of blocks, similar to the div tag in HTML.

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| display | <code>block</code> \| <code>inline</code> |  |
| [style] | <code>string</code> | CSS style string |
| [className] | <code>string</code> | Class name of the CSS style to apply. Use with the Style tag |
| [idAttr] | <code>string</code> | Unique ID attribute to use in CSS |
| [visibleWhen] | <code>region-selected</code> \| <code>choice-selected</code> \| <code>no-region-selected</code> \| <code>choice-unselected</code> | Control visibility of the content. Can also be used with the `when*` parameters below to narrow visibility |
| [whenTagName] | <code>string</code> | Use with `visibleWhen`. Narrow down visibility by tag name. For regions, use the name of the object tag, for choices, use the name of the `choices` tag |
| [whenLabelValue] | <code>string</code> | Use with `visibleWhen="region-selected"`. Narrow down visibility by label value. Multiple values can be separated with commas |
| [whenChoiceValue] | <code>string</code> | Use with `visibleWhen` (`"choice-selected"` or `"choice-unselected"`) and `whenTagName`, both are required. Narrow down visibility by choice value. Multiple values can be separated with commas |

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

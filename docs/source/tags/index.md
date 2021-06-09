---
title: Introduction
type: tags
order: 201
meta_title: Tags - Customize the Label Studio User Interface
meta_description: Label Studio Documentation to easily customize the Label Studio user interface using XML-like tags for machine learning and data science projects.
---

Editor configuration is based on XML-like tags. Tags can be divided into three categories:

- Object tags (**data sources**) used to show elements that can be labeled: **Image**, **Text**, **Audio**, **AudioPlus**.
- Control tags used to label the objects, examples: **Labels**, **Choices**, **Rating**, **TextArea**.
- Visual tags used for visual only elements
(non-interactive), examples: **View**, **Header**. 
 

## Connecting elements

The **name** attribute is mandatory for all control and object tags. Also, each control tag should have **toName** attribute that should match the **name** parameter in the object element. For example:

```html
<View>
  <Labels name="lbl" toName="txt">
    <Label value="Label 1"></Label>
    <Label value="Label 2"></Label>
  </Labels>
  <Text name="txt" value="$value"></Text>
</View>
```

Note that in the case above, Label tags are used to label Text tag. There could be multiple control, and object tags in the same configuration, and names are used to connect them.

## Variables

All object tags and some control and visual tags support variables inside their parameters. A variable shall be placed inside `value` property of the tag and start with a `$` sign. The idea is you configure Label Studio once and then provide different data objects for it to load. Here is an example config:

```html
<View>
  <Header value="$header"></Header>
  <Text name="txt-1" value="$value"></Text>
</View>
```

And the example data you need to load into the studio looks like this:

```js
{ "header": "This is a header", "value": "This is the text" }
```

## Styles

Since `View` tag supports CSS styles, you can thoroughly configure the visual representation. Here is an example of a two-column labeling interface with multiple control and object elements:

```html
<View style="display: flex;">
  <View style="flex: 50%">
    <Header value="Choose:"></Header>
    <Text name="txt-1" value="$value"></Text>
    <Choices name="chc" toName="txt-1">
      <Choice value="Choice 1"></Choice>
      <Choice value="Choice 2"></Choice>
    </Choices>
  </View> 
  <View style="flex: 50%; margin-left: 1em">
    <Header value="Enter your question and rate text:"></Header>
    <Text name="txt-2" value="$value"></Text>
    <Rating name="rating" toName="txt-2"></Rating>
    <TextArea name="question"></TextArea>
  </View>
</View>
```

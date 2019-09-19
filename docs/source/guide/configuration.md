---
title: Configuration
type: guide
order: 200
---

## Tags

Editor configuration is based on XML-like tags. Tags can be divided
into three categories:

- Visual tags used for visual only elements
(non-interactive), examples: **View**, **Header**. 
- Control tags used to label the objects, examples: **Labels**, **Choices**, **Rating**, **TextArea**. 
- Object tags used to show elements that can be labeled: **Image**, **Text**, **Audio**, **AudioPlus**.

The **name** attribute is mandatory for all control and object tags. Also,
each control tag should have **toName** attribute that should match
the **name** parameter in the object element. For example:

```html
<View>
  <Labels name="lbl" toName="txt">
    <Label value="Label 1"></Label>
    <Label value="Label 2"></Label>
  </Labels>
  <Text name="txt" value="$value"></Text>
</View>
```

Note that in the case above Labels tags is used to label Text
tag. There could be multiple control, and object tags in the same
configuration and names are used to connect them.

Here is an example of two-column labeling interface with multiple
control and object elements:

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
  <TextArea name="question" ></TextArea>
 </View>
</View>
```

---
title: Introduction
type: tags
order: 201
---

Editor configuration is based on XML-like tags. Tags can be divided into three categories:

- Visual tags used for visual only elements
(non-interactive), examples: **View**, **Header**. 
- Control tags used to label the objects, examples: **Labels**, **Choices**, **Rating**, **TextArea**. 
- Object tags used to show elements that can be labeled: **Image**, **Text**, **Audio**, **AudioPlus**.

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

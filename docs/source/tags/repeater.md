---
title: Repeater
type: tags
order: 504
is_new: t
meta_title: Repeater Tag to duplicate annotation settings
meta_description: Customize Label Studio with the Repeater tag to repeat similar data blocks to accelerate labeling for machine learning and data science projects.
---

Repeater Tag for annotating multiple data objects in a dynamic range with the same semantics. You can loop through data items in a python-like for cycle in the labeling process.
It repeats tags inside it for every item in a given data array from your dataset. Supports all tags except Labels.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| on | <code>string</code> |  | Data field object with array with similar data |
| [indexFlag] | <code>string</code> | <code>&quot;{{idx}}&quot;</code> | Placeholder for array index in params of underlying tags |

### Example
```html
<Repeater on="$utterances" indexFlag="{{idx}}">
  <Text name="user_{{idx}}" value="$utterances[{{idx}}].text"/>
  <Header value="Utterance Review"/>
  <Choices name="utterance_action_{{idx}}" showInline="true" toName="user_{{idx}}">
    <Choice value="No Action"/>
    <Choice value="Training"/>
    <Choice value="New Intent"/>
  </Choices>
</Repeater>
```

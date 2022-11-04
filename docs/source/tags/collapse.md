---
title: Collapse
type: tags
order: 501
is_new: t
---

The `Collapse` tag is used for the content area which can be collapsed and expanded.

### Parameters
<i> Table 1: Parameters used in `Collapse` tag. </i>

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [accordion] | <code>boolean</code> | <code>true</code> | Works as an accordion |
| [bordered] | <code>string</code> | <code>false</code> | Shows border |

### Example
```html
<Collapse>
  <Panel value="Panel Header">
    <View><Header value="Hello world" /></View>
  </Panel>
</Collapse>
```

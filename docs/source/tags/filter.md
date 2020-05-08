---
title: Filter
type: tags
order: 510
is_new: t
---

Filter tag, show filter input to seek through classes

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of the filter |
| toName | <code>string</code> |  | name of the labels/choices element it connects to |
| [casesensetive] | <code>boolean</code> | <code>false</code> | case sensetive or insensetive match |
| [cleanup] | <code>boolean</code> | <code>true</code> | remove the search if you click Enter |
| [placeholder] | <code>string</code> |  | placeholder for the empty filter |
| [minlength] | <code>number</code> | <code>3</code> | length of string after which to initiate the search |
| [hotkey] | <code>string</code> |  | hotkey that activate the search |

### Example

```js
<View>
  <Filter name="text-1" toName="labels" />
  <Labels name="labels" toName="text">
    <Label value="Hello" />
    <Label value="World" />
  </Labels>
  <Text name="text" value="$text" />
</View>
```

---
title: Paragraphs
type: tags
order: 305
---

Paragraphs tag shows an Paragraphs markup that can be labeled
it expects an array of objects like that [{ $nameKey: "Author name", $textKey: "Text" }, ... ]

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of the element |
| value | <code>string</code> |  | value of the element |
| [valueType] | <code>json</code> \| <code>url</code> | <code>json</code> | how to treat value — as data or as url with data to load from |
| audioUrl | <code>string</code> |  | audio to sync phrases with |
| showPlayer | <code>boolean</code> |  | show audio player above the paragraphs |
| [saveTextResult] | <code>no</code> \| <code>yes</code> | <code>yes</code> | whether to save `text` to `value` or not |
| [layout] | <code>none</code> \| <code>dialogue</code> | <code>none</code> | the styles layout to use |
| [nameKey] | <code>string</code> | <code>&quot;author&quot;</code> | name key to use |
| [textKey] | <code>string</code> | <code>&quot;text&quot;</code> | text key to use |

### Example
```html
<View>
  <Paragraphs name="dialogue-1" value="$dialogue" layout="dialogue" />
</View>
```

---
title: Paragraphs
type: tags
order: 305
meta_title: Paragraph Tags for Paragraphs
meta_description: Label Studio Paragraph Tags customize Label Studio for paragraphs for machine learning and data science projects.
---

Paragraphs tag shows paragraph markup that can be labeled.
it expects an array of objects like this: [{ $nameKey: "Author name", $textKey: "Text" }, ... ]

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| value | <code>string</code> |  | Value of the element |
| [valueType] | <code>json</code> \| <code>url</code> | <code>json</code> | Where the data is stored — directly in uploaded JSON data or needs to be loaded from a URL |
| audioUrl | <code>string</code> |  | Audio to sync phrases with |
| [showPlayer] | <code>boolean</code> | <code>false</code> | Whether to show audio player above the paragraphs |
| [saveTextResult] | <code>no</code> \| <code>yes</code> | <code>yes</code> | Whether to save `text` to `value` or not |
| [layout] | <code>none</code> \| <code>dialogue</code> | <code>none</code> | The styles layout to use |
| [nameKey] | <code>string</code> | <code>&quot;author&quot;</code> | The name key to use |
| [textKey] | <code>string</code> | <code>&quot;text&quot;</code> | The text key to use |

### Example
```html
<View>
  <Paragraphs name="dialogue-1" value="$dialogue" layout="dialogue" />
  <ParagraphLabels name="importance" toName="dialogue-1">
    <Label value="Important Stuff"></Label>
    <Label value="Random talk"></Label>
  </ParagraphLabels>
</View>
```

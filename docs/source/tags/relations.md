---
title: Relations
type: tags
order: 421
is_new: t
---

Relations tag, create relations labels<br>
<img src="/images/screens/relations.png">

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [choice] | <code>single</code> | <code>multiple</code> | <code>single</code> | configure if you can select just one or multiple labels |

### Example  
```html
<View>
  <Relations>
    <Relation value="friends" />
    <Relation value="enemies" />
  </Relations>
  <Text name="txt-1" value="$text" />
  <Labels name="lbl-1" toName="txt-1">
    <Label value="Opossum" />
    <Label value="Raccoon" />
  </Labels>
</View>
```

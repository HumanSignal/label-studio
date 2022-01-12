---
title: Text Classification
type: templates
category: Natural Language Processing
cat: natural-language-processing
order: 202
meta_title: 
meta_description: 
---

## Labeling Configuration

```html
<View>
  <Text name="text" value="$text"/>
  <View style="box-shadow: 2px 2px 5px #999;
               padding: 20px; margin-top: 2em;
               border-radius: 5px;">
    <Header value="Choose text sentiment"/>
    <Choices name="sentiment" toName="text"
             choice="single" showInLine="true">
      <Choice value="Positive"/>
      <Choice value="Negative"/>
      <Choice value="Neutral"/>
    </Choices>
  </View>
</View>
```
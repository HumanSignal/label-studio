---
title: Response Selection
type: templates
category: Conversational AI
cat: conversational-ai
order: 402
meta_title: 
meta_description: 
---

## Labeling Configuration

```html
<View>  
  <Paragraphs name="prg" value="$dialogue" layout="dialogue" />
  <Header value="Choose a response" />
  <View style="display: flex">
    <View>
    <Text name="resp1" value="$respone" />
    <Text name="resp2" value="$resptwo" />
    <Text name="resp3" value="$respthree" />
    </View>
    <View style="padding: 50px;">
    <Choices name="resp" toName="prg" required="true">
      <Choice value="One" />
      <Choice value="Two" />
  	  <Choice value="Three" />
    </Choices>
    </View>
  </View>
</View>
```
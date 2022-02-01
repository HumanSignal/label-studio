---
title: Response Selection
type: templates
category: Conversational AI
cat: conversational-ai
order: 402
meta_title: Response Selection Data Labeling Template
meta_description: Template for selecting relevant responses for conversational AI use cases with Label Studio for your machine learning and data science projects.
---

If you want to refine the best response for a conversational AI use case, you can provide already-generated responses to annotators and have them choose the best one. 

Use this template to provide a section of dialogue and three text responses to the dialogue. Annotators then select the choice that corresponds with the best-fitting text response. 

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

## Related Tags

- [Paragraphs](/tags/paragraphs.html)
- [Text](/tags/text.html)
- [Choices](/tags/choices.html)
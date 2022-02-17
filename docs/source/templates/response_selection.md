---
title: Response Selection
type: templates
category: Conversational AI
cat: conversational-ai
order: 402
meta_title: Response Selection Data Labeling Template
meta_description: Template for selecting relevant responses for conversational AI use cases with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/response-selection.png" alt="" class="gif-border" width="552px" height="408px" />

If you want to refine the best response for a conversational AI use case, you can provide already-generated responses to annotators and have them choose the best one. 

Use this template to provide a section of dialogue and three text responses to the dialogue. Annotators then select the choice that corresponds with the best-fitting text response. 

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>  
    <!--Use the Paragraphs object tag to display dialogue to annotators-->
  <Paragraphs name="prg" value="$dialogue" layout="dialogue" />
    <!--Use the Header tag to provide instructions to annotators-->
  <Header value="Choose a response" />
    <!--Add styling to the View tag to control the display of the text
    and choices on the labeling interface-->
  <View style="display: flex">
    <View>
        <!--Use the Text object tag to display 3 different text samples-->
    <Text name="resp1" value="$respone" />
    <Text name="resp2" value="$resptwo" />
    <Text name="resp3" value="$respthree" />
    </View>
      <!--Style the view tag to make sure there is space between the text
      samples and the corresponding choices-->
    <View style="padding: 50px;">
        <!--Use the Choices control tag to allow annotators to choose which
        text sample is the best response to the dialogue.-->
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
- [Header](/tags/header.html)
- [View](/tags/view.html)
- [Text](/tags/text.html)
- [Choices](/tags/choices.html)
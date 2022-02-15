---
title: Dialogue Analysis
type: templates
category: Conversational AI
cat: conversational-ai
order: 305
meta_title: Dialogue Analysis Data Labeling Template
meta_description: Template for performing dialogue analysis for conversational AI use cases with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates-misc/dialogue-analysis.png" alt="" class="gif-border" width="600px" height="512px" />

If you want to evaluate and analyze the responses present in a dialogue that already happened, and optionally correct it, use this template. 

Use this template to provide a section of dialogue and classify it. Annotators then provide the best response to the section of dialog. 

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>


## Labeling Configuration 

```html
<View>
    <!--Use the HyperText object tag to display dialogue data-->
  <HyperText name="dialog" value="$dialogs"></HyperText>
    <!-- Use the Header tag to provide instructions to the annotator-->
  <Header value="Rate last answer:"></Header>
    <!--Use the Choices control tag to have annotators classify the dialogue response.-->
  <Choices name="chc-1" choice="single-radio" toName="dialog" showInline="true">
    <Choice value="Bad answer"></Choice>
    <Choice value="Neutral answer"></Choice>
    <Choice value="Good answer"></Choice>
  </Choices>
  <Header value="Your answer:"></Header>
    <!--Use the TextArea control tag to provide annotators with a free text box 
    to supply their own answer. Add the `editable=true` argument to allow them 
    to edit their answer, or `required=true` to force annotators to supply an option.-->
  <TextArea name="answer"></TextArea>
</View>
```

## Related tags

- [HyperText](/tags/hypertext.html)
- [Choices](/tags/choices.html)
- [TextArea](/tags/textarea.html)
---
title: Dialogue Analysis
type: templates
category: Conversational AI
cat: conversational-ai
order: 305
meta_title: Dialogue Analysis Data Labeling Template
meta_description: Template for performing dialogue analysis for conversational AI use cases with Label Studio for your machine learning and data science projects.
---

If you want to evaluate and analyze the responses present in a dialogue that already happened, and optionally correct it, use this template. 

Use this template to provide a section of dialogue and classify it. Annotators then provide the best response to the section of dialog. 


## Config 

```html
<View>
  <HyperText name="dialog" value="$dialogs"></HyperText>
  <Header value="Rate last answer:"></Header>
  <Choices name="chc-1" choice="single-radio" toName="dialog" showInline="true">
    <Choice value="Bad answer"></Choice>
    <Choice value="Neutral answer"></Choice>
    <Choice value="Good answer"></Choice>
  </Choices>
  <Header value="Your answer:"></Header>
  <TextArea name="answer"></TextArea>
</View>
```

## Related tags

- [HyperText](/tags/hypertext.html)
- [Choices](/tags/choices.html)
- [TextArea](/tags/textarea.html)
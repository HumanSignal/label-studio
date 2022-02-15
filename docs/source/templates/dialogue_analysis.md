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

Use this template to provide a section of dialogue and classify it. Annotators then provide the best response to the section of dialogue. 

## Interactive Template Preview

<div id="main-preview"></div>


## Labeling Configuration 

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

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

Use the [HyperText](/tags/hypertext.html) object tag to display dialogue data, imported in Label Studio JSON format using a key of "dialogs":
```xml
<HyperText name="dialog" value="$dialogs"></HyperText>
```

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header value="Rate last answer:"></Header>
```

Use the [Choices](/tags/choices.html) control tag in combination with the [Choice](/tags/choice.html) tag to have annotators classify the dialogue response. Use the arguments to control how the choices appear on the interface:
```xml
<Choices name="chc-1" choice="single-radio" toName="dialog" showInline="true">
    <Choice value="Bad answer"></Choice>
    <Choice value="Neutral answer"></Choice>
    <Choice value="Good answer"></Choice>
</Choices>
```
You can change the choice `value`s to provide different classification options. 

Use the [TextArea](/tags/textarea.html) control tag to provide annotators with a free text box to supply their own response to the dialogue. Add the `editable=true` argument to allow them 
    to edit their answer, or `required=true` to force annotators to supply an alternate response:
```xml
<TextArea name="answer"></TextArea>
```


## Related tags

- [HyperText](/tags/hypertext.html)
- [Choices](/tags/choices.html)
- [TextArea](/tags/textarea.html)
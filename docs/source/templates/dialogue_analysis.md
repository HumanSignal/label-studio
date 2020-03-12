---
title: Dialogue Analysis
type: templates
order: 301
---

Analyze the chat dialog, classify it and provide your own answer

<img src="/images/screens/dialogue_analysis.png" class="img-template-example" title="Dialogue Analysis" />

## Run

```bash
label-studio init --template=dialogue_analysis dialogue_analysis_project
label-studio start dialogue_analysis_project 
```

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

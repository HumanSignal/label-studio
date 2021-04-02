---
title: Dialogue Analysis
type: templates
order: 301
meta_title: Dialogue Analysis Data Labeling Template
meta_description: Label Studio Dialogue Analysis Template for machine learning and data science data labeling projects.
---

Analyze the chat dialog, classify it and provide your own answer

<img src="/images/screens/dialogue_analysis.png" class="img-template-example" title="Dialog Analysis" />

## Run

```bash
label-studio init --template=dialog_analysis dialog_analysis_project
label-studio start dialog_analysis_project 
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

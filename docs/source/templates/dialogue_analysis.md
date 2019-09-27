---
title: Dialogue Analysis
type: templates
order: 204
---

Analyze the chat dialog, classify it and provide your own answer

![Chatbot Analysis](https://user.fm/files/v2-cb81c8aaa30170724ea19e3af7218fc8/Screen%20Shot%202019-08-01%20at%209.27.14%20PM.png "Chatbot Analysis")

## Run

```bash
python server.py -c config.json -l ../examples/chatbot_analysis/config.xml -i ../examples/chatbot_analysis/tasks.json -o output
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

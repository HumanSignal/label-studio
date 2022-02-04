---
title: Visual Question Answering
type: templates
category: Computer Vision
cat: computer-vision
order: 107
meta_title: Visual Question Answering Data Labeling Template
meta_description: Template for performing visual question answering data labeling tasks with Label Studio for your machine learning and data science projects.
---

Create a dataset with answered questions about images using this visual question answering template. In response to an image, annotators can provide free-text answers to a question and also label components of a question with relevant aspects. 

## Labeling Configuration

```html
<View>
  <Image name="image" value="$image"/>
  <Labels name="aspect" toName="q1">
    <Label value="attribute identification" background="#F39C12"/>
    <Label value="counting" background="#E74C3C"/>
    <Label value="comparison" background="#3498DB"/>
    <Label value="multiple attention" background="#2ECC71"/>
    <Label value="logical operations" background="#8E44AD"/>
  </Labels>
  <Header value="Please answer these questions:"/>
  <View style="display: grid; grid-template-columns: 1fr 10fr 1fr 3fr; column-gap: 1em">
    <Header value="Q1:"/>
  <Text name="q1" value="$q1"/>
   <Header value="A1:"/>
    <TextArea name="answer1" toName="q1" rows="1" maxSubmissions="1"/>
  </View>
  <View style="display: grid; grid-template-columns: 1fr 10fr 1fr 3fr; column-gap: 1em">
    <Header value="Q2:"/>
  <Text name="q2" value="$q2"/>
   <Header value="A2:"/>
    <TextArea name="answer2" toName="q2" rows="1" maxSubmissions="1"/>
  </View>
  <View style="display: grid; grid-template-columns: 1fr 10fr 1fr 3fr; column-gap: 1em">
    <Header value="Q3:"/>
  <Text name="q3" value="$q3"/>
   <Header value="A3:"/>
    <TextArea name="answer3" toName="q3" rows="1" maxSubmissions="1"/>
    </View>
  <View style="display: grid; grid-template-columns: 1fr 10fr 1fr 3fr; column-gap: 1em">
    <Header value="Q4:"/>
  <Text name="q4" value="$q4"/>
   <Header value="A4:"/>
    <TextArea name="answer4" toName="q4" rows="1" maxSubmissions="1"/>
    </View>
</View>
```

## Related tags

- [Image](/tags/image.html)
- [Labels](/tags/labels.html)
- [Header](/tags/header.html)
- [TextArea](/tags/textarea.html)

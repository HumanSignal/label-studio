---
title: Visual Question Answering
type: templates
category: Computer Vision
cat: computer-vision
order: 107
meta_title: Visual Question Answering Data Labeling Template
meta_description: Template for performing visual question answering data labeling tasks with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/visual-question-answering.png" alt="" class="gif-border" width="552px" height="408px" />

Create a dataset with answered questions about images using this visual question answering template. In response to an image, annotators can provide free-text answers to a question and also label components of a question with relevant aspects. 

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <!--Use the Image object tag to display an image-->
  <Image name="image" value="$image"/>
    <!--Use the Labels control tag to apply specific labels to question 1-->
  <Labels name="aspect" toName="q1">
    <Label value="attribute identification" background="#F39C12"/>
    <Label value="counting" background="#E74C3C"/>
    <Label value="comparison" background="#3498DB"/>
    <Label value="multiple attention" background="#2ECC71"/>
    <Label value="logical operations" background="#8E44AD"/>
  </Labels>
    <!--Use the Header tag to provide instructions to annotators-->
  <Header value="Please answer these questions:"/>
    <!--Add styling to the View tag to control the appearance of the
    questions and answers-->
  <View style="display: grid; grid-template-columns: 1fr 10fr 1fr 3fr; column-gap: 1em">
      <!--Use the Header tag to provide context to the text sample-->
    <Header value="Q1:"/>
      <!--Use the Text object tag to display a question-->
  <Text name="q1" value="$q1"/>
   <Header value="A1:"/>
      <!--Use the TextArea control tag to provide an answer to question 1-->
    <TextArea name="answer1" toName="q1" rows="1" maxSubmissions="1"/>
  </View>
  <View style="display: grid; grid-template-columns: 1fr 10fr 1fr 3fr; column-gap: 1em">
    <Header value="Q2:"/>
      <!--Use the Text object tag to display a different question-->
  <Text name="q2" value="$q2"/>
   <Header value="A2:"/>
      <!--Use the TextArea control tag to provide an answer to question 2-->
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

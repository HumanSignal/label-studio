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

## Interactive Template Preview

<div id="main-preview"></div>

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

## About the labeling configuration

All labeling configurations elements must be wrapped in [View](/tags/view.html) tags.

Use the [Image](/tags/image.html) object tag to display an image:
```xml
<Image name="image" value="$image"/>
```
This image is stored in a Label Studio JSON-formatted file as a URL with the key "image". 
  
Use the [Labels](/tags/labels.html) control tag to apply specific labels to the first question about the image, to classify specific parts of the question being asked about the image:
```xml
  <Labels name="aspect" toName="q1">
    <Label value="attribute identification" background="#F39C12"/>
    <Label value="counting" background="#E74C3C"/>
    <Label value="comparison" background="#3498DB"/>
    <Label value="multiple attention" background="#2ECC71"/>
    <Label value="logical operations" background="#8E44AD"/>
  </Labels>
```
The `toName="q1"` argument is what makes these labels apply only to the text of the first question.

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header value="Please answer these questions:"/>
```

Add styling to the [View](/tags/view.html) tag to control the appearance of the question and answer blocks:
```xml
<View style="display: grid; grid-template-columns: 1fr 10fr 1fr 3fr; column-gap: 1em">
```

Use the [Header](/tags/header.html) tag to provide context about the text sample to annotators:
```xml
<Header value="Q1:"/>
```

Use the [Text](/tags/text.html) object tag to display a question. This 
```xml
<Text name="q1" value="$q1"/>
```
This text sample is stored in a Label Studio JSON-formatted file with the key "q1". 

Use the [Header](/tags/header.html) tag to provide context about the text sample to annotators:
```xml
<Header value="A1:"/>
```

Use the [TextArea](/tags/textarea.html) control tag to provide annotators a spot to answer question 1:
```xml
<TextArea name="answer1" toName="q1" rows="1" maxSubmissions="1"/>
```
The text entered as part of this text box submission is stored in the exported Label Studio JSON under the name "answer1", and is associated with question 1 with the `toName` field. The text box only allows 1 submission, and is only 1 row long when displayed on the labeling interface. 

At the end of the question and answer block, close the [View](/tags/view.html) tag:
```xml
  </View>
```

An entire section of question and answer prompts looks like the following:
```xml
  <View style="display: grid; grid-template-columns: 1fr 10fr 1fr 3fr; column-gap: 1em">
    <Header value="Q2:"/>
  <Text name="q2" value="$q2"/>
   <Header value="A2:"/>
    <TextArea name="answer2" toName="q2" rows="1" maxSubmissions="1"/>
  </View>
```


## Related tags

- [Image](/tags/image.html)
- [Labels](/tags/labels.html)
- [Header](/tags/header.html)
- [TextArea](/tags/textarea.html)

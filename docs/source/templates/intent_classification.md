---
title: Intent Classification
type: templates
category: Audio/Speech Processing
cat: audio-speech-processing
order: 305
meta_title: 
meta_description: 
---



## Labeling Configuration

```html
<View>
  <Labels name="labels" toName="audio">
    <Label value="Segment" />
  </Labels>

  <AudioPlus name="audio" value="$audio"/>

  <Choices name="intent" toName="audio" perRegion="true" required="true">
    <Choice value="Question" />
    <Choice value="Request" />
    <Choice value="Satisfied" />
    <Choice value="Interested" />
    <Choice value="Unsatisfied" />
  </Choices>
</View>
```
---
title: Audio Classification for Segments
type: templates
category: Audio/Speech Processing
cat: audio-speech-processing
order: 308
meta_title: Audio Classification for Segments Data Labeling Template
meta_description: Template for classifying audio regions for segmentation tasks with Label Studio for your machine learning and data science projects.
---

Listen to the audio file and classify it. 

<img src="/images/screens/audio_regions.png" class="img-template-example" title="Audio Regions" />

<p class="tip">For audio regions to work when you have remote URLs, you need to configure CORS to be wide open.</p>

## Labeling Configuration 

```html
<View>
  <Header value="Select its topic:"></Header>
  <Labels name="label" toName="audio" choice="multiple">
    <Label value="Politics" background="yellow"></Label>
    <Label value="Business" background="red"></Label>
    <Label value="Education" background="blue"></Label>
    <Label value="Other"></Label>
  </Labels>
  <Header value="Listen to the audio:"></Header>
  <AudioPlus name="audio" value="$url"></AudioPlus>
</View>
```

## Related tags

- [AudioPlus](/tags/audioplus.html)
- [Choices](/tags/choices.html)
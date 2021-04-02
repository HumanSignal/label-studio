---
title: Audio Regions
type: templates
order: 402
meta_title: Audio Regions Data Labeling Template
meta_description: Label Studio Audio Regions Template for machine learning and data science data labeling projects.
---

Listen to the audio file and classify

<img src="/images/screens/audio_regions.png" class="img-template-example" title="Audio Regions" />

<p class="tip">For audio regions to work when you have remote URLs, you need to configure CORS to be wide-open</p>

## Run

```bash
label-studio init --template=audio_regions audio_regions_project
label-studio start audio_regions_project 
```

## Config 

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

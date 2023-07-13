---
title: Audio Transcription Context
type: templates
category: Audio/Speech Processing
cat: audio-speech-processing
order: 307
meta_title: Audio Transcription Context 
meta_description: Template annotating transcriptions in their audio context.
---

<img src="/images/templates-misc/audio-classification.png" alt="" class="gif-border" width="482px" height="282px" />

If you want to perform audio classification tasks, such as intent or sentiment classification, you can use this template to listen to an audio file and classify the topic of the clip.

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <Audio name="audio" value="$url" sync="text"></Audio>
    <View>
    <Header value="Transcript"/>
    <Paragraphs audioUrl="$audio" contextScroll="true" sync="audio" name="text" value="$text" layout="dialogue" textKey="text" nameKey="author" granularity="paragraph"/>
  </View>  
    <View>
      <Header value="Sentiment Labels"/>
      <ParagraphLabels  name="label" toName="text">
        <Label value="Positive" background="#00ff00"/>
        <Label value="Negative" background="#ff0000"/>
      </ParagraphLabels>
    </View>
  <View visibleWhen="region-selected" whenTagName="label">
  <DateTime name="datetime" toName="text" only="date" perRegion="true" />
</View>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header value="Listen to the audio:"></Header>
```

Use the [Audio](/tags/audio.html) object tag to specify the type and the location of the audio clip. In this case, the audio clip is stored with a `url` key. Audio paired with the [Paragraphs](/tags/paragraphs.html) with 'contextScroll' set to true and `sync` set to audio. Additionally `name` of the paragraph tag should have the `textKey` value from the audio tag:
```xml
<Audio name="audio" value="$url" sync="text"></Audio>
<Paragraphs audioUrl="$audio" contextScroll="true" sync="audio" name="text" value="$text" layout="dialogue" textKey="text" nameKey="author" granularity="paragraph"/>
```

Use the [Choices](/tags/choices.html) control tag to manage how the classification choices appear to annotators with `showInline="true"` and what selection option is used on the interface with `choice="single-radio"`. The `toName="audio"` option associates the choices with the audio clip. 
```xml
<Choices name="label" toName="audio" choice="single-radio" showInline="true">
```
You must use the Choices tag in combination with the [Choice](/tags/choice.html) to specify the available choices to classify the audio, then close the Choices tag:
```xml
    <Choice value="Politics"></Choice>
    <Choice value="Business"></Choice>
    <Choice value="Education"></Choice>
    <Choice value="Other"></Choice>
</Choices>
```

## Enhance this template
This template can be enhanced in many ways.

### Change the appearance of choices

If you want to make the classification section visually distinct from the rest of the labeling interface, you can add styling to the [View](/tags/view.html) tag. Wrap the [Choices](/tags/choices.html) and [Header](/tags/header.html) in their own View tag:
```xml
<View style="box-shadow: 2px 2px 5px #999;
             padding: 20px; margin-top: 2em;
             border-radius: 5px;">
  <Header value="Select the topic of the audio clip"/>
  <Choices name="label" toName="audio" choice="single-radio" showInline="true">
    <Choice value="Politics"></Choice>
    <Choice value="Business"></Choice>
    <Choice value="Education"></Choice>
    <Choice value="Other"></Choice>
  </Choices>
</View>
```

<!-- md nested-classification.md -->

## Related tags

- [Audio](/tags/audio.html)
- [Choices](/tags/choices.html)

## Related templates

- [Intent Classification](intent_classification.html)
- [Audio Classification with Segments](audio_regions.html)

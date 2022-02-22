---
title: Signal Quality Detection
type: templates
category: Audio/Speech Processing
cat: audio-speech-processing
order: 304
meta_title: Signal Quality Detection Data Labeling Template
meta_description: Template for detecting the quality of an audio signal with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/signal-quality-detection.png" alt="" class="gif-border" width="552px" height="408px" />

Rate the quality of a defined signal in an audio clip, for example, when developing a machine learning model to isolate speech from a crowded bar, or to remove other noise from an audio clip.

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <Rating name="rating" toName="audio" maxRating="10" icon="star" size="medium" />
  <Audio name="audio" value="$audio"/>
</View>
```

## About the labeling configuration
All labeling configurations must be wrapped in [`View`](/tags/view.html) tags.

Use the [Rating](/tags/rating.html) control tag to display a 10-star rating scale to annotators:
```xml
<Rating name="rating" toName="audio" maxRating="10" icon="star" size="medium" />
```
Because the Rating tag appears before the Audio tag, the rating scale appears before the audio clip on the labeling interface.

Use the [Audio](/tags/audio.html) object tag to provide basic audio playback of the audio clip:
```xml
<Audio name="audio" value="$audio"/>
```

## Related tags
- [Rating](/tags/rating.html)
- [Audio](/tags/audio.html)

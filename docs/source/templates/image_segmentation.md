---
title: Semantic Segmentation with Masks 
type: templates
category: Computer Vision
cat: computer-vision
order: 105
meta_title: Semantic Segmentation with Masks Data Labeling Template
meta_description: Template for performing semantic segmentation with brush masks with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/semantic-segmentation-with-masks.png" alt="" class="gif-border" width="552px" height="408px" />

Image segmentation using a brush and producing a mask.

<a href="https://app.humansignal.com/b/vgehDSMXtYGSdAfcBnugKoBcqxm6QpSH"
  target="_blank" rel="noopener" aria-label="Open in Label Studio" style="all:unset;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;border:1px solid rgb(109,135,241);padding:8px 12px;background:rgb(87 108 193);color:white;font-weight:500;font-family:sans-serif;gap:6px;transition:background 0.2s ease;" onmouseover="this.style.background='rgb(97 122 218)'" onmouseout="this.style.background='rgb(87 108 193)'">
  <svg style="width:20px;height:20px" viewBox="0 0 26 26" fill="none"><path fill="none" d="M3.5 4.5h19v18h-19z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M25.7 7.503h-7.087V5.147H7.588V2.792h11.025V.436H25.7v7.067Zm-18.112 0H5.225v10.994H2.863V7.503H.5V.436h7.088v7.067Zm0 18.061v-7.067H.5v7.067h7.088ZM25.7 18.497v7.067h-7.088v-2.356H7.588v-2.355h11.025v-2.356H25.7Zm-2.363 0V7.503h-2.363v10.994h2.363Z" fill="white"/></svg>
  <span style="font-size:14px">Open in Label Studio</span>
  <svg style="width:16px;height:16px" viewBox="0 0 24 24"><path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" fill="white"/></svg>
</a>

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <Image name="image" value="$image" zoom="true"/>
  <BrushLabels name="tag" toName="image">
    <Label value="Airplane" background="rgba(255, 0, 0, 0.7)"/>
    <Label value="Car" background="rgba(0, 0, 255, 0.7)"/>
  </BrushLabels>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.


Use the [Image](/tags/image.html) object tag to display the image and allow the annotator to zoom the image:
```xml
<Image name="image" value="$image" zoom="true"/>
```

Use the [BrushLabels](/tags/brushlabels.html) control tag to apply brush masks to the image, using the [Label](/tags/label.html) tag to specify the value and color of the brush mask:
```xml
  <BrushLabels name="tag" toName="image">
    <Label value="Airplane" background="rgba(255, 0, 0, 0.7)"/>
    <Label value="Car" background="rgba(0, 0, 255, 0.7)"/>
  </BrushLabels>
```

## Related tags

- [Image](/tags/image.html)
- [BrushLabels](/tags/brushlabels.html)
- [Label](/tags/label.html)

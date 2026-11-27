---
title: Object Detection with Bounding Boxes for Quality Control
type: templates
hide_menu: true
category: Computer Vision
cat: computer-vision
order: 1103
meta_description: Template for using Label Studio to perform object detection with rectangular bounding boxes for quality control.
---

![Screenshot of labeling interface](/images/templates-misc/quality-control.png)

Object Detection with Bounding Boxes labeled data is crucial for AI applications in quality control, as it enables models to accurately identify and locate defects or anomalies in products during manufacturing processes. By utilizing this labeled data, AI can perform tasks such as detecting flaws in materials, ensuring compliance with quality standards, and enhancing overall production efficiency.

One of the biggest challenges in this domain is the time-intensive nature of manually labeling vast amounts of image data, which can often lead to inconsistencies and errors, especially when domain expertise is required to identify subtle defects. Label Studio effectively addresses these challenges through its innovative hybrid approach that combines AI-assisted pre-labeling with human expert validation. This not only speeds up the labeling process but also ensures high accuracy by allowing specialized annotators to review and refine labels. Additionally, the platform offers customizable templates and collaboration tools that streamline workflow, making it easy for teams to scale their operations while maintaining precision, ultimately leading to improved model performance and a marked reduction in labeling time.

<a href="https://app.humansignal.com/b/3GPZnoeiwJZ2N4Wp_JFijmJKRcO9kkDK"
  target="_blank" rel="noopener" aria-label="Open in Label Studio" style="all:unset;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;border:1px solid rgb(109,135,241);padding:8px 12px;background:rgb(87 108 193);color:white;font-weight:500;font-family:sans-serif;gap:6px;transition:background 0.2s ease;" onmouseover="this.style.background='rgb(97 122 218)'" onmouseout="this.style.background='rgb(87 108 193)'">
  <svg style="width:20px;height:20px" viewBox="0 0 26 26" fill="none"><path fill="#FFBAAA" d="M3.5 4.5h19v18h-19z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M25.7 7.503h-7.087V5.147H7.588V2.792h11.025V.436H25.7v7.067Zm-18.112 0H5.225v10.994H2.863V7.503H.5V.436h7.088v7.067Zm0 18.061v-7.067H.5v7.067h7.088ZM25.7 18.497v7.067h-7.088v-2.356H7.588v-2.355h11.025v-2.356H25.7Zm-2.363 0V7.503h-2.363v10.994h2.363Z" fill="#FF7557"/></svg>
  <span style="font-size:14px">Open in Label Studio</span>
  <svg style="width:16px;height:16px" viewBox="0 0 24 24"><path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" fill="white"/></svg>
</a>

## Labeling configuration

```html
<View>
  <Image name="image" value="$image"/>
  <RectangleLabels name="label" toName="image">
    <Label value="Defect" background="red"/>
    <Label value="Wear" background="orange"/>
    <Label value="Contamination" background="yellow"/>
    <Label value="Scratch" background="blue"/>
    <Label value="Crack" background="purple"/>
  </RectangleLabels>
</View>
```

This labeling configuration includes rectangular bounding boxes to capture different types of quality control issues in the images. Use the labels to mark defects, wear, contaminations, scratches, or cracks found in the product images.
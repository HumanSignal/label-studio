---
title: Semantic Segmentation with Polygons for Medical Image Analysis
type: templates
hide_menu: true
category: Computer Vision
cat: computer-vision
order: 1103
meta_description: Template for using Label Studio to perform semantic segmentation with polygons.
---

![Screenshot of labeling interface](/images/templates-misc/polygon-medical.png)

Semantic segmentation with polygons in medical image analysis is essential for accurately identifying and delineating anatomical structures in complex images, such as tumors or organs, which directly impacts diagnostics and treatment planning. The AI model harnesses this data to automate the interpretation of medical images, enhancing both clinician efficiency and accuracy in patient care.

However, this process is often hampered by challenges such as time-intensive manual labeling, inconsistency across different annotators, and the necessity for specialized domain expertise. Label Studio tackles these obstacles through its AI-assisted pre-labeling capabilities, which significantly reduce the initial workload for teams by providing bounding boxes and suggested segmentation based on existing data. Combined with expert validation workflows, collaboration tools for annotator feedback, and highly customizable templates tailored for medical imaging, Label Studio ensures high quality and consistent labeled data, ultimately leading to improved model performance, reduced labeling time, and scalable workflows that adapt to the unique demands of the medical field.

<a href="https://app.humansignal.com/b/UnfwtztRV5jzDg1l0yN3UmfjU8oMOaZR"
  target="_blank" rel="noopener" aria-label="Open in Label Studio" style="all:unset;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;border:1px solid rgb(109,135,241);padding:8px 12px;background:rgb(87 108 193);color:white;font-weight:500;font-family:sans-serif;gap:6px;transition:background 0.2s ease;" onmouseover="this.style.background='rgb(97 122 218)'" onmouseout="this.style.background='rgb(87 108 193)'">
  <svg style="width:20px;height:20px" viewBox="0 0 26 26" fill="none"><path fill="#FFBAAA" d="M3.5 4.5h19v18h-19z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M25.7 7.503h-7.087V5.147H7.588V2.792h11.025V.436H25.7v7.067Zm-18.112 0H5.225v10.994H2.863V7.503H.5V.436h7.088v7.067Zm0 18.061v-7.067H.5v7.067h7.088ZM25.7 18.497v7.067h-7.088v-2.356H7.588v-2.355h11.025v-2.356H25.7Zm-2.363 0V7.503h-2.363v10.994h2.363Z" fill="#FF7557"/></svg>
  <span style="font-size:14px">Open in Label Studio</span>
  <svg style="width:16px;height:16px" viewBox="0 0 24 24"><path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" fill="white"/></svg>
</a>

## Labeling configuration

```html
<View>
  <Header value="Select tissue type and delineate the region on the medical image to start"/>
  <Image name="image" value="$image" zoom="true"/>
  <PolygonLabels name="label" toName="image"
                 strokeWidth="3" pointSize="small"
                 opacity="0.9">
    <Label value="Tumor" background="red"/>
    <Label value="Healthy Tissue" background="green"/>
    <Label value="Edema" background="yellow"/>
    <Label value="Necrosis" background="purple"/>
  </PolygonLabels>
</View>
```

This configuration allows annotators to select a tissue type and accurately delineate its boundaries directly on the medical image, enabling precise semantic segmentation of different anatomical and pathological regions.

All labeling configurations must be wrapped in <a href="https://labelstud.io/tags/view">View</a> tags.

You can add a <a href="https://labelstud.io/tags/header">header</a> to provide instructions to the annotator:

```xml
<Header value="Select tissue type and delineate the region on the medical image to start"/>
```

Use the <a href="https://labelstud.io/tags/image">Image</a> object tag to specify the medical imaging data and allow annotators to zoom the image:

```xml
<Image name="image" value="$image" zoom="true"/>
```

Use the <a href="https://labelstud.io/tags/polygonlabels">PolygonLabels</a> control tag to allow annotators to delineate polygonal regions corresponding to specific tissue types or pathological areas.

```xml
<PolygonLabels name="label" toName="image"
               strokeWidth="3" pointSize="small"
               opacity="0.9">
  <Label value="Tumor" background="red"/>
  <Label value="Healthy Tissue" background="green"/>
  <Label value="Edema" background="yellow"/>
  <Label value="Necrosis" background="purple"/>
</PolygonLabels>
```

Annotators can control the opacity of the polygons using the <code>opacity</code> argument, and the styling of the polygon tool using the <code>pointSize</code> and <code>strokeWidth</code> arguments. Use the <code>background</code> argument with the <a href="https://labelstud.io/tags/label">Label</a> control tag to assign distinct colors for each tissue or pathology label.


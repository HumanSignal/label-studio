---
title: Semantic Segmentation with Polygons for Sports Analytics
type: templates
hide_menu: true
category: Computer Vision
cat: computer-vision
order: 1103
meta_description: Template for using Label Studio to perform semantic segmentation with polygons.
---

![Screenshot of labeling interface](/images/templates-misc/sports-polygon.png)

In sports analytics, Semantic Segmentation with Polygons labeled data is crucial for enabling AI models to accurately analyze player movements, recognize formations, and provide real-time insights during games. This level of precision aids in tasks such as tactical analysis, injury prediction, and performance optimization, which are essential for teams aiming to stay competitive.

However, labeling this complex data presents significant challenges, including time-intensive manual efforts, inconsistencies in label quality due to varying annotator skill levels, and the necessity of domain expertise to achieve reliable results. Label Studio effectively addresses these issues through its advanced AI-assisted pre-labeling capabilities, which expedite the initial labeling process and reduce the workload on human annotators. Our platform also facilitates expert validation to ensure high-quality output and offers collaborative tools that enhance communication and feedback among team members. With customizable templates tailored to sports analytics, Label Studio not only streamlines the labeling workflow but also provides measurable benefits such as improved model performance, reduced labeling times, heightened expert efficiency, and scalable operations that adapt to the shifting demands of the sports industry.

<a href="https://app.humansignal.com/b/VOhtuWwNWW9_2UBZfrnQg0ykVmhex_My"
  target="_blank" rel="noopener" aria-label="Open in Label Studio" style="all:unset;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;border:1px solid rgb(109,135,241);padding:8px 12px;background:rgb(87 108 193);color:white;font-weight:500;font-family:sans-serif;gap:6px;transition:background 0.2s ease;" onmouseover="this.style.background='rgb(97 122 218)'" onmouseout="this.style.background='rgb(87 108 193)'">
  <svg style="width:20px;height:20px" viewBox="0 0 26 26" fill="none"><path fill="#FFBAAA" d="M3.5 4.5h19v18h-19z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M25.7 7.503h-7.087V5.147H7.588V2.792h11.025V.436H25.7v7.067Zm-18.112 0H5.225v10.994H2.863V7.503H.5V.436h7.088v7.067Zm0 18.061v-7.067H.5v7.067h7.088ZM25.7 18.497v7.067h-7.088v-2.356H7.588v-2.355h11.025v-2.356H25.7Zm-2.363 0V7.503h-2.363v10.994h2.363Z" fill="#FF7557"/></svg>
  <span style="font-size:14px">Open in Label Studio</span>
  <svg style="width:16px;height:16px" viewBox="0 0 24 24"><path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" fill="white"/></svg>
</a>

## Labeling configuration

```html
<View>
  <Header value="Select label and click the image to start"/>
  <Image name="image" value="$image" zoom="true"/>
  <PolygonLabels name="label" toName="image"
                 strokeWidth="3" pointSize="small"
                 opacity="0.9">
    <Label value="Player" background="red"/>
    <Label value="Referee" background="blue"/>
    <Label value="Coach" background="green"/>
    <Label value="Ball" background="orange"/>
    <Label value="Goalpost" background="purple"/>
  </PolygonLabels>
</View>
```

This configuration enables annotators to select a label and then click on the sports image to begin annotating. The template uses polygons to outline regions related to sports individuals and objects such as players, referees, and equipment on the field.

All labeling configurations must be enclosed within <a href="https://labelstud.io/tags/view">View</a> tags.

You can add a <a href="https://labelstud.io/tags/header">header</a> to provide instructions to the annotator:

```xml
<Header value="Select label and click the image to start"/>
```

Use the <a href="https://labelstud.io/tags/image">Image</a> object tag to specify the sports image data and allow annotators to zoom the image:

```xml
<Image name="image" value="$image" zoom="true"/>
```

Use the <a href="https://labelstud.io/tags/polygonlabels">PolygonLabels</a> control tag to allow annotators to create polygons for specific sports-related labels.

```xml
<PolygonLabels name="label" toName="image"
               strokeWidth="3" pointSize="small"
               opacity="0.9">
  <Label value="Player" background="red"/>
  <Label value="Referee" background="blue"/>
  <Label value="Coach" background="green"/>
  <Label value="Ball" background="orange"/>
  <Label value="Goalpost" background="purple"/>
</PolygonLabels>
```

Annotators can adjust the opacity of the polygons using the `opacity` argument, and style the polygon tool using the `pointSize` and `strokeWidth` arguments. Use the `background` argument with the <a href="https://labelstud.io/tags/label">Label</a> control tag to set the color for each polygon corresponding to different sports elements.
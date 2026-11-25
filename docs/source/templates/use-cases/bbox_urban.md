---
title: Object Detection with Bounding Boxes for Urban Planning
type: templates
hide_menu: true
category: Computer Vision
cat: computer-vision
order: 1103
meta_description: Template for using Label Studio to perform object detection with rectangular bounding boxes for urban planning.
---

![Screenshot of labeling interface](/images/templates-misc/urban.png)

Object Detection with Bounding Boxes is critical for AI in urban planning as it enables accurate identification and localization of features such as buildings, roads, and green spaces within urban environments. This labeled data is essential for tasks like infrastructure monitoring, resource allocation, and urban development planning, allowing municipalities to leverage AI for smarter decision-making.

However, labeling urban planning datasets presents several challenges, including the time-intensive nature of annotating large volumes of imagery, inconsistency in labels due to varying annotator standards, and the requirement for domain expertise to accurately interpret urban features. Label Studio effectively tackles these issues with its hybrid AI-assisted pre-labeling that accelerates the initial labeling process, while expert validation ensures high-quality output through consistent oversight. Additionally, our collaboration tools and customizable templates streamline the labeling workflow, enabling teams to work more efficiently and scale their efforts without compromising accuracy. By integrating these features, Label Studio significantly improves model performance, reduces labeling time, and enhances expert efficiency, ultimately driving better urban planning outcomes.

<a href="https://app.humansignal.com/b/ZUwV5LeVSIACZATfckwBMPTALiskjYwA"
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
    <Label value="Residential Zone" background="green"/>
    <Label value="Commercial Area" background="blue"/>
    <Label value="Public Park" background="orange"/>
    <Label value="Industrial Site" background="purple"/>
    <Label value="Transportation Hub" background="red"/>
  </RectangleLabels>
</View>
```

This labeling configuration is wrapped in `<View>` tags. It includes an `<Image>` tag specifying the image to label, and `<RectangleLabels>` tag defines bounding boxes with labels tailored for urban planning, such as residential zones and commercial areas, each assigned distinct colors.

```xml
<Image name="image" value="$image"/>
```
Use the `<Image>` tag to specify the urban planning map or satellite photo image that you want to annotate.

```xml
<RectangleLabels name="label" toName="image">
  <Label value="Residential Zone" background="green"/>
  <Label value="Commercial Area" background="blue"/>
  <Label value="Public Park" background="orange"/>
  <Label value="Industrial Site" background="purple"/>
  <Label value="Transportation Hub" background="red"/>
</RectangleLabels>
```
Use the `<RectangleLabels>` tag to add labeled rectangular bounding boxes relevant to urban planning, such as residential and commercial areas. Each `<Label>` tag controls the label's displayed text and bounding box color.

```html
<View visibleWhen="region-selected">
  <Header value="Describe area"/>
  <TextArea name="answer" toName="image" editable="true" 
            perRegion="true" required="true" placeholder="Enter description here..."/>
  <Choices name="choices" toName="image" perRegion="true">
    <Choice value="Planned"/>
    <Choice value="Under Construction"/>
    <Choice value="Existing"/>
    <Choice value="Restricted"/>
  </Choices>
</View>
```
This snippet adds per-region conditional labeling for urban planning objects with bounding boxes. The `<View>` tag with `visibleWhen="region-selected"` makes the description prompt visible only when a bounded area is selected. The `<Header>` gives instructions. The `<TextArea>` allows annotators to enter descriptions specific to the selected area, and the `<Choices>` provide status categories such as Planned, Under Construction, Existing, or Restricted.
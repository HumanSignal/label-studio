---
title: Object Detection with Bounding Boxes for Security Systems
type: templates
hide_menu: true
category: Computer Vision
cat: computer-vision
order: 1103
meta_description: Template for using Label Studio to perform object detection with rectangular bounding boxes for security systems.
---

![Screenshot of labeling interface](/images/templates-misc/security.png)

Object Detection with Bounding Boxes is crucial for AI in security systems as it enables real-time identification and localization of potential threats, such as intruders or unauthorized vehicles. This capability is essential for automating surveillance processes and enhancing the accuracy of threat detection, allowing security personnel to respond swiftly and effectively.

However, the data labeling process for object detection is often fraught with challenges, including time-intensive annotation tasks that can lead to inconsistencies, as well as the need for domain expertise to accurately identify and classify objects within the visual context. Label Studio effectively addresses these issues with its innovative hybrid AI-assisted pre-labeling feature, which significantly accelerates the annotation process by generating initial bounding box suggestions. Furthermore, our platform empowers expert reviewers to validate and refine these labels, ensuring high-quality, consistent results. With robust collaboration tools and customizable labeling templates tailored to the security domain, Label Studio not only streamlines workflows but also enhances expert efficiency and scalability, ultimately improving model performance while reducing the time required for data preparation.

<a href="https://app.humansignal.com/b/Fn3rgKpwdm4EI976J0AH8_Bjmg2yHxDt"
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
    <Label value="Intruder" background="red"/>
    <Label value="Suspicious Object" background="orange"/>
    <Label value="Authorized Personnel" background="green"/>
    <Label value="Security Vehicle" background="blue"/>
    <Label value="Restricted Area" background="purple"/>
  </RectangleLabels>
</View>
```

This configuration is wrapped inside <a href="https://labelstud.io/tags/view">View</a> tags.

Use the <a href="https://labelstud.io/tags/image">Image</a> element to specify the surveillance footage or camera snapshot to annotate:

```xml
<Image name="image" value="$image"/>
```

Use the <a href="https://labelstud.io/tags/rectanglelabels">RectangleLabels</a> tag to define labels and attach rectangular bounding boxes to the security image data. Use <a href="https://labelstud.io/tags/label">Label</a> tags to control the color coding for different security categories:

```xml
<RectangleLabels name="label" toName="image">
  <Label value="Intruder" background="red"/>
  <Label value="Suspicious Object" background="orange"/>
  <Label value="Authorized Personnel" background="green"/>
  <Label value="Security Vehicle" background="blue"/>
  <Label value="Restricted Area" background="purple"/>
</RectangleLabels>
```

If you want to add further context to object detection tasks with bounding boxes, you can include <strong>per-region</strong> conditional labeling parameters in your configuration to gather extra insights.

For example, to prompt analysts to add comments about detected security anomalies, you can add the following snippet:

```html
<View visibleWhen="region-selected">
  <Header value="Describe the security concern" />
  <TextArea name="description" toName="image" editable="true"
            perRegion="true" required="true" />
  <Choices name="status" toName="image"
           perRegion="true">
    <Choice value="Clear"/>
    <Choice value="Potential Threat"/>
    <Choice value="Confirmed Threat"/>
  </Choices>
</View>
```

The <code>visibleWhen</code> attribute ensures that the description prompt appears only when a bounding box is selected.

Once an analyst selects a box, the <a href="https://labelstud.io/tags/header">Header</a> provides instructions for describing the detected item.

The <a href="https://labelstud.io/tags/textarea">TextArea</a> control allows entry of textual notes per selected region, specified via <code>perRegion="true"</code>. You may also add a <code>placeholder</code> attribute for suggested text prompts.

Additionally, use the <a href="https://labelstud.io/tags/choices">Choices</a> tag with <code>perRegion</code> enabled to capture status assessments related to the bounding box content.

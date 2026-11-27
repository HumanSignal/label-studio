---
title: Object Detection with Bounding Boxes for Smart Home Devices
type: templates
hide_menu: true
category: Computer Vision
cat: computer-vision
order: 1103
meta_description: Template for using Label Studio to perform object detection with rectangular bounding boxes for smart home devices.
---

![Screenshot of labeling interface](/images/templates-misc/smart-home.png)

Object Detection with Bounding Boxes labeled data is essential for AI in smart home devices as it enables accurate identification and tracking of objects in real-time, facilitating tasks such as home security monitoring, automation of household appliances, and efficient energy management. Accurate labeling ensures that these models can differentiate between various items, ensuring reliable responses to user commands and interactions within the living environment.

One of the primary challenges in this domain lies in the time-intensive nature of labeling data, often exacerbated by inconsistencies in annotations and the need for domain expertise to understand intricate objects in diverse settings. Label Studio addresses these obstacles through a robust hybrid approach that combines AI-assisted pre-labeling with human expert validation. This allows for rapid initial labeling while ensuring high accuracy through review by subject matter experts. The platform’s collaboration tools enable efficient workflows, allowing teams to communicate seamlessly, and its customizable templates are specifically tailored for bounding box tasks, enhancing annotator efficiency and scalability. This results in a noticeable reduction in labeling time, improved model performance, and the capability to scale effortlessly as project demands grow.

<a href="https://app.humansignal.com/b/F9sAF6OFYqHnykfvCR39nocuVNQaAEzE"
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
    <Label value="Smart Thermostat" background="orange"/>
    <Label value="Security Camera" background="red"/>
    <Label value="Smart Light Bulb" background="yellow"/>
    <Label value="Smart Lock" background="blue"/>
    <Label value="Voice Assistant" background="green"/>
  </RectangleLabels>
</View>
```

This configuration defines rectangular bounding box labels that you can apply to images of smart home devices.

Each label corresponds to a specific type of smart home device and is assigned a distinct background color for easy identification on the image.

```json
{ 
  "x": 50,  # top left corner of the bounding box from 0 to 100% of the image width
  "y": 60,  # top left corner of the bounding box from 0 to 100% of the image height
  "width": 10,  # width of the bounding box from 0 to 100% of the image width
  "height": 20,  # height of the bounding box from 0 to 100% of the image height
  "rotation": 45  # rotation angle in degrees around the top left corner of the bounding box
}
```

When you rotate bounding boxes of smart home devices through the labeling interface's Info panel, the rotation anchor point is the top left corner of the rectangle, and this is how the rotation angle is stored in the annotation results.


```html
<View visibleWhen="region-selected">
  <Header value="Describe device"/>
  <TextArea name="description" toName="image" editable="true"
            perRegion="true" required="true" placeholder="Enter device details here..."/>
  <Choices name="status" toName="image"
           perRegion="true">
    <Choice value="Operational"/>
    <Choice value="Faulty"/>
    <Choice value="Needs Maintenance"/>
    <Choice value="Offline"/>
  </Choices>
</View>
```

This view makes the descriptive prompt appear only after a bounding box of a smart home device has been selected.

The Header provides instructions to the annotator to describe the detected device. The TextArea allows entering detailed notes per region, and the Choices enable selection of the device's operational status for each annotated bounding box.
```

```xml
<Image name="image" value="$image"/>
```

Use the Image tag to specify the smart home device image you want to annotate.

```xml
<RectangleLabels name="label" toName="image">
  <Label value="Smart Thermostat" background="orange"/>
  <Label value="Security Camera" background="red"/>
  <Label value="Smart Light Bulb" background="yellow"/>
  <Label value="Smart Lock" background="blue"/>
  <Label value="Voice Assistant" background="green"/>
</RectangleLabels>
```

Use the RectangleLabels tag to add bounding boxes with labels representing common smart home devices, assigning each a unique color to visually differentiate them in the image.

---
title: Object Detection with Bounding Boxes for Fashion Retail
type: templates
hide_menu: true
category: Computer Vision
cat: computer-vision
order: 1103
meta_description: Template for using Label Studio to perform object detection with rectangular bounding boxes for fashion retail.
---

![Screenshot of labeling interface](/images/templates-misc/fashion.png)

Object Detection with Bounding Boxes is essential for AI in fashion retail, enabling models to accurately identify and categorize various clothing items within images. By successfully detecting items, AI can significantly enhance tasks such as inventory management, visual search, and personalized recommendations, driving sales and improving customer experiences.

However, the data labeling process for fashion retail is fraught with challenges, including time-intensive labeling tasks, consistency issues across large datasets, and the necessity for domain expertise in fashion terminology and styles. Label Studio effectively addresses these challenges through its hybrid AI-assisted pre-labeling feature, which accelerates the initial labeling process and improves consistency. The platform also incorporates expert validation, ensuring that high-quality annotations are maintained. With collaboration tools that facilitate seamless teamwork between annotators and reviewers, and customizable templates specifically designed for fashion applications, Label Studio increases labeling efficiency and allows for scalable workflows, ultimately delivering higher model performance and faster time-to-market for fashion AI solutions.

<a href="https://app.humansignal.com/b/YC3sHPp22OEV7dKunIUdrw-oBaNRIJg3"
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
    <Label value="T-Shirt" background="coral"/>
    <Label value="Jeans" background="royalblue"/>
    <Label value="Jacket" background="seagreen"/>
    <Label value="Sneakers" background="orange"/>
    <Label value="Hat" background="purple"/>
  </RectangleLabels>
</View>
```
The labeling configuration must be enclosed in <a href="https://labelstud.io/tags/view">View</a> tags.

Use the <a href="https://labelstud.io/tags/image">Image</a> tag to specify the fashion image you want to label:

```xml
<Image name="image" value="$image"/>
```

Use the <a href="https://labelstud.io/tags/rectanglelabels">RectangleLabels</a> tag to add labels and rectangular bounding boxes to your fashion product images simultaneously. The <a href="https://labelstud.io/tags/label">Label</a> tag controls the color of each bounding box:

```xml
<RectangleLabels name="label" toName="image">
  <Label value="T-Shirt" background="coral"/>
  <Label value="Jeans" background="royalblue"/>
  <Label value="Jacket" background="seagreen"/>
  <Label value="Sneakers" background="orange"/>
  <Label value="Hat" background="purple"/>
</RectangleLabels>
```

If you rotate bounding boxes, the saved JSON indicates the rotation is around the top left corner, regardless of how the rotation was performed in the labeling interface:

```json
{
  "x": 50,  # top left corner of the bounding box from 0 to 100% of the image width
  "y": 60,  # top left corner of the bounding box from 0 to 100% of the image height
  "width": 10,  # width of the bounding box from 0 to 100% of the image width
  "height": 20,  # height of the bounding box from 0 to 100% of the image height
  "rotation": 45  # rotation angle in degrees around the top left corner of the bounding box
}
```

You can create rotated bounding boxes on fashion items with a three-point click:  
- First click sets the start location of the bounding box.  
- Second click defines the rotation angle and width.  
- Third click sets the height of the box.

This allows precise annotation of angled garments or accessories.

Below is a configuration example that lets annotators additionally describe each detected fashion item and specify its condition:

```html
<View visibleWhen="region-selected">
  <Header value="Describe the fashion item" />
  <TextArea name="description" toName="image" editable="true" perRegion="true" required="true" placeholder="Enter details about the clothing or accessory here..." />
  <Choices name="condition" toName="image" perRegion="true">
    <Choice value="New"/>
    <Choice value="Used"/>
    <Choice value="Defective"/>
  </Choices>
</View>
```
The <code>visibleWhen</code> attribute hides this panel until a bounding box is selected.

The <a href="https://labelstud.io/tags/header">Header</a> gives annotators clear instructions, the <a href="https://labelstud.io/tags/textarea">TextArea</a> collects descriptive details per bounding box, and the <a href="https://labelstud.io/tags/choices">Choices</a> tag captures the condition of the fashion product within the bounding box.
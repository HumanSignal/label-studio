---
title: Object Detection with Bounding Boxes for Smart Agriculture
type: templates
hide_menu: true
category: Computer Vision
cat: computer-vision
order: 1103
meta_description: Template for using Label Studio to perform object detection with rectangular bounding boxes for smart agriculture.
---

![Screenshot of labeling interface](/images/templates-misc/agriculture.png)

Object Detection with Bounding Boxes labeled data is vital for AI applications in smart agriculture, as it empowers models to accurately identify and track various crops, weeds, and pests in real-time. By facilitating tasks such as crop monitoring, yield prediction, and pest control, these AI models can significantly optimize agricultural practices and enhance productivity.

However, the data labeling process for this domain presents several challenges, including time-intensive annotation efforts, inconsistencies in labeling quality, and the need for domain expertise to ensure accuracy. Label Studio addresses these issues head-on through its innovative hybrid AI + human-in-the-loop approach. With AI-assisted pre-labeling, annotators can dramatically reduce their workload while maintaining high accuracy levels. The platform also includes customizable labeling templates tailored specifically to agricultural datasets, enabling efficient processing. Expert validation ensures that the final labels meet stringent quality standards, while collaboration tools streamline communication between teams, ultimately reducing labeling time and enhancing workflow scalability. By choosing Label Studio, organizations can improve model performance, save valuable resources, and confidently leverage AI to transform their agricultural practices.

<a href="https://app.humansignal.com/b/HRQTpAyi3y5lJPqVkCGWIlyxXh0hrsqu"
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
    <Label value="Corn Field" background="green"/>
    <Label value="Irrigation System" background="blue"/>
    <Label value="Drone Survey" background="orange"/>
    <Label value="Pest Infestation" background="red"/>
    <Label value="Soil Sampling Area" background="purple"/>
  </RectangleLabels>
</View>
```

All labeling configurations must be wrapped in <a href="https://labelstud.io/tags/view">View</a> tags.

Use the <a href="https://labelstud.io/tags/image">Image</a> object tag to specify the aerial or satellite imagery to label:

```xml
<Image name="image" value="$image"/>
```

Use the <a href="https://labelstud.io/tags/rectanglelabels">RectangleLabels</a> control tag to add labels and rectangular bounding boxes to your agricultural images at the same time. Use the <a href="https://labelstud.io/tags/label">Label</a> tag to control the color of the boxes:

```xml
<RectangleLabels name="label" toName="image">
  <Label value="Corn Field" background="green"/>
  <Label value="Irrigation System" background="blue"/>
  <Label value="Drone Survey" background="orange"/>
  <Label value="Pest Infestation" background="red"/>
  <Label value="Soil Sampling Area" background="purple"/>
</RectangleLabels>
```

If you want to add further context to object detection tasks with bounding boxes, you can add some <strong>per-region</strong> conditional labeling parameters to your labeling configuration.

For example, to prompt annotators to add descriptions to detected agricultural features, you can add the following to your labeling configuration:

```html
<View visibleWhen="region-selected">
  <Header value="Describe agricultural feature" />
  <TextArea name="description" toName="image" editable="true"
            perRegion="true" required="true" />
  <Choices name="health_status" toName="image"
           perRegion="true">
    <Choice value="Healthy"/>
    <Choice value="Diseased"/>
    <Choice value="Needs Irrigation"/>
    <Choice value="Harvest Ready"/>
  </Choices>
</View>
```

The <code>visibleWhen</code> parameter of the <a href="https://labelstud.io/tags/view">View</a> tag hides the description prompt from annotators until a bounding box is selected.

After the annotator selects a bounding box, the <a href="https://labelstud.io/tags/header">Header</a> appears and provides instructions to annotators.

The <a href="https://labelstud.io/tags/textarea">TextArea</a> control tag displays an editable text box that applies to the selected bounding box, specified with the <code>perRegion="true"</code> parameter.

In addition, you can prompt annotators to provide additional feedback about the content of the bounding box, such as the crop health status or irrigation condition inside the bounding box, using the <a href="https://labelstud.io/tags/choices">Choices</a> tag with the <code>perRegion</code> parameter.

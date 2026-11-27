---
title: Object Detection with Bounding Boxes for Medical Imaging
type: templates
hide_menu: true
category: Computer Vision
cat: computer-vision
order: 1103
meta_description: Template for using Label Studio to perform object detection with rectangular bounding boxes for medical imaging.
---

![Screenshot of labeling interface with medical image](/images/templates-misc/bbox-medical.png)

Object Detection with Bounding Boxes is critical in medical imaging as it enables AI models to accurately identify and localize abnormalities, such as tumors or lesions, in imaging scans like X-rays and MRIs. High-quality labeled data is necessary for training these models to perform tasks that directly influence diagnostic accuracy and treatment decisions.

However, the data labeling process in medical imaging is fraught with significant challenges, including the time-intensive nature of manual annotations, risks of inconsistency in labeling across different annotators, and the requirement for extensive domain expertise to ensure accuracy. Label Studio effectively addresses these challenges through a hybrid AI-assisted approach, leveraging pre-labeling capabilities to accelerate the initial labeling process while ensuring that specialized expert reviewers validate the annotations. The platform’s collaborative tools facilitate seamless communication among annotators and domain experts, and its customizable templates allow for tailored workflows that enhance labeling efficiency and scalability. By combining automation with human oversight, Label Studio not only reduces labeling time but also significantly improves the overall quality of the labeled data, leading to superior model performance in critical medical applications.

## Labeling interface 

```html
<View>
  <Image name="image" value="$image"/>
  <RectangleLabels name="label" toName="image">
    <Label value="Tumor" background="red"/>
    <Label value="Organ" background="blue"/>
    <Label value="Lesion" background="orange"/>
    <Label value="Calcification" background="yellow"/>
    <Label value="Nodule" background="green"/>
  </RectangleLabels>
</View>
```

All labeling configurations must be wrapped in <a href="https://labelstud.io/tags/view">View</a> tags.

Use the <a href="https://labelstud.io/tags/image">Image</a> object tag to specify the medical imaging scan to label:

```xml
<Image name="image" value="$image"/>
```

Use the <a href="https://labelstud.io/tags/rectanglelabels">RectangleLabels</a> control tag to add labels and rectangular bounding boxes to your medical images at the same time. Use the <a href="https://labelstud.io/tags/label">Label</a> tag to control the color of the boxes:

```xml
<RectangleLabels name="label" toName="image">
  <Label value="Tumor" background="red"/>
  <Label value="Organ" background="blue"/>
  <Label value="Lesion" background="orange"/>
  <Label value="Calcification" background="yellow"/>
  <Label value="Nodule" background="green"/>
</RectangleLabels>
```

If you want to add further context to object detection tasks with bounding boxes in medical imaging, you can add some <strong>per-region</strong> conditional labeling parameters to your labeling configuration.

For example, to prompt annotators to add descriptions to detected abnormalities, you can add the following to your labeling configuration:

```html
<View visibleWhen="region-selected">
  <Header value="Describe abnormality"/>
  <TextArea name="answer" toName="image" editable="true"
            perRegion="true" required="true" />
  <Choices name="choices" toName="image"
           perRegion="true">
    <Choice value="Benign"/>
    <Choice value="Malignant"/>
    <Choice value="Indeterminate"/>
  </Choices>
</View>
```

The <code>visibleWhen</code> parameter of the <a href="https://labelstud.io/tags/view">View</a> tag hides the description prompt from annotators until a bounding box is selected.

After the annotator selects a bounding box, the <a href="https://labelstud.io/tags/header">Header</a> appears and provides instructions to annotators.

The <a href="https://labelstud.io/tags/textarea">TextArea</a> control tag displays an editable text box that applies to the selected bounding box, specified with the <code>perRegion="true"</code> parameter. You can also add a <code>placeholder</code> parameter to provide suggested text to annotators.

In addition, you can prompt annotators to provide additional feedback about the content of the bounding box, such as the diagnostic status of the abnormality in the box, using the <a href="https://labelstud.io/tags/choices">Choices</a> tag with the <code>perRegion</code> parameter.

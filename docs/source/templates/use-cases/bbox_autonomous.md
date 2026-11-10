---
title: Object Detection with Bounding Boxes for Autonomous Vehicles
type: templates
hide_menu: true
category: Computer Vision
cat: computer-vision
order: 1103
meta_description: Template for using Label Studio to perform object detection with rectangular bounding boxes for autonomous vehicles.
---

![Screenshot of labeling interface](/images/templates-misc/autonomous-vehicles.png)

In the realm of autonomous vehicles, Object Detection with Bounding Boxes labeled data is critical for enabling AI models to accurately identify and categorize objects in real-time, such as pedestrians, cyclists, and traffic signs, ensuring safe navigation and decision-making. The precision of these labels directly influences the performance of the AI model, as any inaccuracies can lead to unsafe or suboptimal driving behaviors.

The challenges of labeling data in this domain are significant; the process is often time-intensive, prone to inconsistency, and requires specialized domain expertise to mitigate errors in classification. Label Studio tackles these challenges by integrating AI-assisted pre-labeling, which accelerates the initial annotation process and reduces the manual effort required. Once pre-labeled, expert validators can review and refine these annotations using our intuitive collaboration tools, ensuring high-quality, consistent labels. Additionally, our customizable templates allow teams to tailor the labeling interface to their specific requirements, increasing their workflow efficiency and scalability. With these features, organizations can significantly reduce labeling timelines, enhance expert productivity, and ultimately improve the overall reliability of their AI models, leading to safer autonomous driving solutions.

<a href="https://app.humansignal.com/b/yiTaMrxVEkdn_d3R4Tq8eUL0i6e5sPz1"
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
    <Label value="Pedestrian" background="orange"/>
    <Label value="Traffic Light" background="red"/>
    <Label value="Autonomous Car" background="blue"/>
    <Label value="Cyclist" background="green"/>
    <Label value="Road Sign" background="yellow"/>
  </RectangleLabels>
</View>
```

This labeling configuration wraps all necessary elements inside <a href="https://labelstud.io/tags/view">View</a> tags.

Use the <a href="https://labelstud.io/tags/image">Image</a> object tag here to specify the sensor data frame or image to annotate.

The <a href="https://labelstud.io/tags/rectanglelabels">RectangleLabels</a> tag allows you to add rectangular bounding boxes tied to your image frame and assign meaningful labels for autonomous vehicle perception tasks, such as pedestrians, traffic lights, vehicles, and other relevant objects. The <a href="https://labelstud.io/tags/label">Label</a> tag specifies the label name and the color used for bounding box visualization.

```json
{
  "x": 50,  # top left corner of the bounding box from 0 to 100% of the image width
  "y": 60,  # top left corner of the bounding box from 0 to 100% of the image height
  "width": 10,  # width of the bounding box from 0 to 100% of the image width
  "height": 20,  # height of the bounding box from 0 to 100% of the image height
  "rotation": 45  # rotation angle in degrees around the top left corner of the bounding box
}
```

When manually adjusting the bounding boxes for objects detected by autonomous vehicle perception systems, rotation angles are saved with reference to the top-left corner of the box in the resulting annotation data. Coordinates x and y represent the top-left corner, width and height are percentages relative to the image dimensions, and rotation specifies the angular orientation in degrees, which helps define the object's pose on the frame.

```html
<View visibleWhen="region-selected">
  <Header value="Describe detected object" />
  <TextArea name="answer" toName="image" editable="true"
            perRegion="true" required="true" placeholder="Add notes about object behavior or conditions..." />
  <Choices name="choices" toName="image"
           perRegion="true">
    <Choice value="Operational"/>
    <Choice value="Faulty"/>
    <Choice value="Occluded"/>
    <Choice value="Unknown"/>
  </Choices>
</View>
```

To enhance perception annotations, you can add a conditional element that prompts annotators to provide additional context or descriptions for detected objects when a bounding box is selected. The <code>visibleWhen</code> property ensures the description fields appear only after selection.

The <a href="https://labelstud.io/tags/header">Header</a> provides instructions, while the <a href="https://labelstud.io/tags/textarea">TextArea</a> enables annotators to add freeform notes related to detected objects, such as environmental conditions or unusual behaviors.

The <a href="https://labelstud.io/tags/choices">Choices</a> control lets annotators specify the operational status of the detected object, like whether it is functioning normally, occluded, or faulty, which is crucial for autonomous system training and validation.

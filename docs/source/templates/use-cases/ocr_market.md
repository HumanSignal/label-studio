---
title: Optical Character Recognition for Market Research Surveys
type: templates
hide_menu: true
category: Computer Vision
cat: computer-vision
order: 1103
meta_description: Template for using Label Studio to perform optical character recognition (OCR).
---

![Screenshot of labeling interface](/images/templates-misc/market-research.png)

In the realm of market research surveys, Optical Character Recognition (OCR) labeled data is essential for enabling AI models to efficiently extract and analyze textual insights from a vast array of unstructured survey responses. These models aim to automate sentiment analysis, trend identification, and customer feedback interpretation, directly affecting data-driven decision-making processes in business strategies.

However, the hurdles in this domain are significant; labeling large volumes of survey data is often time-intensive, leading to potential inconsistencies in labeling accuracy. Additionally, the necessity for domain expertise adds complexity, as annotators must not only accurately identify relevant text but also understand nuanced sentiment and intent. Label Studio effectively addresses these challenges through its hybrid AI + human-in-the-loop approach. The platform employs AI-assisted pre-labeling to accelerate initial data processing, while custom templates and review workflows streamline the annotation process. Moreover, built-in collaboration tools facilitate seamless communication among annotators and experts, ensuring that final labels meet high standards of accuracy and relevance, ultimately enhancing model performance and scalability.

<a href="https://app.humansignal.com/b/BMOqLI7lPh6uo_V20Eeqvd195ZSnxcKr"
  target="_blank" rel="noopener" aria-label="Open in Label Studio" style="all:unset;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;border:1px solid rgb(109,135,241);padding:8px 12px;background:rgb(87 108 193);color:white;font-weight:500;font-family:sans-serif;gap:6px;transition:background 0.2s ease;" onmouseover="this.style.background='rgb(97 122 218)'" onmouseout="this.style.background='rgb(87 108 193)'">
  <svg style="width:20px;height:20px" viewBox="0 0 26 26" fill="none"><path fill="#FFBAAA" d="M3.5 4.5h19v18h-19z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M25.7 7.503h-7.087V5.147H7.588V2.792h11.025V.436H25.7v7.067Zm-18.112 0H5.225v10.994H2.863V7.503H.5V.436h7.088v7.067Zm0 18.061v-7.067H.5v7.067h7.088ZM25.7 18.497v7.067h-7.088v-2.356H7.588v-2.355h11.025v-2.356H25.7Zm-2.363 0V7.503h-2.363v10.994h2.363Z" fill="#FF7557"/></svg>
  <span style="font-size:14px">Open in Label Studio</span>
  <svg style="width:16px;height:16px" viewBox="0 0 24 24"><path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" fill="white"/></svg>
</a>

## Labeling configuration

```html
<View>
  <Image name="image" value="$ocr"/>
  <Labels name="label" toName="image">
    <Label value="Customer Feedback" background="green"/>
    <Label value="Product Feature Mention" background="blue"/>
    <Label value="Competitor Reference" background="orange"/>
    <Label value="Pricing Comment" background="purple"/>
    <Label value="Service Satisfaction" background="red"/>
  </Labels>
  <Rectangle name="bbox" toName="image" strokeWidth="3"/>
  <Polygon name="poly" toName="image" strokeWidth="3"/>
  <TextArea name="transcription" toName="image"
            editable="true"
            perRegion="true"
            required="true"
            maxSubmissions="1"
            rows="5"
            placeholder="Transcribed Feedback Text"
            displayMode="region-list"
            />
</View>
```

This configuration performs text extraction tasks on survey response images using multiple shapes. Use this template to select areas with shapes and transcribe the corresponding survey feedback text from each region.

All market research survey text extraction configurations must be enclosed in <a href="https://labelstud.io/tags/view">View</a> tags.

Use the <a href="https://labelstud.io/tags/image">Image</a> object tag to specify the survey response image to annotate:

```xml
<Image name="image" value="$ocr"/>
```

Use the <a href="https://labelstud.io/tags/labels">Labels</a> tag to define which annotation categories are available for tagging the different regions in the survey images:

```xml
<Labels name="label" toName="image">
  <Label value="Customer Feedback" background="green"/>
  <Label value="Product Feature Mention" background="blue"/>
  <Label value="Competitor Reference" background="orange"/>
  <Label value="Pricing Comment" background="purple"/>
  <Label value="Service Satisfaction" background="red"/>
</Labels>
```

You can modify each <code>Label</code>'s <code>value</code> to assign specific survey-related text category labels like "Customer Feedback" or "Pricing Comment" to segments of the image.

Use the <a href="https://labelstud.io/tags/rectangle">Rectangle</a> tag to add unlabeled rectangular regions for annotation:

```xml
<Rectangle name="bbox" toName="image" strokeWidth="3"/>
```

Using the Rectangle tag (instead of RectangleLabels) allows annotators to first draw regions highlighting text areas, assign labels afterward, and then transcribe the text for each selected region. This workflow fits typical market research survey text transcription and facilitates pre-annotation.

Use the <a href="https://labelstud.io/tags/polygon">Polygon</a> tag to add unlabeled polygonal regions:

```xml
<Polygon name="poly" toName="image" strokeWidth="3"/>
```

The <code>strokeWidth</code> attribute controls the thickness of the polygon outline.

Use the <a href="https://labelstud.io/tags/textarea">TextArea</a> tag to add transcription input fields for each labeled region on the image, whether rectangular or polygonal:

```xml
<TextArea name="transcription" toName="image"
          editable="true"
          perRegion="true"
          required="true"
          maxSubmissions="1"
          rows="5"
          placeholder="Transcribed Feedback Text"
          displayMode="region-list"
          />
```

The <code>editable="true"</code> attribute lets annotators revise the transcribed text after submitting it. The <code>displayMode="region-list"</code> shows text areas linked with each region for easier updates. Setting <code>perRegion="true"</code> means each text box corresponds to a specific annotated area, and <code>required="true"</code> enforces text entry before submission. The <code>placeholder</code> sets example prompt text shown in the textbox before entry.
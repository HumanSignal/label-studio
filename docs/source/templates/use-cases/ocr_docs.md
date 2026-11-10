---
title: Optical Character Recognition for Document Digitization
type: templates
hide_menu: true
category: Computer Vision
cat: computer-vision
order: 1103
meta_description: Template for using Label Studio to perform optical character recognition (OCR).
---

![Screenshot of labeling interface](/images/templates-misc/doc-digitize.png)

Accurate Optical Character Recognition (OCR) labeled data is crucial for AI-driven document digitization, as it allows models to effectively convert a wide range of document formats into machine-readable text. High-quality labels empower AI to perform tasks such as text extraction, data classification, and information retrieval, enhancing efficiency across sectors from legal to healthcare.

The document digitization process faces significant challenges, including time-intensive manual labeling, inconsistent quality due to varying annotator skills, and the requirement for domain expertise to understand intricate terminologies. Label Studio tackles these issues head-on by leveraging its hybrid AI-assisted pre-labeling approach, which accelerates the labeling process and reduces the workload for annotators. Our platform enables seamless collaboration through intuitive annotation tools and robust workflow management, while our customizable templates cater specifically to your document types, ensuring that expert validation is integrated at every step. This results in measurable benefits, such as improved model performance, reduced labeling time, heightened expert efficiency, and scalable workflows that adapt to your evolving needs.

<a href="https://app.humansignal.com/b/JayFdANAQurypJWxaF_rfomAs2R979o8"
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
    <Label value="Printed Text" background="green"/>
    <Label value="Handwritten Notes" background="blue"/>
    <Label value="Stamp or Seal" background="orange"/>
    <Label value="Signature" background="purple"/>
  </Labels>
  <Rectangle name="bbox" toName="image" strokeWidth="3"/>
  <Polygon name="poly" toName="image" strokeWidth="3"/>
  <TextArea name="transcription" toName="image"
            editable="true"
            perRegion="true"
            required="true"
            maxSubmissions="1"
            rows="5"
            placeholder="Transcribed Text"
            displayMode="region-list"
            />
</View>
```

This labeling configuration allows you to perform optical character recognition (OCR) tasks on document images using multiple shapes. You can identify regions representing printed text, handwritten notes, stamps or seals, and signatures, then transcribe the text contained within each selected region.

```xml
<Image name="image" value="$ocr"/>
```

Use the `<Image>` tag to specify the document image that requires text region annotation and transcription.

```xml
<Labels name="label" toName="image">
  <Label value="Printed Text" background="green"/>
  <Label value="Handwritten Notes" background="blue"/>
  <Label value="Stamp or Seal" background="orange"/>
  <Label value="Signature" background="purple"/>
</Labels>
```

The `<Labels>` tag defines the types of text-related regions you can apply to the shapes created on the document image, such as distinguishing between printed text, handwriting, stamps, and signatures.

```xml
<Rectangle name="bbox" toName="image" strokeWidth="3"/>
```

The `<Rectangle>` tag enables annotators to draw bounding boxes around areas of interest on the document image where text appears.

```xml
<Polygon name="poly" toName="image" strokeWidth="3"/>
```

The `<Polygon>` tag facilitates more precise delineation of text regions by allowing annotators to outline irregularly shaped areas on the document image.

```xml
<TextArea name="transcription" toName="image"
          editable="true"
          perRegion="true"
          required="true"
          maxSubmissions="1"
          rows="5"
          placeholder="Transcribed Text"
          displayMode="region-list"
/>
```

The `<TextArea>` tag provides editable fields where annotators input the recognized or transcribed text for each labeled region. Setting `editable="true"` permits corrections after submission, `perRegion="true"` links the transcription to specific regions, and `required="true"` ensures no transcription is left blank before task submission.

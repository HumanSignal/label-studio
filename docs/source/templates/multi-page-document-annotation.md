---
title: Multi-Page Document Annotation
type: templates
category: Computer Vision
cat: computer-vision
order: 128
meta_title: Multi-page Document Annotation 
meta_description: Template for labeling large, multi-page documents more easily and efficiently.
---

<img src="/images/templates/multipage.png" alt="" class="gif-border" />

Multi-page document annotation allows you to annotate documents that consist of multiple pages. By representing each page as an image, you can import them into a single task and annotate each page while maintaining the context of the entire document.

If you just need to classify a PDF document as a whole, you can also use the [PDF Classification template](pdf_classification).

!!! error Enterprise
    If you are performing OCR annotation and you are a Label Studio Enterprise users, see [OCR Labeling for PDFs](pdf_ocr).

<a href="https://app.humansignal.com/b/MTk4"
  target="_blank" rel="noopener" aria-label="Open in Label Studio" style="all:unset;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;border:1px solid rgb(109,135,241);padding:8px 12px;background:rgb(87 108 193);color:white;font-weight:500;font-family:sans-serif;gap:6px;transition:background 0.2s ease;" onmouseover="this.style.background='rgb(97 122 218)'" onmouseout="this.style.background='rgb(87 108 193)'">
  <svg style="width:20px;height:20px" viewBox="0 0 26 26" fill="none"><path fill="none" d="M3.5 4.5h19v18h-19z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M25.7 7.503h-7.087V5.147H7.588V2.792h11.025V.436H25.7v7.067Zm-18.112 0H5.225v10.994H2.863V7.503H.5V.436h7.088v7.067Zm0 18.061v-7.067H.5v7.067h7.088ZM25.7 18.497v7.067h-7.088v-2.356H7.588v-2.355h11.025v-2.356H25.7Zm-2.363 0V7.503h-2.363v10.994h2.363Z" fill="white"/></svg>
  <span style="font-size:14px">Open in Label Studio</span>
  <svg style="width:16px;height:16px" viewBox="0 0 24 24"><path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" fill="white"/></svg>
</a>

## Prerequisites

Multi-page document annotation requires that you first pre-process your document by converting it into separate images. There are multiple tools to do this, including a built-in option in [Adobe Acrobat](https://helpx.adobe.com/acrobat/using/pdf-to-jpg.html). 

To improve performance, we preload images by downloading an image via XHR and storing it in the local browser’s storage. For this to function properly, you must set up a CORS policy on the CDN/storage where the images are located. Specifically, the following headers must be set:

```
Access-Control-Allow-Origin: https://app.humansignal.com
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## Limitations 

For performance reasons, we recommend that the maximum number of tasks per project be limited to around 100,000. 

If you are creating tasks with multiple images, you may need to plan for a smaller task limit within each project. For example, a task with 100 images would be roughly equivalent to 100 tasks (in terms of performance considerations).

## Page navigation

When performing multi-page annotations, you'll see a new navigation menu:

![Multi-page navigation](../images/templates-misc/multipage_nav2.png)

!!! info Tip
    * To navigate to a specific page, click on the page numbers in the center and enter the desired page. 
    * You can also use the following hot keys to navigate: `command + left`/`command + right` or `ctrl + left`/`ctrl + right`.


## Labeling configuration

Enable multi-page annotation by using the `<Image>` tag and setting the `valueList` parameter instead of the `value` parameter.  

```xml
<View>
  <RectangleLabels name="rectangles" toName="pdf" showInline="true">
    <Label value="Title" background="red"/>
    <Label value="Summary" background="blue"/>
    <Label value="Author" background="green"/>
    <Label value="Table" background="gold"/>
    <Label value="Citation" background="purple"/>
  </RectangleLabels>
  <Image valueList="$pages" name="pdf"/>
</View>
```

Similar to `value`, the `valueList` parameter accepts a variable. The difference in this case is that you are referencing an array in your JSON.

For example, the following references `pages` in the [example input data](#Input-data-format) below. 

```xml
<Image valueList="$pages" name="pdf"/>
```

!!! note Classification 
    This example uses bounding box labeling. However, you can modify the template to perform classification tasks instead (using the [`Choices` tag](/tags/choices)). When using the `Choices` tag, note the following:
    
    * You can perform per-page classification using `perItem="true"`. 
    * You can also leave `perItem="false"` (the default) to perform per-document classification.
    * `perRegion="true"` is supported when drawing regions on pages. 

## Input data format

The following example would upload a 5-page PDF that had been pre-processed into 5 images. You would reference the pages in your labeling configuration using `valueList="$pages"`.

```json
{
	"data": {
		"pages": [
			"https://htx-pub.s3.amazonaws.com/demo/images/demo_stock_purchase_agreement/0001.jpg",
			"https://htx-pub.s3.amazonaws.com/demo/images/demo_stock_purchase_agreement/0002.jpg",
			"https://htx-pub.s3.amazonaws.com/demo/images/demo_stock_purchase_agreement/0003.jpg"
		]
	}
}
```

## Export format

When exporting your annotations, the `item_index` property returns the index of the image that a region is attached to. Indexes start with 0,  meaning the first image will be `0`, the second will be `1`, and so on:

```json
[
  {
    "id": 859,
    "annotations": [
      {
        "id": 25569355,
        "result": [
          {
            "id": "tdS8Of63VJ",
            "type": "rectanglelabels",
            "value": {
              "x": 2.48868778280543,
              "y": 4.807692307692308,
              "width": 52.88461538461539,
              "height": 5.128205128205128,
              "rotation": 0,
              "rectanglelabels": [
                "Title"
              ]
            },
            "origin": "manual",
            "to_name": "pdf",
            "from_name": "choices",
            "item_index": 0,
            "image_rotation": 0,
            "original_width": 2550,
            "original_height": 3300
          },
          {
            "id": "RGGrHm95R7",
            "type": "rectanglelabels",
            "value": {
              "x": 30.693815987933636,
              "y": 12.179487179487179,
              "width": 58.4841628959276,
              "height": 1.2820512820512828,
              "rotation": 0,
              "rectanglelabels": [
                "Citation"
              ]
            },
            "origin": "manual",
            "to_name": "pdf",
            "from_name": "choices",
            "item_index": 1,
            "image_rotation": 0,
            "original_width": 2550,
            "original_height": 3300
          }
        ]
      }
    ]
  }
]

```

## Related tags
- [Image](/tags/image)
- [Label](/tags/label)
- [RectangleLabels](/tags/rectanglelabels)

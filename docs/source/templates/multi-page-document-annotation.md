---
title: Multi-page Document Annotation 

category: Computer Vision
cat: computer-vision
badge: <i class='ent'></i>
order: 112
is_new: t
meta_title: Multi-page Document Annotation 
meta_description: Template for labeling large, multi-page documents more easily and efficiently.
---

With Label Studio Enterprise, the multi-page document annotation feature allows you to label large multi-page documents more easily and efficiently. You can now upload hundreds of pages as a single document, allowing navigation and annotation on multiple pages while maintaining the entire document's context. This release eliminates the significant amount of lag in loading the images into the browser and enhances the labeling speed.


## Prerequisites

The prerequisites to use the multi-page document annotation detection feature are as follows:

1. Before uploading a PDF document to Label Studio, you must pre-process the document by converting it into separate images. However, you can still annotate PDF documents directly, for example, by performing [classification on each document page](/templates/pdf_classification.html).
2. In Label Studio, import all the images into the browser using the following format:
```json
[{
  "data": {
    "pages": [{
      "image": "image-1-url"
    }, {
      "image": "image-2-url"
    }, {
      "image": "image-3-url"
    }]
  }
}]
```
3. Now, check if the projects using **Repeater** tag is paginated.


## Key capabilities supported 

The following key capabilities are supported by the multi-page document annotation.

1. Support one image per screen or one text per screen. This can include a large text, but it should be the only document that requires annotation. In several scenarios, there is a need to annotate multi-page documents. For example, when you have PDF documents that consist of multiple pages then you must annotate the whole document as one task. This implies the annotator receives this one multi-page document for annotation.

2. Use Hot-key driven annotation using the left arrow key to move upwards and the right arrow key to move downwards in a multi-page document.

3. Introduce API driven process to customize the pagination in a multi-page document.

4. Help companies and organizations that deal with large, complex documents, including extensive research papers and healthcare, legal, or financial documents that run between dozens and hundreds of pages long.


## Labeling configuration

The simplest way to work with multi-page document annotation is to go in [project settings](/guide/setup.html#Modify-the-labeling-interface) and specify the following labeling configuration.

```html
<View>
  <Repeater on="$images" indexFlag="{{idx}}" mode="pagination">
    <Image name="page_{{idx}}" value="$images[{{idx}}].url"/>
    <Header value="Utterance Review"/>
    <RectangleLabels name="labels_{{idx}}" toName="page_{{idx}}">
      <Label value="Document Title" />
      <Label value="Document Date" />
    </RectangleLabels>
    <Taxonomy 
              name="categories_{{idx}}"
              toName="page_{{idx}}"
              perRegion="true"
              visibleWhen="region-selected"
              >
    <Choices name="utterance_action_{{idx}}" showInline="true" toName="user_{{idx}}">
      <Choice value="Archaea"/>
      <Choice value="Bacteria"/>
      <Choice value="Eukarya">
        <Choice value="Human"/>
        <Choice value="Oppossum"/>
        <Choice value="Extraterrestrial"/>
      </Choices>
  </Taxonomy>
  </Repeater>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

You can add a [header](/tags/header.html) tag to provide instructions to the annotator:
```xml
<Header>Label the video:</Header>
```

Use the [Choices](/tags/choices.html) tag to create a group of choices, with radio buttons, or checkboxes.

```xml
 <Choices name="utterance_action_{{idx}}" showInline="true" toName="user_{{idx}}">
 ```


## Label Studio UI enhancements

The multi-page document annotation feature includes the following UI enhancements:

1. Ability to add `<Repeater mode="pagination" ...>` parameter in the **Repeater** tab labeling configuration. 

2. A pagination box that appears on every page (in a multi-page document) that allows quick navigation to the first page, last page, or specific page efficiently.

3. An option to use **Outliner** for scrolling from one page to another in a multi-page document.


## Use cases
The multi-page document annotation feature provides the following use cases: 

### Draw bounding boxes 

To draw bounding boxes over some specific elements inside a multi-page (100 pages) PDF document:

1. Convert the PDF document into 100 images because as per this example, there are 100 pages in a PDF document. 
2. Store the images to create a task (with 100 images). 
3. Import data as JSON tasks with the list of 100 images.
4. When the interface is loaded with 100 images, you can draw bounding boxes inside the images. You can also use the **Repeater** tag with pagination to navigate back and forth throughout these multi-page documents and annotate images. 

<img src="../images/draw-bb-multipage-document-annotation.png" class="gif-border" />

<i>Figure 1: Use bounding boxes. </i>

### Page scroll

By default, the multi-page document annotation did not support pagination as shown in Figure 2.

<img src="../images/without-pagination-option.png" class="gif-border" />

<i>Figure 2: Without pagination. </i>

To find a page or a specific page number, use your mouse pad to scroll down the multi-page document.


### Page navigation control

You can use `mode` property to the **Repeater** tag and the multi-page document annotation with pagination capability to annotate multiple pages in a single document:

1. In the Label Studio UI, navigate to **Settings** >> **Labeling Interface** >> **Code**. 

<img src="../images/add-mode-pagination-location.png" class="gif-border" />

<i>Figure 3: Location to add mode pagination. </i>


2. Add **mode="pagination"** inside the **Repeater** tag.

<img src="../images/add-mode-pagination.png" class="gif-border" />

<i>Figure 4: Added mode property. </i>

3. Now, return to the previous screen and click on the task.

<img src="../images/return-back-to-the same-project.png" class="gif-border" />

<i>Figure 5: Return to the previous screen. </i>

4. The pagination feature is available in the UI preview window.

<img src="../images/with-pagination-option.png" class="gif-border" />

<i>Figure 6: Pagination option in the UI preview. </i>

5. The pagination option is now available on every page of the multi-page document.
<img src="../images/pagination-option-on-each-page.png" class="gif-border" />

<i>Figure 7: Pagination option on every page. </i>


To find a page or a specific page number, use the navigation buttons in the pagination box. 

1. Click the `<<` button to navigate to the first page and click the `<` button to navigate to the  previous page in a multi-page document.

<img src="../images/button-to-navigate-to-first-page.png" class="gif-border" />

<i>Figure 11: Button to navigate to the first page. </i>


View of the first page using the navigation button.
<img src="../images/navigate-to-first-page.png" class="gif-border" />

<i>Figure 12: Navigated to the first page. </i>


2. Click the `>>` button to navigate to the last page and click the `>` button to navigate to the next page in a multi-page document.

<img src="../images/button-to-navigate-to-last-page.png" class="gif-border" />

<i>Figure 13: Button to navigate to the last page. </i>

View of the last page using the navigation button.
<img src="../images/navigate-to-last-page.png" class="gif-border" />

<i>Figure 14: Navigated to the first page. </i>


### Page navigation with Outliner

To find a page or a specific page number, use the outliner feature. 

Example of using outliner document title:

<img src="../images/navigate-to-pages-using-outliner-document-title.png" class="gif-border" />
<i>Figure 9: Navigate using outliner document title. </i>


## Related tags
- [Choices](/tags/choices.html)
- [Labels](/tags/labels.html)
- [RectangleLabels](/tags/rectanglelabels.html)

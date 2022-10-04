---
title: Multi-page Document Annotation 
type: templates
category: Natural Language Processing
cat: natural-language-processing
badge: <i class='ent'></i>
order: 208
is_new: t
meta_title: Multi-page Document Annotation 
meta_description: Template for labeling large, multi-page documents more easily and efficiently.
---

With Label Studio Enterprise, the multi-page document annotation feature allows you to label large multi-page documents more easily and efficiently. You can now upload hundreds of pages as a single document, allowing navigation and annotation on multiple pages while maintaining the entire document's context. This release eliminates the significant amount of lag in loading the images into the browser and enhances the labeling speed.


## Prerequisites

The prerequisites to use the multi-page document annotation detection feature are as follows:

1. Before uploading a PDF document to Label Studio, you must pre-process the document by converting it into separate images. 
2. In Label Studio, import all the images into the browser using the following format:
```html
[{
  "data": {
    "pages": [{
      "image": "image-1-url",
    }, {
      "image": "image-2-url",
    }, {
      "image": "image-3-url",
    }]
  }
}]
```
3. Now, check if the projects using **Repeater** tag is paginated.

!!! attention "important"
    
    1. The **Repeater** tag does not process the uploaded PDF document. You must explicitly convert it to images and then upload it to Label Studio in PDF format.
    
    2. You can also upload the PDF document and split it into multiple images by pages and work with separate pages using the **Repeater** tag.

    3. The PDF document is treated as an image.


## Key capabilities supported 

The following key capabilities are supported by the multi-page document annotation.

1. Support one image per screen or one text per screen. This can include a large text, but it should be the only document that requires annotation. In several scenarios, there is a need to annotate multi-page documents. For example, when you have PDF documents that consist of multiple pages then you must annotate the whole document as one task. This implies the annotator receives this one multi-page document for annotation.

2. Use Hot-key driven annotation using the left arrow key to move upwards and the right arrow key to move downwards in a multi-page document.

3. Introduce API driven process to customize the pagination in a multi-page document.

4. Provide cross-pagination annotation. 

5. Help companies and organizations that deal with large, complex documents, including extensive research papers and healthcare, legal, or financial documents that run between dozens and hundreds of pages long.


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
        <Choice value="Extraterrestial"/>
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

Use the [Repeater](/tags/repeater.html) tag to annotate multiple data objects in a dynamic range with the same semantics. You can loop through data items in a python-like `for` cycle in the labeling process.
It repeats tags inside it for every item in a given data array from your dataset. All the occurrences of `indexFlag` (default is `{{idx}}`) in parameter values will be replaced by the current index.
Names should always be unique, so you can use this placeholder in tag names. The **Repeater** tag supports the `mode` property. This creates the possibility to enable pagination in **Repeater** for performance improvement. You can add a parameter `<Repeater mode="pagination" ...>` to show only one page at a time, shrinking memory used to one tag set.

```xml
<Repeater on="$images" indexFlag="{{idx}}" mode="pagination">
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

### Use Repeater tag 
Prior to this release, the multi-page document annotation did not support pagination as shown in Figure 2.

<img src="../images/without-pagination-option.png" class="gif-border" />

<i>Figure 2: Without pagination. </i>

Starting with this release, you can use the **Repeater** tag and the multi-page document annotation with pagination capability to annotate multiple pages in a single document.

!!! note
    When you upload multiple images by pages, the browser takes a few seconds to load the pages.
  
#### Add `mode` property

To add `mode` property to the **Repeater** tag:

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

### Navigate to a page

Annotators can navigate to a page or specific page number in a multi-page document by using one of the following options: 

1. [Use the mouse pad to scroll](#use-the-mouse-pad-to-scroll).
2. [Use the outliner feature](#use-the-outliner-feature).
3. [Use the navigation buttons](#use-the-navigation-buttons).

<img src="../images/specific-page-from-the-whole-document.png" class="gif-border" />

<i>Figure 8: Navigate to page number 140. </i>

#### 1. Use the mouse pad to scroll

To find a page or a specific page number, use your mouse pad to scroll down the multi-page document. 

#### 2. Use the outliner feature

To find a page or a specific page number, use the outliner feature. 

Example of using outliner document title
<img src="../images/navigate-to-pages-using-outliner-document-title.png" class="gif-border" />

<i>Figure 9: Navigate using outliner document title. </i>

Example of using outliner document date
<img src="../images/navigate-to-pages-using-outliner-document-date.png" class="gif-border" />

<i>Figure 10: Navigate using outliner document date. </i>

#### 3. Use navigation buttons 

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


### Cross page annotation

!!! attention "warning"
    The multi-page document annotation feature does not support annotation of two pages on a single page.


You can annotate overflowed text between two pages, which means you can annotate two parts of a sentence that flow from one page to the other. For example, if a sentence overflows from page 19 to page 20 then you can annotate the two parts of the sentence separately (between these two pages) by building a relationship between them. This will be outlined in the exported data. 

Right-click on the page and select **Inspect**
<img src="../images/annotate-two-parts-of-sentence-inspect.png" class="gif-border" />

<i>Figure 15: Select **Inspect** option. </i>

Build the relation.
<img src="../images/inspect-performance.png" class="gif-border" />

<i>Figure 16: Select **Performance** option. </i>

Adjust the settings.
<img src="../images/performance-application.png" class="gif-border" />

<i>Figure 17: Select **Application** option. </i>

Assign a repeater value for the page.
<img src="../images/repeater-value-page2.png" class="gif-border" />

<i>Figure 18: Assign a repeater value. </i>

View the exported data.
<img src="../images/exported-data.png" class="gif-border" />

<i>Figure 19: Exported data. </i>


## Related tags
- [Choices](/tags/choices.html)
- [Labels](/tags/labels.html)
- [RectangleLabels](/tags/rectanglelabels.html)
- [Repeater](/tags/repeater.html)

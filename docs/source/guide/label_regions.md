---
title: Label regions
short: Label regions
tier: all
type: guide
order: 212
order_enterprise: 112
meta_title: Label regions
meta_description: How to work with regions when annotating data
section: "Labeling"
parent: "labeling"
parent_enterprise: "labeling"
date: 2024-03-07 11:49:24
---

A region is an area within the data that you as identify as an annotator. For example, this can be a box you draw on an image, a section of highlighted text, a video segment, and more. 

## Label a region in the data

1. Select the label you want to apply to the region. For some configurations, you can skip this step.
2. Depending on how the labeling interface has been configured, you may need to select a tool to begin. Hover over the toolbar to the right of the labeling interface to see your options. 
3. Click the text, image, audio, or other data object to apply the label to the region. Your changes save automatically. 
4. Click **Submit** to submit the completed annotation and move on to the next task.

The following video demonstrates various regions being added to an image:


<video src="../images/label/regions.mp4" controls="controls" style="max-width: 800px;" class="gif-border" />

## Label overlapping regions

When you label with bounding boxes and other image segmentation tasks, or when you're highlighting text for NLP and NER labeling, you might want to label overlapping regions. To do this easily, hide labeled regions after you annotate them. 

In the [**Regions** panel](label_panels#Regions-panel), locate and select the region that you labeled and click the eye icon to hide the region. While the region is hidden, you can add your overlapping region. 

## Select multiple regions

Press `ctrl` while selecting regions in the labeling interface or while selecting regions in the [**Regions** panel](label_panels#Regions-panel). 

To deselect a region, click it again or press `u`. 

## Duplicate regions

You can duplicate a region to create many identically-sized polygons, rectangles, or ellipses. 

1. Select the region that you want to duplicate.
2. Press `ctrl + d` to duplicate the region, or the sequence of `ctrl + c` and `ctrl + v` to copy and paste the region. Duplicated regions appear in the exact location as the region being duplicated. If you're using a Mac keyboard, use `cmd` instead of `ctrl`. 
3. Click the arrow tool, then move and resize the newly-created region.

## Change the label for a region

You can change the label of an existing region. 

1. Select the labeled region, for example a span, bounding box, image segment, audio region, or other region, on the object or using the **Regions** panel.
2. Select a new label. Your changes to the label save automatically. 
3. Click **Submit** to submit the completed annotation and move on to the next task.


## Erase brush mask regions

If you make a mistake when labeling with the brush mask, you can erase it. You must select a brush region in the sidebar before you can erase any part of it. 

If you want to completely remove a region and start over, delete the region instead of erasing it. Erasing a region does not delete it. 

## Add relations between regions

You can create a relation to connect two regions. 

To add labels to relation, you must set up a labeling config with the relations tag. See more about [relations with labels](/tags/relations.html).

1. Select a region so that its information is displayed in the [**Info** panel](label_panels#Info-panel).  
2. Click **Create relation between regions** in the **Info** panel. 
3. Select the second region.


After you add a relation between two regions, you can modify the relation in the [**Relations** panel](label_panels#Relations-panel). 
- To change the direction of the relation, click the arrow icon between the two related regions.
- To add labels to the direction arrow indicating the relation between two annotations, click the vertical ellipsis button next to the two related regions to add your predefined labels. You must have a [label configuration that includes relations](/tags/relations.html) to do this.

<video src="../images/label/relations.mp4" controls="controls" style="max-width: 800px;" class="gif-border" />

## Delete a region 

An annotation can comprise multiple regions, and you can delete regions as needed. 

1. Select the region by clicking on it or by selecting it in the **Regions** panel. 
2. Press `Backspace` or go to the **Info** panel and click the delete icon for the selected region.

![Screenshot of Delete action for region](/images/label/region_delete.png)
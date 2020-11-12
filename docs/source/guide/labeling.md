---
title: Labeling Interface
type: guide
order: 705
---

Let's explore the complex example of multi-task labeling which includes text + image + audio data objects:
<br>

<img src="/images/labeling.png">

* Labeling interface is implemented using JavaScript + React and placed to separated repository [Label Studio Frontend](https://github.com/heartexlabs/label-studio-frontend). Label Studio has integrated Label Studio Frontend build. 

* Labeling interface is highly configurable: you can enable or disable some parts of it (completions panel, predictions panel, results panel, controls, submit & skip buttons).  


## Instructions

Most of the actions described in this section are similar for all the data objects (images, audio, text, etc.).

### Choices, TextArea and other simple tags
Such tags have straightforward labeling mechanics. It’s intuitive for users, so let’s talk about more complex things below. 

### Add region
1. Select label you want to add (if you use Tag without labels like Polygon, just go to 2)
2. Click on your data object (image, audio, text, etc) 

### Change label
You can change the label of the existing region:
1. Select entity (span, bounding box, image segment, audio region, etc)
2. Select a new label

### Delete entity
1. Select entity 
2. Press Backspace or go to Results panel and remove selected item 

### Add relation

You can create relations between two results with  
 * direction 
 * and labels ([read more about relations with labels](/tags/relations.html))

<br>
<img src="/images/screens/relations.png">

1. Select a first region (bounding box, text span, etc)
2. Click on "Create Relation" button
3. Select the second region
4. **Optionally**: After the relation is created you can change the direction by click on the direction button
4. **Optionally**: [If you've configured labels](/tags/relations.html), click on the triple dots button and add your predefined labels

## Hotkeys
Use hotkeys to improve your labeling performance. Hotkeys help is available in the labeling settings dialog.

<table>
<tr><th>Key</th><th>Description</th></tr>
<tr><td>ctrl+enter</td><td>Submit a task</td></tr>
<tr><td>ctrl+backspace</td><td>Delete all regions</td></tr>
<tr><td>escape</td><td>Exit relation mode</td></tr>
<tr><td>backspace</td><td>Delete selected region</td></tr>
<tr><td>alt+shift+$n</td><td>Select a region</td></tr>
</table>

	
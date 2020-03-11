---
title: Labeling
type: guide
order: 103
---

## Labeling interface
Let's explore the complex example of multi-task labeling which includes text + image + audio data objects:
<br>

<img src="/images/labeling.png">

* Labeling interface is implemented using JavaScript + React and placed to separated repository [Label Studio Frontend](https://github.com/heartexlabs/label-studio-frontend). Label Studio has integrated Label Studio Frontend build. 

* Labeling interface is highly configurable: you can enable or disable some parts of it (completions panel, predictions panel, results panel, controls, submit & skip buttons).  

## Key concepts

Here you can see relations among labeling objects: tasks, completions, results, etc.

One completion is provided by one user, it's atomic and it consists of the result items. Result items can have relations between themselves with specified direction of three types: left-right, right-left or bidirectional. Normalizations are additional information in the custom string format about the current result item.  
<br>
<center><img src="/images/labeling-scheme.png" style="max-width: 600px; opacity: 0.6"></center>
<br>
Completions and Predictions are very similar. But predictions must be generated automatically by ML models.   

## Instructions

The most of actions described in this section are similar for all the data objects (images, audio, text, etc).

### Choices, TextArea and other simple tags
Such tags have a very simple labeling mechanics, it's intuitive for users, so let's talk about more complex things :-)     

### Add segment
1. Select label you want to add (if you use Tag without labels like Polygon, just go to 2)
2. Click on your data object (image, audio, text, etc) 

### Change label
You can change the label of existing result item: 
1. Select result item (span, bounding box, segment, region, etc)
2. Select a new label

### Delete result item
1. Select result item
2. Press Backspace or go to Results panel and remove the current item 

### Add relation
1. Select the first result item (on data object or on Results panel)
2. Click on "Create Relation" button
3. Select the second result item (on data object **only**)
4. Optionally: After the relation is created you can change the direction by click on the direction button  

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

	
---
title: Custom script examples
short: Custom script examples
tier: enterprise
type: guide
order: 0
order_enterprise: 109
section: "Create & Manage Projects"
parent: "scripts"
parent_enterprise: "scripts"
date: 2024-07-30 13:31:47
---

The following examples work when [custom scripts](scripts) are enabled. 

For details on implementing your own custom scripts, see [Label Studio Interface (LSI)](scripts#Label-Studio-Interface-LSI) and [Frontend API implementation details](scripts#Frontend-API-implementation-details). 

## Plotly

Use [Plotly](https://plotly.com/) to insert charts and graphs into your labeling interface. Charts are rendered in every annotation opened by a user. 

Plotly should be loaded first from CDN: https://cdn.plot.ly/plotly-2.26.0.min.js. For security reasons, it's better to use a hash for script integrity. 


![Screenshot of Plotly graph in Label Studio](/images/project/plotly.png)

#### Script

```javascript
await LSI.import('https://cdn.plot.ly/plotly-2.26.0.min.js', 'sha384-xuh4dD2xC9BZ4qOrUrLt8psbgevXF2v+K+FrXxV4MlJHnWKgnaKoh74vd/6Ik8uF',);

let data = LSI.task.data;
if (window.Plotly && data) {
  Plotly.newPlot("plot", [data.plotly]);
}
```

**Related LSI instance methods:**

* [import(url, integrity)](scripts#import-url-integrity)


#### Labeling config

You need to add `<View idAttr="plot"/>` into your config to render the Plotly chart. 

For example:

```xml
<View>
  <Text name="function" value="Is it increasing?" />
  <Choices name="slope" toName="function">
    <Choice value="Increasing" />
    <Choice value="Decreasing" />
    <Choice value="Non-monotonic" />
  </Choices>
  <View idAttr="plot"/>
</View>
```

**Related tags:**

* [View](/tags/view.html)
* [Text](/tags/text.html)
* [Choices](/tags/choices.html)
* [Choice](/tags/choice.html)

#### Data

```json
[
  {
    "plotly": {
      "x": [1, 2, 3, 4],
      "y": [10, 15, 13, 17],
      "type": "scatter"
    }
  },
  {
    "plotly": {
      "x": [1, 2, 3, 4],
      "y": [16, 5, 11, 9],
      "type": "scatter"
    }
  }
]
```

## Custom validation

In this example, the script checks to ensure that the annotation does not include obscenity or disallowed words. 

The following script displays a modal if a user tries to submit an annotation with the word “hate” added to any audio transcription. 

Note that this is a "soft" block, meaning that the user can dismiss the modal and still proceed. For an example of a "hard" block, see [Check that TextArea input is valid JSON](#Check-that-TextArea-input-is-valid-JSON) below. 

![Screenshot of custom validation modal in Label Studio](/images/project/script_validation.png)

#### Script

```javascript
// Use Label Studio Interface to subscribe to events
// before Save Annotation is an event invoked before submitting and updating annotation
// returning "false" for this event prevents saving annotation

let dismissed = false;

LSI.on("beforeSaveAnnotation", (store, ann) => {
  // text in TextArea is always an array
  const obscene = ann.results.find(
  r => r.type === 'textarea' && r.value.text.some(t => t.includes('hate'))
  );
  if (!obscene || dismissed) return true;
  // select region to see textarea
  if (!obscene.area.classification) ann.selectArea(obscene.area);
  Htx.showModal("The word 'hate' is disallowed","error");
  dismissed = true;
  return false;
});
```

**Related LSI instance methods:**

* [on(eventName, handler)](scripts#on-eventName-handler)
  
**Related frontend events:**

* [beforeSaveAnnotation](frontend_reference#beforeSaveAnnotation)

#### Labeling config

```xml
<View>
  <Labels name="labels" toName="audio">
    <Label value="Speech" />
    <Label value="Noise" />
  </Labels>

  <Audio name="audio" value="$audio"/>

  <TextArea name="transcription" toName="audio"
    editable="true"
    perRegion="true"
    required="true"
  />
</View>
```

**Related tags:**

* [View](/tags/view.html)
* [Labels](/tags/labels.html)
* [Audio](/tags/audio.html)
* [TextArea](/tags/textarea.html)

#### Data

```json
[
  {
    "audio": "https://data.heartex.net/librispeech/dev-clean/3536/8226/3536-8226-0024.flac.wav"
  }
]
```

## Bulk text labeling with regex

This script automatically applies the same label to all matching text spans. For example, if you apply the `PER` label to the text span `Smith`, this script will automatically find all instances of `Smith` in the text and apply the `PER` label to them. 

![Screenshot of bulk text labeling](/images/project/autolabeling.gif)

#### Script

```javascript
LSI.on('entityCreate', region => {
  if (window.BULK_REGIONS) return;
  window.BULK_REGIONS = true;

  const regionTextLength = region.text.length;
  const regex = new RegExp(region.text, "gi");
  const matches = Array.from(region.object._value.matchAll(regex));

  setTimeout(() => window.BULK_REGIONS = false, 1000);

  if (matches.length > 1) {
    const results = matches.reduce((acc, m) => {
      if (m.index !== region.startOffset) {
        acc.push({
          id: String(Htx.annotationStore.selected.results.length + acc.length + 1),
          from_name: region.labeling.from_name.name,
          to_name: region.object.name,
          type: "labels",
          value: {
            text: region.text,
            start: "/span[1]/text()[1]",
            startOffset: m.index,
            end: "/span[1]/text()[1]",
            endOffset: m.index + regionTextLength,
            labels: [...region.labeling.value.labels], 
          },
          origin: "manual",
        
        });
      }
      return acc;
    }, []);

    if (results.length > 0) {
      Htx.annotationStore.selected.deserializeResults(results);
      Htx.annotationStore.selected.updateObjects();
    }
  }
});
```

**Related LSI instance methods:**

* [on(eventName, handler)](scripts#on-eventName-handler)

**Related frontend events:**

* [entityCreate](frontend_reference#entityCreate)

#### Labeling config

```xml
<View>
  <Labels name="label" toName="text">
    <Label value="PER" background="red"/>
    <Label value="ORG" background="darkorange"/>
    <Label value="LOC" background="orange"/>
    <Label value="MISC" background="green"/>
  </Labels>

  <Text name="text" value="$text"/>
</View>
```

**Related tags:**

* [View](/tags/view.html)
* [Text](/tags/text.html)
* [Labels](/tags/labels.html)


## Bulk creation and deletion operations with keyboard shortcut

This script adds bulk operations for creating and deleting regions (annotations) based on the state of the **Shift** key:

1. **Shift Key Tracking**
    - The script tracks the state of the Shift key using `keydown` and `keyup` event listeners. A boolean variable `isShiftKeyPressed` is set to `true` when the Shift key is pressed and `false` when it is released.
2. **Bulk Deletion of Regions**
    - When a region (annotation) is deleted and the Shift key is pressed, the script identifies all regions with the same text and label as the deleted region.
    - It then deletes all these matching regions to facilitate bulk deletion.
3. **Bulk Creation of Regions**
    - When a region is created and the Shift key is pressed, the script searches for all occurrences of the created region's text within the document.
    - It creates new regions for each occurrence of the text, ensuring that no duplicate regions are created (i.e., regions with overlapping start and end offsets are avoided).
    - The script also prevents tagging of single characters to avoid unnecessary annotations.
4. **Debouncing Bulk Operations**
    - To prevent rapid consecutive bulk operations, the script uses a debouncing mechanism with a timeout of 1 second. This ensures that bulk operations are not triggered too frequently.

![Screenshot of bulk actions with keyboard shortcut](/images/project/bulk_actions.gif)

#### Script

```javascript
 // Track the state of the shift key
 let isShiftKeyPressed = false;

 window.addEventListener('keydown', (e) => {
   if (e.key === 'Shift') {
     isShiftKeyPressed = true;
   }
 });

 window.addEventListener('keyup', (e) => {
   if (e.key === 'Shift') {
     isShiftKeyPressed = false;
   }
 });


 LSI.on('entityDelete', region => {
   if (!isShiftKeyPressed) return; // Only proceed if the shift key is pressed

   if (window.BULK_REGIONS) return;
   window.BULK_REGIONS = true;
   setTimeout(() => window.BULK_REGIONS = false, 1000);

   const existingEntities = Htx.annotationStore.selected.regions;
   const regionsToDelete = existingEntities.filter(entity => {
     const deletedText = region.text.toLowerCase().replace("\\\\n", " ")
     const otherText = entity.text.toLowerCase().replace("\\\\n", " ")
     console.log(deletedText)
     console.log(otherText)
     return deletedText === otherText && region.labels[0] === entity.labels[0]
   });

   regionsToDelete.forEach(r => {
     Htx.annotationStore.selected.deleteRegion(r);
   });

   Htx.annotationStore.selected.updateObjects();
 });


 LSI.on('entityCreate', region => {
   if (!isShiftKeyPressed) return; 

   if (window.BULK_REGIONS) return;
   window.BULK_REGIONS = true;
   setTimeout(() => window.BULK_REGIONS = false, 1000);

   const existingEntities = Htx.annotationStore.selected.regions;

   setTimeout(() => {
     // Prevent tagging a single character
     if (region.text.length < 2) return;
     regexp = new RegExp(region.text.replace("\\\\n", "\\\\s+").replace(" ", "\\\\s+"), "gi")
     const matches = Array.from(region.object._value.matchAll(regexp));
     matches.forEach(m => {
       if (m.index === region.startOffset) return;

       const startOffset = m.index;
       const endOffset = m.index + region.text.length;

       // Check for existing entities with overlapping start and end offset
       let isDuplicate = false;
       for (const entity of existingEntities) {
         if (startOffset <= entity.globalOffsets.end && entity.globalOffsets.start <= endOffset) {
           isDuplicate = true;
           break;
         }
       }

       if (!isDuplicate) {
         Htx.annotationStore.selected.createResult({
             text: region.text,
             start: "/span[1]/text()[1]",
             startOffset: startOffset,
             end: "/span[1]/text()[1]",
             endOffset: endOffset
           }, {
             labels: [...region.labeling.value.labels]
           },
           region.labeling.from_name,
           region.object
         );
       }
     });

     Htx.annotationStore.selected.updateObjects();
   }, 100);
 });
```

**Related LSI instance methods:**

* [on(eventName, handler)](scripts#on-eventName-handler)

**Related frontend APIs:**

* [regions](scripts#regions)
  
**Related frontend events:**

* [entityCreate](frontend_reference#entityCreate)
* [entityDelete](frontend_reference#entityDelete)



#### Labeling config

```xml
<View>
  <Header>
    Labels
  </Header>
 <View style="padding: 0em 1em; background: #f1f1f1; margin-right: 1em; border-radius: 3px">
  <View style="position: sticky; top: 0; height: 50px; overflow: auto;">
    <Labels name="label" toName="text">
      <Label value="type_1" background="#3a1381"/>
      <Label value="type_2" background="#FFA39E"/>
      <Label value="type_3" background="#46ae19"/>
      <Label value="type_4" background="#8ab1c1"/>
     </Labels>
        </View>
  </View>
  <Header>
    Document
  </Header>
  <View style="height: 600px; overflow: auto;">
    <Text name="text" value="$text"/>
  </View>
</View>
```

**Related tags:**

* [View](/tags/view.html)
* [Text](/tags/text.html)
* [Header](/tags/header.html)
* [Labels](/tags/labels.html)

## Check that TextArea input is valid JSON 

This script parses the contexts of a TextArea field to check for valid JSON. If the JSON is invalid, it shows an error and prevents the annotation from being saved.

This is an example of a "hard" block, meaning that the user must resolve the issue before they can proceed. For an example of a "soft" block, see [Custom validation](#Custom-validation) above. 

![Screenshot of JSON error message](/images/project/script_json.png)

#### Script

```javascript
 LSI.on("beforeSaveAnnotation", (store, annotation) => {
  const textAreaResult = annotation.results.find(r => r.type === 'textarea' && r.from_name.name === 'answer');
  if (textAreaResult) {
    try {
      JSON.parse(textAreaResult.value.text[0]);
    } catch (e) {
      Htx.showModal("Invalid JSON format. Please correct the JSON and try again.", "error");
      return false;
    }
  }
  return true;
});
```

**Related LSI instance methods:**

* [on(eventName, handler)](scripts#on-eventName-handler)

**Related frontend events:**

* [beforeSaveAnnotation](frontend_reference#beforeSaveAnnotation)


#### Labeling config

```xml
<View>
  <View>
    <Filter toName="label_rectangles" minlength="0" name="filter"/>
    <RectangleLabels name="label_rectangles" toName="image" canRotate="false" smart="true">
      <Label value="table" background="Blue"/>
      <Label value="cell" background="Red"/>
      <Label value="column" background="Green"/>
      <Label value="row" background="Purple"/>
    </RectangleLabels>
  </View>
  <View>
    <Image name="image" value="$image" />
  </View>
  <View style=".htx-text { white-space: pre-wrap; }">
    <TextArea name="answer" toName="image"
              editable="true"
              perRegion="true"
              required="false"
              maxSubmissions="1"
              rows="10"
              placeholder="Parsed Row JSON"
              displayMode="tag"/>
  </View>
</View>
```

**Related tags:**

* [View](/tags/view.html)
* [RectangleLabels](/tags/rectanglelabels.html)
* [TextArea](/tags/textarea.html)
* [Labels](/tags/labels.html)
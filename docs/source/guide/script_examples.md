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
* [Choices](/tags/choice.html)

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
    "audio": "<https://data.heartex.net/librispeech/dev-clean/3536/8226/3536-8226-0024.flac.wav>"
  }
]
```


## HyperText video and time series sync

This script ensures that the video playback is synchronized with the selected time range in the time series data, allowing for precise annotation and review.

#### Script

```javascript
function updateVideoSync(v, r, t) {
//v is the video object.

//r is an array with two elements describing the timeSeries selection start & end: [start,end].

// t is the timestamp data from the time series.

var sTrim = parseInt(document.getElementsByName('videoStart')[0].value) / 1000;
var eTrim = parseInt(document.getElementsByName('videoEnd')[0].value) / 1000;
var videoSyncChoice = document.getElementById('videoSyncChoice');
var trimmedDuration = v.duration - (sTrim + eTrim);
var tsPointFactor = 1;
switch (videoSyncChoice.value) {
case "end":
tsPointFactor = (r()[1] - t[0]) / (t.slice(-1)[0] - t[0]); break;
case "midpoint":
tsPointFactor = ((r()[0] / 2 + r()[1] / 2) - t[0]) / (t.slice(-1)[0] - t[0]); break;
default:
//start:
tsPointFactor = (r()[0] - t[0]) / (t.slice(-1)[0] - t[0]);
}
console.log("tsPointFactor");
console.log(tsPointFactor);
console.log("updating currentTime to:");
console.log(sTrim + trimmedDuration * tsPointFactor);
v.currentTime = sTrim + trimmedDuration * tsPointFactor
}
function onVideoSyncChoice() {
updateVideoSync(v, r, t);
}
setTimeout(function () {
console.log('Started the function WOOOWOOO');
//the videoSyncChoice element is used as singleton to ensure tht script is only run once!.

var videoSyncChoice = document.getElementById('videoSyncChoice');
if (videoSyncChoice === null) {
v = document.getElementsByTagName('video')[0];
//setup video sync for modifications to the video trim parameters:
document.getElementsByName('videoStart')[0].onchange = function () { v.currentTime = parseInt(document.getElementsByName('videoStart')[0].value) / 1000; };
document.getElementsByName('videoEnd')[0].onchange = function () { v.currentTime = v.duration - parseInt(document.getElementsByName('videoEnd')[0].value) / 1000; };
//create and Insert the sync choice element after the video.

videoSyncChoice = document.createElement('select');
[videoSyncChoice.id](http://videosyncchoice.id/) = "videoSyncChoice";
videoSyncChoice.onchange = onVideoSyncChoice;
videoSyncChoice.innerHTML = '<option value="start">Sync Video to selection range start</option><option value="midpoint">Sync Video to selection range mid point</option><option value="end">Sync Video to selection range end</option>'
v.parentElement.appendChild(videoSyncChoice);
}
//Setup the sync with the timeline selection:
//console.log](https://console.log/)(Htx.annotationStore.selected.names);
console.log("******** array sizes *******");
console.log(t.length);
console.log(v.duration);
ts = Htx.annotationStore.selected.names.get('ts');
console.log(ts.data);
t = ts.data.timestamp;
w = parseInt(t.length * (20 / v.duration));
console.log(w);
l = t.length - w;
ts.updateTR([t[0], t[w]], 1.001);
r = $ => ts.brushRange.map(n => (+n).toFixed(2));
_ = r();
updateVideoSync(v, r, t);
setInterval($ => r().some((n, i) => n !== *[i]) && (* = r()) && (updateVideoSync(v, r, t)), 300);
console.log('video is loaded, starting to sync with time series');
}, 2000);
```

#### Labeling config

```xml
<View>
	<View style="display: flex;">
		<View style="flex: 50%">
			<Header value="Gesture annotations" />
			<Header value="Filename: $filename" />
			<Header value="UUID: $UUID" />
			<View>
				<HyperText name="video" value="$video" inline="true" sync="video"/>
				<View style="display: flex; justify-content: space-between">
					<View style="width: 49%">
						<Header value="Trim start [ms]:"/>
						<Number name="videoStart" toName="ts" step="50" defaultValue="0"/>
					</View>
					<View>
						<Header value="Trim end [ms]:"/>
						<Number name="videoEnd" toName="ts" step="50" defaultValue="0"/>
					</View>
				</View>
			</View>
		</View>
		<View style="flex: 50%; margin-left: 1em">
			<Choices name="gesture_type_choice" toName="ts" choice="single-radio">
				<Choice alias="R" value="Regular" />
				<Choice alias="F" value="Fabulab" />
			</Choices>
			<View style="display: flex;">
				<View style="flex: 50%" visibleWhen="choice-selected"
                whenTagName="gesture_type_choice" whenChoiceValue="Fabulab">
					<TimeSeriesLabels name="fabulab_gestures" toName='ts' choice='multiple'
                    showinline="true">
						<Label value="fabulab_UP" background="#FFA39E" />
						<Label value="fabulab_Down" background="#D4380D" />
						<Label value="fabulab_left" background="#FFC069" />
						<Label value="fabulab_right" background="#AD8B00" />
						<Label value="fabulab_1" background="#D3F261" />
						<Label value="fabulab_2" background="#389E0D" />
						<Label value="fabulab_3" background="#5CDBD3" />
						<Label value="fabulab_4" background="#096DD9" />
						<Label value="fabulab_5" background="#ADC6FF" />
						<Label value="fabulab_6" background="#9254DE" />
					</TimeSeriesLabels>
				</View>
				<View style="flex: 50%; margin-left: 1em" visibleWhen="choice-selected"
                whenTagName="gesture_type_choice" whenChoiceValue="Regular">
					<Filter name='filter' toname='tricks' />
					<TimeSeriesLabels name="tricks" toName="ts" choice="multiple" showinline="true">
						<Label value="turn_CW" background="#38D4FF" />
						<Label value="turn_CCW" background="#38FFD4" />
						<Label value="Tap" background="#FFC069" />
						<Label value="Fire" background="#FFA39E" />
						<Label value="2D" background="#D4380D" />
						<Label value="3D" background="#FFC069" />
						<Label value="Jump" background="#AD8B00" />
						<Label value="Impact" background="#D3F261" />
						<Label value="Reload" background="#389E0D" />
						<Label value="Shake" background="#0a38f0" />
						<Label value="Button" background="#ef9eff" />
						<Label value="FreeFall" background="#0bf99e" />
						<Label value="Flip" background="#0bf99e" />
						<Label value="walk" background="#8accf4" />
					</TimeSeriesLabels>
				</View>
			</View>
			<!--<Audio name="audio" value="$audio" sync="video" speed="false" height="150" />
        -->
			<TimeSeries name="ts" valueType="url" value="$csv" timeColumn="timestamp" sync="video"
            overviewChannels='AccMagnitude'>
				<Channel column='x' legend='x' />
				<Channel column='y' legend='y' />
				<Channel column='z' legend='z' />
				<Channel column='filterX' legend='filterX' />
				<Channel column='filterY' legend='filterY' />
				<Channel column='filterZ' legend='filterZ' />
				<Channel column="AccMagnitude" legend='AccMagnitude' />
				<Channel column="Shake" legend='Shake' />
			</TimeSeries>
		</View>
	</View>
</View>
```

**Related tags:**

* [View](/tags/view.html)
* [Header](/tags/header.html)
* [HyperText](/tags/hypertext.html)
* [Choices](/tags/choices.html)
* [TimeSeriesLabels](/tags/timeserieslabels.html)
* [TimeSeries](/tags/timeseries.html)
* [Filter](/tags/filter.html)

## Bulk text labeling with regex

This script automatically applies the same label to all matching text spans. For example, if you apply the `PER` label to the text span `Smith`, this script will automatically find all instances of `Smith` in the text and apply the `PER` label to them. 

#### Script

```javascript
 LSI.on('entityCreate', region => {
  if (window.BULK_REGIONS) return;
  window.BULK_REGIONS = true;
  setTimeout(() => window.BULK_REGIONS = false, 1000);
  console.log('matches', region.object._value.matchAll(region.text));
  setTimeout(() => {
    region.object._value.matchAll(new RegExp(region.text, "gi")).forEach(m => {
      if (m.index === region.startOffset) return;
      Htx.annotationStore.selected.createResult(
        { text: region.text, start: "/span[1]/text()[1]", startOffset: m.index, end: "/span[1]/text()[1]", endOffset: m.index + region.text.length },
        { labels: [...region.labeling.value.labels] },
        region.labeling.from_name,
        region.object,
      )
    })
    Htx.annotationStore.selected.updateObjects()
  }, 100);
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

  // console.log('matches', region.object._value.matchAll(region.text));
  // console.log(region)

  const existingEntities = Htx.annotationStore.selected.regions;
  //console.log(existingEntities)
  const regionsToDelete = existingEntities.filter(entity => {
    const deletedText = region.text.toLowerCase().replace("\\\\n", " ")
    const otherText = entity.text.toLowerCase().replace("\\\\n", " ")
    console.log(deletedText)
    console.log(otherText)
    return deletedText === otherText && region.labels[0] === entity.labels[0]
  });

  //console.log(regionsToDelete)

  regionsToDelete.forEach(r => {
    Htx.annotationStore.selected.deleteRegion(r);
  });

  Htx.annotationStore.selected.updateObjects();
});


LSI.on('entityCreate', region => {
  if (!isShiftKeyPressed) return; // Only proceed if the shift key is pressed

  if (window.BULK_REGIONS) return;
  window.BULK_REGIONS = true;
  setTimeout(() => window.BULK_REGIONS = false, 1000);

  //console.log('matches', region.object._value.matchAll(region.text));

  const existingEntities = Htx.annotationStore.selected.regions;

  setTimeout(() => {
    // prevent tagging a single character
    if (region.text.length < 2) return;
    regexp = new RegExp(region.text.replace("\\\\n", "\\\\s+").replace(" ", "\\\\s+"), "gi")
    const matches = Array.from(region.object._value.matchAll(regexp));
    matches.forEach(m => {
      if (m.index === region.startOffset) return;

      const startOffset = m.index;
      const endOffset = m.index + region.text.length;


      // Check for existing entities with overlapping start and end offset
      let isDuplicate = false;
      // could be made faster with binary search
      for (const entity of existingEntities) {
        if (startOffset <= entity.globalOffsets.end && entity.globalOffsets.start <= endOffset) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        Htx.annotationStore.selected.createResult(
          {
            text: region.text,
            start: "/span[1]/text()[1]",
            startOffset: startOffset,
            end: "/span[1]/text()[1]",
            endOffset: endOffset
          },
          { labels: [...region.labeling.value.labels] },
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
  <!--
  <Header>
    Document Categories
  </Header>
  <View style="position: sticky; top: 0; height: 100; overflow: auto;">
     <Choices name="category" toName="text" choice="single-radio" showInLine="true" required="true">
      <Choice value="VAN-US"/>
      <Choice value="VAN-CAD"/>
      <Choice value="Unknown"/>
    </Choices>
  </View>
  -->
  <Header>
    Labels
  </Header>
 <View style="padding: 0em 1em; background: #f1f1f1; margin-right: 1em; border-radius: 3px">
  <View style="position: sticky; top: 0; height: 250px; overflow: auto;">
    <Filter name="filter" toName="label" hotkey="shift+f" minlength="0" placeholder="Filter"/>
    <Labels name="label" toName="text">
      <Label value="general:fund_name" background="#3a1381"/>
      <Label value="general:fund_name_abbreviation" background="#FFA39E"/>
     </Labels>
        </View>
  </View>
  <Header>
    Document
  </Header>
  <View style="height: 600px; overflow: auto;">
    <Text name="text" value="$text_url" valueType="url" saveTextResult="yes"/>
  </View>
</View>
```

**Related tags:**

* [View](/tags/view.html)
* [Text](/tags/text.html)
* [Header](/tags/header.html)
* [Filter](/tags/filter.html)
* [Labels](/tags/labels.html)

## Check that TextArea text is valid JSON 

This script parses the contexts of a TextArea field to check for valid JSON. If the JSON is invalid, it shows an error and prevents the annotation from being saved.

#### Script

```javascript
 LSI.on("beforeSaveAnnotation", (store, annotation) => {
  const textAreaResult = annotation.results.find(r => r.type === 'textarea' && r.from_name === 'answer');
  if (textAreaResult) {
    try {
      JSON.parse(textAreaResult.value.text[0]);
    } catch (e) {
      Htx.showModal("Invalid JSON format. Please correct the JSON and try again: ${textAreaResult.value.text[0]}", "error");
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
  <View><Filter toName="label_rectangles" minlength="0" name="filter"/>
  <RectangleLabels name="label_rectangles" toName="image" canRotate="false" smart="true">
    <View>
      <Label value="table" background="Blue"/>
      <Label value="cell" hotkey="2" background="Red"/>
      <Label value="column" hotkey="3" background="Green"/>
      <Label value="row" background="Purple"/>
      <Label value="page_number" hotkey="5" background="Teal"/>
    </View>

    </View>
  <Label value="currency-exchange-rate-table" background="#0627ac"/><Label value="administrative-fees-table" background="#2d8dd7"/><Label value="fair-value-estimation-reconciliation" background="#3700ff"/><Label value="service-distribution-fees-table" background="#130548"/><Label value="sub-transfer-agent-fees-table" background="#0b08a0"/></RectangleLabels></View>
  <View>
        <Image name="image" value="$image" zoomBy="1.07" width="1700px"/>
  </View>
  <View style=".htx-text { white-space: pre-wrap; }">
    <TextArea name="parsed_row_json" toName="image"
              editable="true"
              perRegion="true"
              required="false"
              maxSubmissions="1"
              rows="10"
              placeholder="Parsed Row JSON"
              displayMode="tag"
              />
   </View>
</View>
```

**Related tags:**

* [View](/tags/view.html)
* [RectangleLabels](/tags/rectanglelabels.html)
* [TextArea](/tags/textarea.html)
* [Labels](/tags/labels.html)
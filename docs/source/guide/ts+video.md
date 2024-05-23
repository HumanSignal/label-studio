---
title: Time series and Video or Audio
short: Time series and Video or Audio
meta_title: Time series video audio labeling 
---


!!! note
    - This feature is not officially supported, experimental, and has a tricky setup way.
    - To use audio instead of video you should replace `.mp4` file to mp3/wav/other browser supported audio format.      
    - This approach works with Label Studio **1.4.1 and lower**.


## Step 1: Media hosting

You have to host your CSV and MP4 somewhere (or another video formats supporting by browsers). You can use S3 
or another clouds. If you want to host data from your hard drive, please use 
[Label Studio Local Storage](http://localhost:4000/guide/storage.html#Local-storage).

As the result of this step you will have two URLs: one for CSV and one for video. For example, 
```
http://localhost:8080/samples/time-series.csv?time=time_column&values=first_column
http://localhost:8080/static/samples/opossum_snow.mp4
```


## Step 2: Labeling config with example task data

Copy this labeling config to your project. 

```
<View>
  <TimeSeriesLabels name="label" toName="ts">
    <Label value="Run"/>
    <Label value="Walk"/>
  </TimeSeriesLabels>
  <HyperText name="video" value="$video" inline="true"/>
  <TimeSeries name="ts" value="$csv" valueType="url" timeColumn="time_column">
    <Channel column="first_column"/>
  </TimeSeries>
</View>

<!-- {
    "csv": "/samples/time-series.csv?time=time_column&values=first_column",
    "video": "<video src='/static/samples/opossum_snow.mp4' width='100%' controls onloadeddata=\"setTimeout(function(){ts=Htx.annotationStore.selected.names.get('ts');t=ts.data.time_column;v=document.getElementsByTagName('video')[0];w=parseInt(t.length*(5/v.duration));l=t.length-w;ts.updateTR([t[0], t[w]], 1.001);r=$=>
ts.brushRange.map(n=>(+n).toFixed(2));_=r();setInterval($=>r().some((n,i)=>n!==_[i])&&(_=r())&&(v.currentTime=v.duration*(r()[0]-t[0])/(t.slice(-1)[0]-t[0]-(r()[1]-r()[0]))),300); console.log('video is loaded, starting to sync with time series')}, 3000); \" />"
  } -->
```


## Step 3: Prepare and import tasks

!!! note 
    It is the most important step, because the main trick is in task data, it uses a JavaScript injection.        

Save this code to `import.json` and then import this file to LS.   
```
{
    "csv": "/samples/time-series.csv?time=time_column&values=first_column",
    "video": "<video src='/static/samples/opossum_snow.mp4' width='100%' controls onloadeddata=\"setTimeout(function(){ts=Htx.annotationStore.selected.names.get('ts');t=ts.data.time_column;v=document.getElementsByTagName('video')[0];w=parseInt(t.length*(5/v.duration));l=t.length-w;ts.updateTR([t[0], t[w]], 1.001);r=$=>
ts.brushRange.map(n=>(+n).toFixed(2));_=r();setInterval($=>r().some((n,i)=>n!==_[i])&&(_=r())&&(v.currentTime=v.duration*(r()[0]-t[0])/(t.slice(-1)[0]-t[0]-(r()[1]-r()[0]))),300); console.log('video is loaded, starting to sync with time series')}, 3000); \" />"
}
```


## Step 4: Explore imported task

1. Go to the Data manager and click on the task row.
2. It is very important to wait for about 3 seconds (it depends on video size), until video is loaded.
3. Drag the handle on the time series overview channel, you video must be synchronized with the time series.

!!! note
    - This trick suggests that time series length is equal to the video length, so the scroll between time series and video works proportionally.
    - The sync works only in one direction: from time series to video, you can control the time position only using the time series scroll. 


## Video tutorial

<iframe width="100%" height="450vh" src="https://www.youtube.com/embed/fzY1DNPxkdw" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

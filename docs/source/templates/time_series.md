---
title: Time Series Labeling 
type: templates
order: 100
is_new: t
---

## Quickstart 

<GIF-with-start-steps>

1. You need to install and run Label Studio (LS) first. It could be done by many ways using [pip](https://labelstud.io/guide/#Running-with-pip)
`pip install label-studio && label-studio start my_project --init` 
or using [Docker](https://labelstud.io/guide/#Running-with-Docker), [Github sources](https://labelstud.io/guide/#Running-from-source) and [one-click-deploy](https://github.com/heartexlabs/label-studio#one-click-deploy) button.

2. Open LS in the browser (for local usage it will be [http://localhost:8080](http://localhost:8080) usually).  

3. Go to Setup page ([http://localhost:8080/setup](http://localhost:8080/setup)). On this page you need to configure a labeling scheme for your project using LS tags. Read more about LS tags [in the documentation](/tags/timeseries.html). The fastest way to do it is to use templates which are available on Setup page:

  <img src="/images/release-080/ts-templates.png" class="gif-border" />

4. Import your CSV/TSV/JSON via Import page ([http://localhost:8080/import](http://localhost:8080/import)).

5. Start Labeling ([http://localhost:8080/](http://localhost:8080/))
  
## Labeling config
  
  For example your project labeling config could be: 
  
  ```html
  <View>
    <TimeSeriesLabels name="label" toName="ts">
      <Label value="Run"/>
      <Label value="Walk"/>
    </TimeSeriesLabels>
  
    <TimeSeries name="ts" 
                valueType="url" value="$csv"
                timeColumn="time">
      <Channel column="one" />
      <Channel column="two" />
    </TimeSeries>
  </View>
  ```
    
   Here are 3 tags used: 
       * `TimeSeriesLabels` - control tag, it displays controls (buttons with labels) for the region labeling,
       * `TimeSeries` - object tag, it draws time-series signals on the page, 
       * `Channel` - it helps TimeSeries detect channels to display and how to setup them.  

  `<TimeSeriesLabels>` is linked with `<TimeSeries>` via toName field. `<TimeSeries>` has an attribute `valueType="url"` and this means that LS will store only links to CSV files in LS tasks. Read more about valueType [below](/blog/release-080-time-series.html#JSON) and LS [tasks](/guide/tasks.html).
  
  > Pay attention to `<TimeSeries timeColumn="time">`, `<Channel>` with `column="one"` and `value="two"`: `time`, `one`, `two` are nested columns relative to `$csv` data. 


### timeColumn & timeFormat & timeDisplayFormat

* Specify `timeColumn` in `TimeSeries` to use some column from your data as X time axis. Or drop it out if you want to use incremental integer values `1, 2, 3, ...`. 

* `timeFormat` is a parsing rule for `timeColumn` dates as in `strftime` ([explore format here](http://www.cplusplus.com/reference/ctime/strftime/)).

* `timeDisplayFormat` is a rule about how to display dates and time on the plot, it's the same as `strftime` ([explore format here](http://www.cplusplus.com/reference/ctime/strftime/)). 

### units & displayFormat

* `displayFormat` is applied to signal values. Explore [D3 format specification](https://github.com/d3/d3-format#locale_format). 
* `units` will be added to displaying values on the plot and to the Y axis. 


## Input formats  

LS supports several input ways for time series import: 
* CSV with/without header
* TSV with/without header
* JSON

You can upload files of these formats on Import page, just drag & drop one or more files there. 


### CSV
Let's start with the most common case - CSV files. For example, you have a such simple CSV file with 3 points inside:

```csv
time,one,two
0.0,3.86,0.00
0.1,2.05,2.11
0.2,1.64,5.85
 ```

Your `<TimeSeries>` tag should have an attribute `valueType="url"` which informs 
LS to open a tag value as URL with CSV file:

```html
<View>
  <TimeSeries valueType="url" value="$csv_file" sep="," timeColumn="time">
    <Channel column="0"/>
  </TimeSeries>             
</View> 
```

### TSV 

TSV format is very similar to CSV but the separator is tab (`\t`) instead of comma. 
So, the functionality is the same as CSV.  

```html
<View>
  <TimeSeries valueType="url" value="$csv_file" sep="\t" timeColumn="time">
    <Channel column="0"/>
  </TimeSeries>
</View> 
```


### Headless CSV & TSV

The main difference for the headless CSV/TSV usage is another way to name `<Channel>` values. Since the file has no header and nothing is known about the column names you should use names `colunm#N`, where `N` is a number of the column to use in the channel. The same is true for `timeColumn` from `<TimeSeries>` tag. 
 

### JSON

All tasks in LS are stored in JSON and this is the native format for LS. 

* valueType="url" 

  When you use `valueType="url"` for TimeSeries tag and import a CSV file LS **automatically** will create a JSON task with the body like this one: 
  
  ```json
  {
    "csv": "http://localhost:8080/data/upload/my-import-file.csv"
  }
  ```

* valueType="json"
  
  Another way to use LS tasks directly instead of CSV files is to create and import them as below: 

  ```json
  {
    "ts": {
      "time": [
        15.97, 15.85, 25.94
      ],
      "one": [
        13.86, 29.05, 64.90
      ],
      "two": [
        21.00, 15.18, 35.85
      ]
    }
  }
  ```

## Output format example

You can export the results on Export page in JSON, JSON_MIN and CSV formats. 

Users make completions while creating a labeling for a single task. One completion is a JSON structure (e.g. task with completions could be stored in `your_project_folder/completions/0.json`). The each completion has `result` field and it looks like this:

```json
{
  "completions": [{
    "some_more_fields": "...",
    "result": [
      {
          "value": {
              "start": 1592250751951.8074,
              "end": 1592251071946.638,
              "instant": false,
              "timeserieslabels": [
                  "Run"
              ]
          },
          "id": "S1DkU7FSku",
          "from_name": "label",
          "to_name": "ts",
          "type": "timeserieslabels"
      },
      {
          "value": {
              "start": 1592251231975.601,
              "end": 1592251461993.5276,
              "instant": false,
              "timeserieslabels": [
                  "Run"
              ]
          },
          "id": "XvagJo87mr",
          "from_name": "label",
          "to_name": "ts",
          "type": "timeserieslabels"
      }
    ]
  }] 
}
```

## Special cases

### Multiple time series in one labeling config

If you want to use multiple time series tags in one labeling config then you need manually host your CSV files and create JSON with tasks for import which contains links to CSV files. Or you can store time series data in tasks directly. 

### Video & audio sync with time series

It's possible to synchronize TimeSeries with video and audio in Label Studio. Right now you can do it using HyperText tag with html objects `<audio src="path">`/`<video src="path">` and TimeSeries together. We have some solutions for this in testing stage and we can share it with you [by request in slack](https://join.slack.com/t/label-studio/shared_invite/zt-cr8b7ygm-6L45z7biEBw4HXa5A2b5pw).
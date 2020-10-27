---
title: Time Series Labeling 
type: templates
order: 100
is_new: t
---

## Run 

label-studio init time_series_project
label-studio start time_series_project
  
## Config
  
Example project configuration for two sensors labeling:
  
```html
  <View>
    <TimeSeriesLabels name="label" toName="ts">
      <Label value="Run"/>
      <Label value="Walk"/>
    </TimeSeriesLabels> 
    <TimeSeries name="ts" valueType="url" value="$csvUrl" timeColumn="#time">
      <Channel column="#sensorone" />
      <Channel column="#sensortwo" />
    </TimeSeries>
  </View>
```
    
Three tags used above are: 
- `TimeSeriesLabels` - control tag, it displays controls (buttons with labels) for labeling
- `TimeSeries` - object tag, it configures how to load the time series
- `Channel` - define channels inside time series, every channel is displayed as a single plot

`<TimeSeriesLabels>` is linked with `<TimeSeries>` via a toName field.  
  
`<TimeSeries>` has an attribute `valueType="url"`. This means that Label Studio expects links to CSV files in its tasks. Read more about valueType [below](/blog/release-080-time-series.html#JSON) and Label Studio [tasks](/guide/tasks.html).
  
> Notice that `<TimeSeries timeColumn="#time">`, `<Channel>` with `value="#sensorone"` and `value="#sensortwo"`: `time`, `sensorone`, `sensortwo` are nested columns relative to `$csvUrl`. 

### timeColumn & timeFormat & timeDisplayFormat

* Specify `timeColumn` in `TimeSeries` to use some column from your data as X time axis. Or drop it out if you want to use incremental integer values `1, 2, 3, ...`. 

* `timeFormat` is a parsing rule for `timeColumn` dates as in `strftime` ([explore format here](http://www.cplusplus.com/reference/ctime/strftime/)).

* `timeDisplayFormat` is a rule about how to display dates and time on the plot, it's the same as `strftime` ([explore format here](http://www.cplusplus.com/reference/ctime/strftime/)). 

### units & displayFormat

* `displayFormat` is applied to signal values. Explore [D3 format specification](https://github.com/d3/d3-format#locale_format). 
* `units` will be added to displaying values on the plot and to the Y axis. 


## Input formats  

Label Studio supports several input types for time series:

- CSV with/without header
- TSV with/without header
- JSON

You can upload files on the Import page, just drag & drop one or more files there. 

### CSV

Let's start with the most common case - CSV files. For example, you have a CSV file with 3 columns:

```csv
time,sensorone,sensortwo
0.0,3.86,0.00
0.1,2.05,2.11
0.2,1.64,5.85
 ```

Your `<TimeSeries>` tag should have an attribute `valueType="url"` which informs Label Studio to open value as URL with CSV file:

```html
<View>
  <TimeSeries valueType="url" value="$csv_file" sep="," timeColumn="time">
    <Channel column="0"/>
  </TimeSeries>             
</View> 
```

### TSV 

For TSV you need to configure a separator, you can use `sep` attribute on the `TimeSeries` tag:

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

The main difference for the headless CSV/TSV usage is another way to name `<TimeSeriesChannel>` values. Since the file has no header and nothing is known about the column names you should use column index instead, for example `#0`, therefore to use the first column as a temporal column you'd do `<TimeSeries timeColumn="#0" ... >`. The same is true for `column` in `<Channel>` tag. 

### JSON

All tasks in LS are stored in JSON and this is the native format for Label Studio. 

* valueType="url" 

  When you use `valueType="url"` for TimeSeries tag and import a CSV file Label Studio **automatically** will create a JSON task with the body like this one: 
  
  ```json
  {
    "csv": "http://localhost:8080/data/upload/my-import-file.csv"
  }
  ```

* valueType="json"
  
  Another way to use Label Studio tasks directly instead of CSV files is to create and import them as below: 

  ```json
  {
    "ts": {
      "time": [
        15.97, 15.85, 25.94
      ],
      "sensorone": [
        13.86, 29.05, 64.90
      ],
      "sensortwo": [
        21.00, 15.18, 35.85
      ]
    }
  }
  ```

## Output format example

You can export the results on the Export page in JSON, JSON_MIN, and CSV formats. 

Users make completions while creating labeling for a single task. One completion is a JSON structure (e.g. task with completions could be stored in `your_project_folder/completions/0.json`). Each completion has a `result` field and it looks like this:

```json
{
  "completions": [{  
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

If you want to use multiple time series tags in one labeling config then you need manually host your CSV files and create JSON with tasks for import which contains links to CSV files. Or you can store time-series data in tasks directly. 

### Video & audio sync with time series

It's possible to synchronize TimeSeries with video and audio in Label Studio. Right now you can do it using HyperText tag with HTML objects `<audio src="path">`/`<video src="path">` and TimeSeries together. We have some solutions for this in the testing stage and we can share it with you [by request in slack](https://join.slack.com/t/label-studio/shared_invite/zt-cr8b7ygm-6L45z7biEBw4HXa5A2b5pw).

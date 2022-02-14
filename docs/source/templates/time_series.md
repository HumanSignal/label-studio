---
title: Time Series Labeling 
type: templates
category: Time Series Analysis
cat: time-series-analysis
order: 750
meta_title: Time Series Data Labeling Template
meta_description: Template for labeling multivariate and simple time series data with Label Studio for your machine learning and data science projects.
---

Label any type of time series data using this generic template.
  
## Labeling Configuration
  
Example project configuration for multivariate time series labeling:
  
```html
<View>
  <TimeSeriesLabels name="label" toName="ts">
    <Label value="Run"/>
    <Label value="Walk"/>
  </TimeSeriesLabels> 
  <TimeSeries name="ts" valueType="url" value="$csv_url" timeColumn="time">
    <Channel column="sensorone" />
    <Channel column="sensortwo" />
  </TimeSeries>
</View>
```

### Input data
Example csv input for the config above:

```csv
time,sensorone,sensortwo
0,10,20
1,20,30
2,30,40
```

### Template notes

`<TimeSeriesLabels>` is linked with `<TimeSeries>` with a toName field.
  
`<TimeSeries>` has an attribute `valueType="url"`, which means that Label Studio expects links to CSV files in JSON-formatted tasks.

`timeColumn` in `TimeSeries` to use a specific column from your dataset as the X axis. If you skip it then it uses incremental integer values `0, 1, 2, ...`. 


## Related tags
- [TimeSeriesLabels](/tags/timeserieslabels.html) - control tag, it displays controls (buttons with labels) for labeling
- [TimeSeries](/tags/timeseries.html) - object tag, it configures how to load the time series
- [Channel](/tags/timeseries.html#Channel) - define channels inside time series, every channel is displayed as a single plot



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

Your `<TimeSeries>` tag must have an attribute `valueType="url"` which informs Label Studio to open the value in the task as a URL referencing a CSV file:

```html
<View>
  <TimeSeries name="ts" valueType="url" value="$csv_url" sep="," timeColumn="time">
    <Channel column="sensorone" />
  </TimeSeries>
</View> 
```

Example `file.json` to upload:

```json
[ { "data": { "csv_url": "http://example.com/path/to/file.csv" } } ]
```

### TSV 

For TSV you need to configure a separator using the `sep` attribute on the `TimeSeries` tag. TSV format is very similar to CSV but the separator is a tab (`\t`) instead of a comma. The functionality is the same as CSV.

```html
<View>
  <TimeSeries name="ts" valueType="url" value="$csv_url" sep="\t" timeColumn="time">
    <Channel column="0"/>
  </TimeSeries>
</View> 
```

### Headless CSV & TSV

The main difference for the headless CSV/TSV usage is another way to name `<Channel>` columns. Since the file has no header and nothing is known about the column names you should use column index instead, for example `0`, therefore to use the first column as a temporal column you'd do `<TimeSeries timeColumn="0" ... >`. The same is true for the `column` attribute in `<Channel>` tag. 

### JSON

All tasks in Label Studio are stored in JSON and this is the native format for Label Studio. 

- `valueType="url"`

  When you use `valueType="url"` for TimeSeries tag and import a CSV file Label Studio **automatically** creates a JSON task with the body like this one: 
  
  ```json
  {
    "csv": "http://localhost:8080/data/upload/my-import-file.csv"
  }
  ```

- `valueType="json"`
  
  Another way to use Label Studio JSON format directly instead of CSV files is to create and import them like the following example: 

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

You can export the results of your labeling process on the Export page in JSON, JSON_MIN, and CSV formats. 

Users make annotations while labeling a task. One annotation is represented by a JSON structure and each annotation has a `result` field that looks like the following example:

```json
{
  "annotations": [{  
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

### Multiple time series in one project

If you want to use multiple time series files in one project you need to make your CSV files available as URLs and create an input JSON with tasks pointing at those CSVs, for example:

```json
[ { "data": { "csv_file1": "http://example.com/path/file1.csv", "csv_file2": "http://example.com/path/file2.csv" } } ]
```

And minimal config would be

```html
<View>
  <Header value="First time series" />
  <TimeSeriesLabels name="lbl-1" toName="ts-1">
    <Label value="Label 1" />
  </TimeSeriesLabels>
  <TimeSeries name="ts-1" timeColumn="0" value="$csv_file1">
    <Channel column="1" />
  </TimeSeries>
	
  <Header value="Second time series" />
  <TimeSeriesLabels name="lbl-2" toName="ts-2">
    <Label value="Label 2" />
  </TimeSeriesLabels>
  <TimeSeries name="ts-2" timeColumn="0" value="$csv_file2">
    <Channel column="1" />
  </TimeSeries>
</View>
```

Or you can store time series data in tasks directly. 

### Video & audio sync with time series

It's possible to synchronize TimeSeries with video and audio in Label Studio. Right now you can do it using HyperText tag with HTML objects `<audio src="path">`/`<video src="path">` and TimeSeries together. We have some solutions for this in testing. [Contact us](https://slack.labelstudio.heartex.com/?source=template-timeseries) in Slack to learn more.

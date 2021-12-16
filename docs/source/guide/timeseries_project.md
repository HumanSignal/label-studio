---
title: Create a time series project in Label Studio
short: 
type: guide
order: 1
meta_title: 
meta_description: 
---

Create a time series project in Label Studio to label time series data for machine learning and data science use cases. 

## Prerequisites

Before you start, identify your data and how you want to label it. 

### Identify your data

Determine the following:
- Where is your data stored? In a local file? In cloud storage?
- In what format is your data stored? CSV, TSV, JSON, or something else?

### Identify how you want to label your data

Determine the following:
- What labels you want to apply to your time series data
- What type of labeling you want to perform (add labels to regions, which channels to label)

## Set up a project

Based on the labels that you want to use for your project and the type of labeling you want to perform, set up a labeling configuration.

### Start with a template

Label Studio includes a variety of time series data templates. 

Start with the one that fits your use case best:
- [Change Point Detection](/templates/time_series_change_point_detection.html)
- [Activity Recognition](/templates/time_series_activity_recognition.html)
- [Time Series Forecasting](/templates/time_series_forecasting.html)

### Then customize the labeling configuration 

After choosing your template for your use case, customize it to use the relevant labels for your use case, or make other changes. Review the available customization options for each tag used in the template:
- [TimeSeriesLabels](/tags/timeserieslabels.html) - control tag, it displays controls (buttons with labels) for labeling
- [TimeSeries](/tags/timeseries.html) - object tag, it configures how to load the time series
- [Channel](/tags/timeseries.html#Channel) - define channels inside time series, every channel is displayed as a single plot
  
### Account for your data format 
As you customize your labeling configuration, make sure that it aligns with your dataset. See the following examples for how to make sure that your labeling configuration and dataset format align: 
- [A CSV file with two channels](#A-CSV-file-with-two-channels)
- [A TSV file with two channels](#A-TSV-file-with-two-channels)
- [A CSV or TSV file with no headers](#A-CSV-or-TSV-file-with-no-headers)
- [A JSON file with two channels](#A-JSON-file-with-two-channels)

## Add data

After setting up your project, add your data. You can add time series data in CSV, TSV, or JSON format to Label Studio. See how to [import data](/guide/tasks.html).

### A CSV file with two channels

For a CSV file with 3 columns:

```csv
time,sensorone,sensortwo
0.0,3.86,0.00
0.1,2.05,2.11
0.2,1.64,5.85
 ```

If the CSV file is hosted in external or cloud storage, create a JSON file that references a URL for the CSV file to upload to Label Studio:
```json
[ { "data": { "csv_url": "s3://example.com/path/to/file.csv" } } ]
```

Because the JSON file references a URL, and the URL is specified in a field called `csv_url`, update your labeling configuration as follows:

```html
  <TimeSeries name="ts" valueType="url" value="$csv_url" sep="," timeColumn="time">
...
```
In this case, the `<TimeSeries>` tag is updated to use the `valueType="url"` attribute because the CSV file is referenced as a URL. See [How to import your data](/guide/tasks.html#How-to-import-your-data).


### A TSV file with two channels

If you're uploading a tab-separated file, use the `sep` attribute on the `TimeSeries` tag to specify tab separation.

For example, update your labeling configuration as follows:
```html
<View>
  <TimeSeries name="ts" valueType="url" value="$csv_url" sep="\t" timeColumn="time">
    <Channel column="0"/>
  </TimeSeries>
</View> 
```

### A CSV or TSV file with no headers

If you want to use a CSV or TSV file with no headers, use numbers to refer to the columns in an index instead. 

For example, if the first column of your file is the time column, do the following:
```html
<TimeSeries timeColumn="0" ... >
```
Use the same method for the `<Channel>` tag `column` attribute. 

### A JSON file with two channels

To import a JSON file with two channels, make sure your file is structured as follows: 
```json
  {
    "ts": {
      "time": [
        15.97, 15.85, 25.94
      ],
      "channelone": [
        13.86, 29.05, 64.90
      ],
      "channeltwo": [
        21.00, 15.18, 35.85
      ]
    }
  }
```

If you structure your data like this, reference `valueType="json"` in your `<TimeSeries>` tag description, and make sure the columns are referenced appropriately in the configuration:
```html
<View>
  <TimeSeries name="ts" valueType="json" timeColumn="time">
    <Channel column="0"/>
  </TimeSeries>
</View> 
```

## Advanced cases

For some advanced cases, the labeling configuration is more complex.

### Time series data with no time column

If you're importing time series data without a time column, Label Studio uses incremental integer values `0, 1, 2, ...` as the time values.

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


## Sample results JSON

After you complete your data labeling project, you can export your data. See [export documentation](export.html) for more details about how you can export your annotated timeseries data.

Example annotation results appear in JSON format like the following example:
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






---
title: TimeSeriesLabels
type: tags
order: 429
meta_title: Time Series Label Tag for Labeling Time Series Data
meta_description: Customize Label Studio for with the TimeSeriesLabel tag to label time series data for machine learning and data science projects.
---

The `TimeSeriesLabels` tag is used to create a labeled time range.

Use with the following data types: time series.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toname | <code>string</code> |  | Name of the timeseries to label |
| [choice] | <code>single</code> \| <code>multiple</code> | <code>single</code> | Configure whether you can select one or multiple labels |
| [maxUsages] | <code>number</code> |  | Maximum number of times a label can be used per task |
| [showInline] | <code>boolean</code> | <code>true</code> | Show labels in the same visual line |
| [opacity] | <code>float</code> | <code>0.9</code> | Opacity of the range |
| [fillColor] | <code>string</code> | <code>&quot;transparent&quot;</code> | Range fill color in hexadecimal or HTML color name |
| [strokeColor] | <code>string</code> | <code>&quot;#f48a42&quot;</code> | Stroke color in hexadecimal |
| [strokeWidth] | <code>number</code> | <code>1</code> | Width of the stroke |

### Example

Basic labeling configuration to apply labels to identified regions of a time series with one channel

```html
<View>
  <TimeSeriesLabels name="label" toName="ts">
      <Label value="Run"/>
      <Label value="Walk"/>
  </TimeSeriesLabels>

  <TimeSeries name="ts" value="$csv" valueType="url">
     <Channel column="first_column"/>
  </TimeSeries>
</View>
```

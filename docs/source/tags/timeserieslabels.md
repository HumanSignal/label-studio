---
title: TimeSeriesLabels
type: tags
order: 427
meta_title: Time Series Label Tags for Labeling Time Series Data
meta_description: Label Studio Time Series Label Tags customize Label Studio for Labeling Time Series Data for machine learning and data science projects.
---

TimeSeriesLabels tag creates labeled time range

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toname | <code>string</code> |  | Name of the timeseries to label |
| [choice] | <code>single</code> \| <code>multiple</code> | <code>single</code> | Configure whether you can select one or multiple labels |
| [maxUsages] | <code>number</code> |  | Maximum available uses of the label |
| [showInline] | <code>boolean</code> | <code>true</code> | Show items in the same visual line |
| [opacity] | <code>float</code> | <code>0.9</code> | Opacity of the range |
| [fillColor] | <code>string</code> |  | Range fill color, default is transparent |
| [strokeColor] | <code>string</code> | <code>&quot;#f48a42&quot;</code> | Stroke color |
| [strokeWidth] | <code>number</code> | <code>1</code> | Width of the stroke |

### Example
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

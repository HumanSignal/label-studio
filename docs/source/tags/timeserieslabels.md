---
title: TimeSeriesLabels
type: tags
order: 425
meta_title: Time Series Label Tags for Labeling Time Series Data
meta_description: Label Studio Time Series Label Tags customize Label Studio for Labeling Time Series Data for machine learning and data science projects.
---

TimeSeriesLabels tag creates labeled time range

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of the element |
| toname | <code>string</code> |  | name of the timeseries to label |
| [choice] | <code>single</code> \| <code>multiple</code> | <code>single</code> | configure if you can select just one or multiple labels |
| [maxUsages] | <code>number</code> |  | maximum available usages |
| [showInline] | <code>boolean</code> | <code>true</code> | show items in the same visual line |
| [opacity] | <code>float</code> | <code>0.9</code> | opacity of range |
| [fillColor] | <code>string</code> |  | range fill color, default is transparent |
| [strokeWidth] | <code>number</code> | <code>1</code> | width of the stroke |

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

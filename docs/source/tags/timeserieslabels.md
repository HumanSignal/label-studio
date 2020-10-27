---
title: TimeSeriesLabels
type: tags
order: 423
---

TimeSeriesLabels tag creates labeled time range

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of the element |
| toname | <code>string</code> |  | name of the timeseries to label |
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

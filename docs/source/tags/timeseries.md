---
title: TimeSeries
type: tags
order: 306
is_new: t
---

TimeSeries tag can be used to label time series data.
Read more about Time Series Labeling on [template page](../templates/time_series.html).

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | name of the element |
| value | <code>string</code> | key used to lookup the data, it needs to reference either URLs for your time-series if valueType=url, otherwise expects JSON |
| [valueType] | <code>string</code> | "url" | "json" If set to "url" then it loads value references inside `value` key, otherwise it expects JSON. Defaults to url |
| [timeColumn] | <code>string</code> | column name or index that provides temporal values, if your time-series data has no temporal column then its automatically generated |
| [timeFormat] | <code>string</code> | pattern used to parse values inside timeColumn, parsing provided by d3 |
| [timeDisplayFormat] | <code>string</code> | if temporal column is date then use d3 to format it, otherwise, if its a number then use d3 number formatting |
| [separator] | <code>string</code> | separator for you CSV file, default is comma "," |
| [overviewChannels] | <code>string</code> | comma-separated list of channels names or indexes displayed in overview |

### Example

csv loaded by url in `value` with 3 columns: time, sensor1, sensor2

```html
<!-- key column `time` is a number actually -->
<View>
  <TimeSeries name="device" value="$timeseries" valueType="url" timeColumn="time">
     <Channel column="sensor1" />
     <Channel column="sensor2" />
  </TimeSeries>
</View>
```
### Example

data stored directly in task's field `ts` as json

```html
<!-- timeseries key (`time`) is date in `timeFormat` formatted as full date on plot (by default) -->
<View>
  <TimeSeries name="device" value="$ts" timeColumn="time" timeFormat="%m/%d/%Y %H:%M:%S">
     <Channel column="sensor1" />
     <Channel column="sensor2" />
  </TimeSeries>
</View>
```

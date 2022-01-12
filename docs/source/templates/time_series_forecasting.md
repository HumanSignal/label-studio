---
title: Time Series Forecasting 
type: templates
category: Time Series Analysis
cat: time-series-analysis
order: 701
meta_title: 
meta_description: 
---

## Labeling Configuration

```html
<View>
    <!-- Control tag for region labels -->
    <Header value="Select predictable region spans in time series:"/>
    <TimeSeriesLabels name="predictable" toName="stock">
        <Label value="Regions" background="red" />
    </TimeSeriesLabels>

    <!-- Object tag for time series data source -->
    <TimeSeries name="stock" valueType="url" value="$csv"
                sep=","
                timeColumn="time"
                timeFormat="%Y-%m-%d %H:%M:%S.%f"
                timeDisplayFormat="%Y-%m-%d"
                overviewChannels="value">

        <Channel column="value"
                 displayFormat=",.1f"
                 strokeColor="#1f77b4"
                 legend="Stock Value"/>
    </TimeSeries>
    <Header value="Forecast next trend:"/>
    <Choices name="trend_forecast" toName="stock">
        <Choice value="Up"/>
        <Choice value="Down"/>
        <Choice value="Steady"/>
    </Choices>
</View>
```
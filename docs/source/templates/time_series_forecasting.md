---
title: Time Series Forecasting 
type: templates
category: Time Series Analysis
cat: time-series-analysis
order: 701
meta_title: Time Series Forecasting Data Labeling Template
meta_description: Template for preparing time series data for forecasting use cases with Label Studio for your machine learning and data science projects.
---

To train a machine learning model to perform forecasting on time series data, create a dataset using this template. This template prompts annotators to highlight predictable region spans in the time series channels and label them as "Regions", then identify the trend forecast for a specific region. 

<div id="main-preview"></div>

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

## Related tags

- [Header](/tags/header.html)
- [TimeSeriesLabels](/tags/timeserieslabels.html)
- [TimeSeries](/tags/timeseries.html)
- [Choices](/tags/choices.html)

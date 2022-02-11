---
title: Time Series Forecasting 
type: templates
category: Time Series Analysis
cat: time-series-analysis
order: 701
meta_title: Time Series Forecasting Data Labeling Template
meta_description: Template for preparing time series data for forecasting use cases with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/time-series-forecasting.png" alt="" class="gif-border" width="552px" height="408px" />

To train a machine learning model to perform forecasting on time series data, create a dataset using this template. This template prompts annotators to highlight predictable region spans in the time series channels and label them as "Regions", then identify the trend forecast for a specific region. 

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <!--Use the Header tag to provide instructions to annotators-->
    <Header value="Select predictable region spans in time series:"/>
    <!--Use the TimeSeriesLabels control tag to provide a way to label
    specific regions on the time series graph-->
    <TimeSeriesLabels name="predictable" toName="stock">
        <Label value="Regions" background="red" />
    </TimeSeriesLabels>

    <!-- Use the TimeSeries object tag to display time series data -->
    <TimeSeries name="stock" valueType="url" value="$csv"
                sep=","
                timeColumn="time"
                timeFormat="%Y-%m-%d %H:%M:%S.%f"
                timeDisplayFormat="%Y-%m-%d"
                overviewChannels="value">
<!--Use the Channel tag to specify the name and format of the time series channel-->
        <Channel column="value"
                 displayFormat=",.1f"
                 strokeColor="#1f77b4"
                 legend="Stock Value"/>
    </TimeSeries>
    <Header value="Forecast next trend:"/>
    <!--Use the Choices control tag to prompt annotators to choose
    the trend for the time series graph-->
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

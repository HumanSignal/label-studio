---
title: Time Series Classification
type: templates
category: Time Series Analysis
cat: time-series-analysis
order: 706
meta_title: Time Series Classification Data Labeling Template
meta_description: Template for classifying time series data with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates-misc/time-series-classification.png" alt="" class="gif-border" width="552px" height="546px" />

If you need to train a machine learning model to classify time series data, create a dataset using this template. This template provides a way for annotators to classify the entire time series signal graph, and an option to classify specific parts of the graph as types of activity. You can combine these classification methods or use only one.

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <Header value="Time Series classification"
            style="font-weight: normal"/>
    <Choices name="pattern" toName="ts">
        <Choice value="Accelerating"/>
        <Choice value="Slowing"/>
    </Choices>
    <TimeSeriesLabels name="label" toName="ts">
        <Label value="Run"/>
        <Label value="Walk"/>
    </TimeSeriesLabels>
    <TimeSeries name="ts" value="$csv" valueType="url">
        <Channel column="first_column"/>
    </TimeSeries>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header value="Time Series classification"
            style="font-weight: normal"/>
```
The `style` parameter overrides the default styling of the header to show a normal font weight instead of bold.

The [Choices](/tags/choices.html) control tag lets annotators classify the entire time series graph:
```xml
<Choices name="pattern" toName="ts">
    <Choice value="Accelerating"/>
    <Choice value="Slowing"/>
</Choices>
```

The [TimeSeriesLabels](/tags/timeserieslabels.html) control tag lets annotators classify specific regions of the time series graph as specific activities:
```xml
<TimeSeriesLabels name="label" toName="ts">
    <Label value="Run"/>
    <Label value="Walk"/>
</TimeSeriesLabels>
```

The [TimeSeries](/tags/timeseries.html) object tag specifies the location of the time series data:
```xml
<TimeSeries name="ts" value="$csv" valueType="url">
    <Channel column="first_column"/>
</TimeSeries>
```

## Related tags
- [Header](/tags/header.html)
- [Choices](/tags/choices.html)
- [TimeSeriesLabels](/tags/timeserieslabels.html)
- [TimeSeries](/tags/timeseries.html)

## Related templates
- [Time Series Labeling](time_series.html)

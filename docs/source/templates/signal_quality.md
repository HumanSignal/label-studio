---
title: Signal Quality 
type: templates
category: Time Series Analysis
cat: time-series-analysis
order: 704
meta_title: Signal Quality Data Labeling Template
meta_description: Template to classify signal quality in a time series with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/signal-quality.png" alt="" class="gif-border" width="552px" height="408px" />

Identify regions on a time series and rate and classify the quality of the signal. 

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html

   
<View>
    <!-- If no region of the time series data is selected, 
    this section is visible on the labeling interface -->
    <View visibleWhen="no-region-selected"
          style="height:120px">

        <!-- Use the TimeSeriesLabels control tag to label 
         specific regions on the time series data. -->
        <TimeSeriesLabels name="label" toName="ts">
            <Label value="Region" background="#5b5"/>
        </TimeSeriesLabels>
    </View>

    <!-- When a region is selected on the labeling interface,
     this section of labeling options is visible to annotators-->
    <View visibleWhen="region-selected" style="height:120px">

        <!-- Use the Rating control tag to prompt annotators
         to select a 10 star scale rating for the selected region-->
        <Rating name="rating" toName="ts"
                maxRating="10" icon="star"
                perRegion="true"/>
        <!-- Use the Choices control tag to prompt annotators
         to select a choice for the selected region-->
        <Choices name="choices" toName="ts"
                 showInline="true" required="true"
                 perRegion="true">
            <Choice value="Good"/>
            <Choice value="Medium"/>
            <Choice value="Poor"/>
        </Choices>
    </View>

    <!-- Use the TimeSeries object tag and the Channel tag to 
     display the TimeSeries data and channels to the annotators. -->
    <TimeSeries name="ts" valueType="url" value="$csv"
                sep="," timeColumn="time">
        <Channel column="signal_1"
                 strokeColor="#17b" legend="Signal 1"/>
        <Channel column="signal_2"
                 strokeColor="#f70" legend="Signal 2"/>
    </TimeSeries>
</View>
```

## Related tags

- [View](/tags/view.html)
- [TimeSeriesLabels](/tags/timeserieslabels.html)
- [Rating](/tags/rating.html)
- [Choices](/tags/choices.html)
- [TimeSeries](/tags/timeseries.html)

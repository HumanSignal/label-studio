---
title: Signal Quality 
type: templates
category: Time Series Analysis
cat: time-series-analysis
order: 704
meta_title: Signal Quality Data Labeling Template
meta_description: Template to classify signal quality in a time series with Label Studio for your machine learning and data science projects.
---

Identify regions on a time series and rate and classify the quality of the signal. 

## Labeling Configuration

```html

   
<View>
    <!-- No region selected section -->
    <View visibleWhen="no-region-selected"
          style="height:120px">

        <!-- Control tag for region labels -->
        <TimeSeriesLabels name="label" toName="ts">
            <Label value="Region" background="#5b5"/>
        </TimeSeriesLabels>
    </View>

    <!-- Region selected section with choices and rating -->
    <View visibleWhen="region-selected" style="height:120px">

        <!-- Per region Rating -->
        <Rating name="rating" toName="ts"
                maxRating="10" icon="star"
                perRegion="true"/>
        <!-- Per region Choices  -->
        <Choices name="choices" toName="ts"
                 showInline="true" required="true"
                 perRegion="true">
            <Choice value="Good"/>
            <Choice value="Medium"/>
            <Choice value="Poor"/>
        </Choices>
    </View>

    <!-- Object tag for time series data source -->
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

- [TimeSeriesLabels](/tags/timeserieslabels.html)
- [Rating](/tags/rating.html)
- [Choices](/tags/choices.html)
- [TimeSeries](/tags/timeseries.html)

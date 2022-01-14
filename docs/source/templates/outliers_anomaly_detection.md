---
title: Outliers and Anomaly Detection
type: templates
category: Time Series Analysis
cat: time-series-analysis
order: 705
meta_title: 
meta_description: 
---



## Labeling Configuration

```html
<View>

    <!-- Object tag for time series data source -->
    <TimeSeries name="ts" valueType="url" value="$csv"
                sep=","
                timeColumn="time"
                timeFormat="%Y-%m-%d %H:%M:%S.%f"
                timeDisplayFormat="%Y-%m-%d"
                overviewChannels="velocity">

        <Channel column="velocity"
                 units="miles/h"
                 displayFormat=",.1f"
                 strokeColor="#1f77b4"
                 legend="Velocity"/>
    </TimeSeries>
    <!-- Control tag for region labels -->
    <TimeSeriesLabels name="label" toName="ts">
        <Label value="Region" background="red" />
    </TimeSeriesLabels>
  <Choices name="region_type" toName="ts"
        perRegion="true" required="true">
      <Choice value="Outlier"/>
      <Choice value="Anomaly"/>
  </Choices>
</View>
```
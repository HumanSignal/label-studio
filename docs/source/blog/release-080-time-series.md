---
title: Label Studio Release Notes 0.8.0 - Time Series Support 
type: blog
order: 99
---

## What problems does Label Studio solve with Time Series Labeling?

Time Series analysis is widely used in medical and robotics areas.  

<GIF-with-labeling-demo>

## Quickstart 

1. You need to install and run Label Studio (LS) first. It could be done by many ways using [pip](https://labelstud.io/guide/#Running-with-pip)
`pip install label-studio && label-studio start my_project --init` 
or using [Docker](https://labelstud.io/guide/#Running-with-Docker), [Github sources](https://labelstud.io/guide/#Running-from-source) and [one-click-deploy](https://github.com/heartexlabs/label-studio#one-click-deploy) button.

2. Open LS in the browser (for local usage it will be [http://localhost:8080](http://localhost:8080) usually).  

3. Go to Setup page ([http://localhost:8080/setup](http://localhost:8080/setup)). On this page you need to configure a labeling scheme for your project using LS tags. Read more about LS tags [in the documentation](/tags/timeseries.html). The fastest way to do it is to use templates which are available on Setup page: 
  <img src="/images/release-080/ts-templates.png" class="gif-border" />

4. Import your CSV/TSV/JSON via Import page ([http://localhost:8080/import](http://localhost:8080/import)).

5. Start Labeling ([http://localhost:8080/](http://localhost:8080/))


## Special cases

### Multiple time series in one labeling config

If you want to use multiple time series tags in one labeling config then you need manually host your CSV files and create JSON with tasks for import which contains links to CSV files. Or you can store time series data in tasks directly. 

### Video & audio sync with time series

It's possible to synchronize TimeSeries with video and audio in Label Studio. Right now you can do it using HyperText tag with html objects `<audio src="path">`/`<video src="path">` and TimeSeries together. We have some solutions for this in testing stage and we can share it with you [by request in slack](https://join.slack.com/t/label-studio/shared_invite/zt-cr8b7ygm-6L45z7biEBw4HXa5A2b5pw).
---
title: FAQ
type: guide
order: 101
---

Frequently asked questions about setup and usage.

## Image/audio/resource loading error while labeling

The most common mistake while resource loading is <b>CORS</b> (Cross-Origin Resource Sharing) problem or Cross Domain. When you are trying to fetch a picture from external hosting it could be blocked by security reasons. Go to browser console (Ctrl + Shift + i for Chrome) and check errors there. Typically, this problem is solved by the external host setup.

<br>
<center>
  <img src='../images/cors-lsf-error.png' style="max-width:300px; opacity: 0.8">
  <br/><br/>
  <img src='/images/cors-error.png' style="max-width:500px; opacity: 0.8">
  <br/><br/>
  <img src='/images/cors-error-2.png' style="max-width:500px; opacity: 0.8">
</center>

* If you have an access to the hosting server as admin then you need to allow CORS for the web server. For nginx you can try to add <a href="javascript:void(0)" onclick="$('#nginx-cors-code').toggle()">these lines</a> to `/etc/nginx/nginx.conf` into your `location` section: 

  <span id="nginx-cors-code" style="display: none"> 
  ```
  location <YOUR_LOCATION> {
       if ($request_method = 'OPTIONS') {
          add_header 'Access-Control-Allow-Origin' '*';
          add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
          #
          # Custom headers and headers various browsers *should* be OK with but aren't
          #
          add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
          #
          # Tell client that this pre-flight info is valid for 20 days
          #
          add_header 'Access-Control-Max-Age' 1728000;
          add_header 'Content-Type' 'text/plain; charset=utf-8';
          add_header 'Content-Length' 0;
          return 204;
       }
       if ($request_method = 'POST') {
          add_header 'Access-Control-Allow-Origin' '*';
          add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
          add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
          add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range';
       }
       if ($request_method = 'GET') {
          add_header 'Access-Control-Allow-Origin' '*';
          add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
          add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
          add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range';
       }
  }
  ```
  </span>
  
* If you use Amazon S3 with LS [read this manual](storage.html#CORS-and-access-problems).

* If you use Google Storage with LS [read this manual](storage.html#CORS-and-access-problems-1).

* Not every host supports CORS setup, but you may to try find these settings in the admin area.      

<br/> 

## How to make pre-annotations & pre-labeling
You can import pre-annotated tasks into LS. Pre-annotations will be automatically shown on Labeling page. Prepare your tasks with `predictions` field which is very similar to `completions` and then import your tasks to LS. [Read more](tasks.html#Basic-format) about task format and predictions.


```json
[{
  "data": {
    "my_text": "Opossum is great" 
  },

  "predictions": [{
    "result": [{
      "from_name": "sentiment_class",
      "to_name": "message",
      "type": "choices",
      "value": {
        "choices": ["Positive"]
      }
    }]
  }]
}]
```

## How to display labels on bounding boxes, polygons and other regions
<center>
  <img src='../images/lsf-settings.png'>
</center>

## How to run LSB with external domain name
 
If you want to run LSB with some domain name you need to use Host, Protocol, Port parameters at LS run. They are responsible for correct URLs while a resource files import (images, audio, etc) and sample tasks generation.   

There are several possible ways to do it:
 
1. Replace these parameters inside of your `project/config.json` (or `label_studio/utils/schema/default_config.json` from LSB package directory).
2. Specify these parameters at start: `label-studio start --host label-studio.example.com --protocol http:// --port 8080`.
3. For docker usage: specify environment variables `HOST`, `PROTOCOL`, `PORT` while docker setup. 

LSB web server always use `0.0.0.0` address for start. But if you really need to change it to `localhost` just set Host as `localhost` and web server will start at `localhost`.  

<br/>
<center>
  <img style="opacity: 0.75" src='../images/host-protocol-port.png'>
</center>

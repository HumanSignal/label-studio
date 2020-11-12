---
title: FAQ
type: guide
order: 106
---

Frequently asked questions about setup and usage.

## Image/audio/resource loading error while labeling

The most common mistake while resource loading is <b>CORS</b> (Cross-Origin Resource Sharing) problem or Cross Domain. When you are trying to fetch a picture from external hosting it could be blocked by security reasons. Go to browser console (Ctrl + Shift + i for Chrome) and check errors there. Typically, this problem is solved by the external host setup.

<br>
<center>
  <img src='../images/cors-lsf-error.png' style="max-width:300px; width: 100%; opacity: 0.8">
  <br/><br/>
  <img src='/images/cors-error.png' style="max-width:500px; width: 100%; opacity: 0.8">
  <br/><br/>
  <img src='/images/cors-error-2.png' style="max-width:500px; width: 100%; opacity: 0.8">
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

## How to make pre-annotations & pre-labeling & predictions
You can import pre-annotated tasks into LS. Pre-annotations will be automatically shown on Labeling page. Prepare your tasks with `predictions` field which is very similar to `completions` and then import your tasks to LS. [Read more](tasks.html#Basic-format) about task format and predictions. The same format of predictions is used for the ML backend output. 
<br>

<center><img src="../images/completions-predictions-scheme.png" style="width: 100%; max-width: 481px; opacity: 0.9"></center>

> Check completion format on Setup page or on Tasks page at `</>` (Show task data) button. Then make `result` field in your prediction is similar to the completion. 

> You need to use different ids within any task elements, completions, predictions and thier `result` items. It's our LSF requirement.

Let's use the following labeling config: 

```xml
<View>
  <Choices name="choice" toName="image" showInLine="true">
    <Choice value="Boeing" background="blue"/>
    <Choice value="Airbus" background="green" />
  </Choices>

  <RectangleLabels name="label" toName="image">
    <Label value="Airplane" background="green"/>
    <Label value="Car" background="blue"/>
  </RectangleLabels>

  <Image name="image" value="$image"/>
</View>
```

After the project setup is finished you can import this task (just copy this right into the input field on the Import page):  

```json
{
  "data": {
    "image": "http://localhost:8080/static/samples/sample.jpg" 
  },

  "predictions": [{
    "result": [
      {
        "id": "result1",
        "type": "rectanglelabels",        
        "from_name": "label", "to_name": "image",
        "original_width": 600, "original_height": 403,
        "image_rotation": 0,
        "value": {
          "rotation": 0,          
          "x": 4.98, "y": 12.82,
          "width": 32.52, "height": 44.91,
          "rectanglelabels": ["Airplane"]
        }
      },
      {
        "id": "result2",
        "type": "rectanglelabels",        
        "from_name": "label", "to_name": "image",
        "original_width": 600, "original_height": 403,
        "image_rotation": 0,
        "value": {
          "rotation": 0,          
          "x": 75.47, "y": 82.33,
          "width": 5.74, "height": 7.40,
          "rectanglelabels": ["Car"]
        }
      },
      {
        "id": "result3",
        "type": "choices",        
        "from_name": "choice", "to_name": "image",
        "value": {
          "choices": ["Airbus"]
        }
      }
    ]
  }]
}
```

In this example there are 3 results inside of 1 prediction: 
 * `result1` - the first bounding box
 * `result2` - the second bounding box
 * `result3` - choice selection 
 
And the result will look as the following: 

<center><img src="../images/predictions-loaded.jpg" style="width: 100%; max-width: 700px"></center>

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


## What units are x, y, width and height for image results?

x, y, width and height are in percents of image dimensions.

Convertation formulas for `x, y, width, height` to pixel units:

```
pixel_x = x / 100.0 * original_width
pixel_y = y / 100.0 * original_height
pixel_width = width / 100.0 * original_width
pixel_height = height / 100.0 * original_height
```

Example: 

```python
task = {
    "completions": [{
        "result": [
            {
                "...": "...",

                "original_width": 600,
                "original_height": 403,
                "image_rotation": 0,

                "value": {
                    "x": 5.33,
                    "y": 23.57,
                    "width": 29.16,
                    "height": 31.26,
                    "rotation": 0,
                    "rectanglelabels": [
                        "Airplane"
                    ]
                }
            }
        ]
    }]
}

# convert from LS percent units to pixels 
def convert_from_ls(result):
    if 'original_width' not in result or 'original_height' not in result:
        return None

    value = result['value']
    w, h = result['original_width'], result['original_height']

    if all([key in value for key in ['x', 'y', 'width', 'height']]):
        return w * value['x'] / 100.0, \
               h * value['y'] / 100.0, \
               w * value['width'] / 100.0, \
               h * value['height'] / 100.0

# convert from pixels to LS percent units 
def convert_to_ls(x, y, width, height, original_width, original_height):
    return x / original_width * 100.0, y / original_height * 100.0, \
           width / original_width * 100.0, height / original_height * 100


# convert from LS
output = convert_from_ls(task['completions'][0]['result'][0])
if output is None:
    raise Exception('Wrong convert') 
pixel_x, pixel_y, pixel_width, pixel_height = output
print(pixel_x, pixel_y, pixel_width, pixel_height)

# convert back to LS 
x, y, width, height = convert_to_ls(pixel_x, pixel_y, pixel_width, pixel_height, 600, 403)
print(x, y, width, height)
```
---
title: Troubleshoot Label Studio
type: guide
order: 109
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

## How to display labels on bounding boxes, polygons and other regions

Click the gear icon when labeling to configure the labeling interface to suit your labeling use case.

<center>
  <img src='../images/lsf-settings.png'>
</center>


## How to run Label Studio with external domain name
 
If you want to run LSB with a domain name, you need to use the Host, Protocol, Port parameters when you start Label Studio. These parameters ensure that the correct URLs are created when importing resource files (images, audio, etc) and generating sample tasks.   

There are several possible ways run Label Studio with an external domain name.
 
- Replace the host, protocol, and port parameters in the `project/config.json` file, or or `label_studio/utils/schema/default_config.json` in the Label Studio package directory.
- Specify the parameters when you start Label Studio: `label-studio start --host label-studio.example.com --protocol http:// --port 8080`.
- For Docker installations, specify the parameters as environment variables `HOST`, `PROTOCOL`, `PORT` when setting up Docker.

The Label Studio web server always uses the `0.0.0.0` address to start. If you really need to change it to `localhost`, set Host to `localhost` and the web server starts at `localhost`.  

> If your external host has a port, e.g.: `77.77.77.77:1234` then you have to specify HOST with the port together `HOST=77.77.77.77:1234`.
<!--then what is the port parameter for?-->

<br/>
<center>
  <img style="opacity: 0.75" src='../images/host-protocol-port.png'>
</center>
<!--add alt text-->


## What units are the x, y, width and height for image results?

x, y, width and height are in percentages of image dimensions.

To convert those percentages to pixels, use the following conversion formulas for `x, y, width, height`:

```
pixel_x = x / 100.0 * original_width
pixel_y = y / 100.0 * original_height
pixel_width = width / 100.0 * original_width
pixel_height = height / 100.0 * original_height
```

For example: 

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



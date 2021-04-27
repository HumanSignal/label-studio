---
title: Troubleshoot Label Studio
type: guide
order: 204
meta_title: Troubleshooting
meta_description: Label Studio Documentation for troubleshooting your machine learning or data science data labeling project.
---

If you encounter an issue using Label Studio, use this page to troubleshoot it. 

## Blank page when loading a project

After starting Label Studio and opening a project, you see a blank page. Several possible issues could be the cause.

### Cause: Host not recognized

If you specify a host without a protocol such as `http://` or `https://` when starting Label Studio, Label Studio can fail to locate the correct files to load the project page. 

To resolve this issue, update the host specified as an environment variable or when starting Label Studio. See [Start Label Studio](start.html)


## Slowness while labeling

If you're using the SQLite database and another user imports a large volume of data, labeling might slow down for other users on the server due to the database load. 

If you want to upload a large volume of data (thousands of items), consider doing that at a time when people are not labeling or use a different database backend such as PostgreSQL or Redis. You can run Docker Compose from the root directory of Label Studio to use PostgreSQL: `docker-compose up -d`, or see [Sync data from cloud or database storage](storage.html). 


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
  
* If you use Amazon S3 with LS [read this manual](storage.html#CORS-and-access-problems).

* If you use Google Storage with LS [read this manual](storage.html#CORS-and-access-problems-1).

* Not every host supports CORS setup, but you may to try find these settings in the admin area.      

<br/> 

## Audio wave doesn't match annotations

If you find that after annotating audio data, the visible audio wave doesn't match the timestamps and the sound, try converting the audio to a different format. For example, if you are annotating mp3 files, try converting them to wav files.

```bash
ffmpeg -y -i audio.mp3 -ar 8k -ac 1 audio.wav
```




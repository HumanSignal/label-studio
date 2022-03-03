---
title: Troubleshoot Label Studio
short: Troubleshooting
type: guide
order: 210
meta_title: Troubleshoot Label Studio
meta_description: Troubleshoot common issues with Label Studio configuration and performance so that you can return to your machine learning and data science projects.
---

If you encounter an issue using Label Studio, use this page to troubleshoot it. 
- If you need to troubleshoot a machine learning backend, see [Troubleshoot machine learning](ml_troubleshooting.html). 
- If you need to troubleshoot a cloud or external storage connection, see [Troubleshoot CORS and access problems](storage.html#Troubleshoot-CORS-and-access-problems). 

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

- If you have access to the hosting server as admin then you need to allow CORS for the web server. For example, on nginx, you can try to add <a href="javascript:void(0)" onclick="$('#nginx-cors-code').toggle()">these lines</a> to `/etc/nginx/nginx.conf` into your `location` section:
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

- If you use Amazon S3 with Label Studio, see [Troubleshoot CORS and access problems](storage.html#Troubleshoot-CORS-and-access-problems).
- If you use Google Cloud Storage with Label Studio, see [Troubleshoot CORS and access problems](storage.html#Troubleshoot-CORS-and-access-problems).
- If you serve your data from an HTTP server created like follows: `python -m http.server 8081 -d`, run the following from the command line:
```bash
npm install http-server -g
http-server -p 3000 --cors
```

Not every host supports CORS setup, but you can to try locate CORS settings in the admin area of your host configuration.      

<br/> 

## Audio wave doesn't match annotations

If you find that after annotating audio data, the visible audio wave doesn't match the timestamps and the sound, try converting the audio to a different format. For example, if you are annotating mp3 files, try converting them to wav files.

```bash
ffmpeg -y -i audio.mp3 -ar 8k -ac 1 audio.wav
```

## HTML label offsets are in the wrong places

If the offsets for exported HTML labels don't match your expected output, such as with HTML named entity recognition (NER) tasks, the most common reason why is due to HTML minification. When you upload HTML files to Label Studio for labeling, the HTML is minified to remove whitespace. When you annotate those tasks, the offsets for the labels apply to the minified version of the HTML, rather than the original unmodified HTML files. 

To prevent the HTML files from being minified, you can use a different import method. See [Import HTML data](tasks.html#Import-HTML-data) for more.

If you want to correct existing annotations, you can minify your source HTML files in the same way that Label Studio does. The minification is performed with the following script:
```python
import htmlmin

with open("sample.html", "r") as f:
html_doc = f.read()

minified_html_doc = htmlmin.minify(html_doc, remove_all_empty_space=True)
```

If minification does not seem to be affecting the offset placements, complex CSS or other reasons could be the cause. 

## Predictions aren't visible to annotators  

See [Troubleshoot pre-annotations](predictions.html#Troubleshoot-pre-annotations) to investigate possible reasons why predictions don't show up.

## Can't label PDF data

Label Studio does not support labeling PDF files directly. However, you can convert files to HTML using your PDF viewer or another tool and label the PDF as part of the HTML. See an example labeling configuration in the [Label Studio playground](/playground/?config=%3CView%3E%3Cbr%3E%20%20%3CHyperText%20name%3D%22pdf%22%20value%3D%22%24pdf%22%2F%3E%3Cbr%3E%3Cbr%3E%20%20%3CHeader%20value%3D%22Rate%20this%20article%22%2F%3E%3Cbr%3E%20%20%3CRating%20name%3D%22rating%22%20toName%3D%22pdf%22%20maxRating%3D%2210%22%20icon%3D%22star%22%20size%3D%22medium%22%20%2F%3E%3Cbr%3E%3Cbr%3E%20%20%3CChoices%20name%3D%22choices%22%20choice%3D%22single-radio%22%20toName%3D%22pdf%22%20showInline%3D%22true%22%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Important%20article%22%2F%3E%3Cbr%3E%20%20%20%20%3CChoice%20value%3D%22Yellow%20press%22%2F%3E%3Cbr%3E%20%20%3C%2FChoices%3E%3Cbr%3E%3C%2FView%3E%3Cbr%3E).

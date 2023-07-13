
# Magic Wand for Image Segmentation

![Magic Wand](/images/screenshots/image_magic_wand.png "Magic Wand")

# Install

## Linux & Ubuntu guide

Install python and virtualenv 

```bash
# install python and virtualenv 
apt install python3.6
pip3 install virtualenv

# setup python virtual environment 
virtualenv -p python3 env3
source env3/bin/activate

# install requirements 
cd backend
pip install -r requirements.txt
```

## Cross Domain Image Access

Note that if you are storing images that you'd like to apply the Magic Wand to cross-domain, such as on Google Storage Buckets, you will have to [enable CORS headers for the storage buckets to enable cross-domain pixel access](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image) so that the Magic Wand can get the raw pixel data to threshold. By default browsers block JavaScript from accessing pixel-level image data unless the right CORS headers are set.

As an example, if you wanted to configure a Google Storage Bucket with the right headers, you might do the following:

```bash
gsutil cors set gcp_cors_config.json gs://BUCKET-NAME
```

Note that in the gcp_cors_config.json example given in this directory that we have set `origin` to `*`, which means all origins can access that data, as well as set `responseHeader` to `*`, which means all HTTP response headers can be accessed. In a real scenario you probably want to think through the security ramifications of this for your own particular Label Studio setup.

# Start

Magic Wand for image segmentation:

```bash
fflag_feat_front_dev_4081_magic_wand_tool=1 python server.py -c config.json -l ../examples/image_magic_wand/config.xml -i ../examples/image_magic_wand/tasks.json -o output
```


# Image Polygons

![Image Polygons](/images/screenshots/image_polygons.png "Image Polygons")

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

# Start

Image Polygons

```bash
python server.py -c config.json -l ../examples/image_polygons/config.xml -i ../examples/image_polygons/tasks.json -o output
```

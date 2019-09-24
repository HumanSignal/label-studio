
# Image object detection 

![Image object detection](https://user.fm/files/v2-04a15361580d038bd9392a225e2569e4/Screen%20Shot%202019-08-01%20at%2011.38.16%20PM.png "Image BBox")

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

Image bounding box labeling

```bash
python server.py -c config.json -l ../examples/image_multilabel/config.xml -i ../examples/image_multilabel/tasks.json -o output
```

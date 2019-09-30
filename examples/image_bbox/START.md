
# Image object detection 

![Image Object Detection](/images/screenshots/image_bbox.png "Image Object Detection")

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
python server.py -c config.json -l ../examples/image_bbox/config.xml -i ../examples/image_bbox/tasks.json -o output
```

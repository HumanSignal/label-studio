
# Image KeyPoints

![Image KeyPoints](/images/screenshots/image_keypoints.png "Image KeyPoints")

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

Key points for the images

```bash
python server.py -c config.json -l ../examples/image_keypoints/config.xml -i ../examples/image_keypoints/tasks.json -o output
```

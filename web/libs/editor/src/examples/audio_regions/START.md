
# Audio Regions

![Audio Regions](/images/screenshots/audio_regions.png "Audio Regions")

> For audio regions to work when you have remote URLs, you need to configure CORS to be wide-open

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

Listen to the audio file and classify

```bash
python server.py -c config.json -l ../examples/audio_regions/config.xml -i ../examples/audio_regions/tasks.json -o output
```

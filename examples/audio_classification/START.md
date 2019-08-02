
# Audio Classification

![Audio Classification](https://user.fm/files/v2-70ded6823222ef7f5291482df9ce39c2/Screen%20Shot%202019-08-01%20at%209.21.12%20PM.png "Audio Classification")

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
python server.py -c config.json -l ../examples/audio_classification/config.xml -i ../examples/audio_classification/tasks.json -o output
```

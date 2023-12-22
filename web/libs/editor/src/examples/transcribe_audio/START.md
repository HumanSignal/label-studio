
# Transcribe an Audio

![Transcribe an Audio](https://user.fm/files/v2-e1f1d31d32db73c07d20a96a78758623/Screen%20Shot%202019-08-01%20at%209.39.54%20PM.png "Transcribe an Audio")

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

Listen to an audio file and transcribe its content in natural language

```bash
python server.py -c config.json -l ../examples/transcribe_audio/config.xml -i ../examples/transcribe_audio/tasks.json -o output
```

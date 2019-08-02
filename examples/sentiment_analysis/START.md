
# Sentiment Analysis 

![Sentiment Analysis UI](https://user.fm/files/v2-c739eea809a0fde9c90675a2396f577e/Screen%20Shot%202019-08-01%20at%209.17.04%20PM.png "Sentiment Analysis UI")

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

Classify sentiment of reviews for musical instruments found on Amazon

```bash
python server.py -c config.json -l ../examples/sentiment_analysis/config.xml -i ../examples/sentiment_analysis/tasks.json -o output
```

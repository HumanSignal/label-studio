
# Sentiment Analysis 

![Sentiment Analysis](/images/screenshots/text_classification.png "Sentiment Analysis")

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

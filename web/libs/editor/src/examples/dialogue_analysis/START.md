
# Dialogue Analysis

![Dialogue Analysis](/images/screenshots/chatbot_analysis.png "Dialogue Analysis")

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

Analyze the chat dialog, classify it and provide your own answer

```bash
python server.py -c config.json -l ../examples/chatbot_analysis/config.xml -i ../examples/chatbot_analysis/tasks.json -o output
```

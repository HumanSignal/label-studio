
# Named Entity Recognition

![Named Entity Recognition](https://user.fm/files/v2-cfb599a352fe6c17d209599ce95e7e25/Screen%20Shot%202019-08-01%20at%209.48.24%20PM.png "Named Entity Recognition")

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

Named entity recognition for a piece of text

```bash
python server.py -c config.json -l ../examples/named_entity/config.xml -i ../examples/named_entity/tasks.json -o output
```

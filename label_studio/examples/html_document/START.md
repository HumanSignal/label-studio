
# HTML Document Annotation

![HTML Document Annotation](/images/screenshots/html_document.png "HTML Document Annotation")

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

Named entity recognition for a piece of html markup

```bash
python server.py -c config.json -l ../examples/html_document/config.xml -i ../examples/html_document/tasks.json -o output
```

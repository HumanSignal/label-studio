#!/usr/bin/env bash
virtualenv -p python3 env3
source env3/bin/activate
pip install -r requirements.txt
python server.py

echo "Server started"
echo "Go to http://localhost:8200"
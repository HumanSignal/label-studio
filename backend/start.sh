#!/usr/bin/env bash
if command -v python3 &>/dev/null; then

    virtualenv -p python3 env3
    source env3/bin/activate
    pip install -r requirements.txt
    python server.py

    echo "Server started"
    echo "Go to http://localhost:8200"

else
    echo "Python 3 is not installed. Or you can try patch this script to Python 2 (change python3 to python2)"
fi

#!/usr/bin/env bash

# run this script to setup virtual env,
# install everything and start label-studio locally

cd ..

if command -v python3 &>/dev/null; then

    virtualenv -p python3 env3
    source env3/bin/activate
    pip install -r requirements.txt
    pip install -e .
    cd label_studio
    python server.py start my_project --init

    echo "Server started"
    echo "Go to http://localhost:8200"

else
    echo "Python 3 is not installed. Or you can try patch this script to Python 2 (change python3 to python2)"
fi

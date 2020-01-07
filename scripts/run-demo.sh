#!/usr/bin/env bash
example_dir=$1
port=$2

python server.py \
    -p $port \
    -i ../examples/$example_dir/tasks.json \
    -o ../examples/$example_dir/completions \
    -l ../examples/$example_dir/config.xml

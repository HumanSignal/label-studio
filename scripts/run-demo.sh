#!/usr/bin/env bash
example_dir=$1

python server.py \
    -i ../examples/$example_dir/tasks.json \
    -o ../examples/$example_dir/completions \
    -l ../examples/$example_dir/config.xml

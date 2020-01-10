#!/usr/bin/env bash
example_dir=$1

python label_studio/server.py \
    -p ${PORT:-8200} \
    -i examples/$example_dir/tasks.json \
    -o examples/$example_dir/completions \
    -l examples/$example_dir/config.xml

#!/usr/bin/env bash
mkdir -p backend/label_studio/static/editor/js
mkdir -p backend/label_studio/static/editor/css

cp -r build/static/js/* backend/label_studio/static/editor/js/
cp -r build/static/css/* backend/label_studio/static/editor/css/
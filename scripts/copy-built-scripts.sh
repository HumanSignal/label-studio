#!/usr/bin/env bash
mkdir -p backend/static/editor/js
mkdir -p backend/static/editor/css

cp -r build/static/js/* backend/static/editor/js/
cp -r build/static/css/* backend/static/editor/css/
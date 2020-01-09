---
title: Docker
type: guide
order: 2020
---

## Build docker

```bash
docker build -t label-studio
```

## Run docker
```bash
docker run -p 8200:8200 -t -i heartexlabs/label-studio -c config.json -l ../examples/chatbot_analysis/config.xml -i ../examples/chatbot_analysis/tasks.json -o output
```
---
title: Project setup
type: guide
order: 102
---

## Overview

**Project** is a directory where all annotation assets are located. It is a self-contained entity: when you start Label Studio for the first time e.g. `label-studio start ./my_project --init`,
it creates a directory `./my_project` from the place of launch. 
If you want to start another project, just remove `./my_project` directory, or create a new one by running `label-studio start /path/to/new/project --init`.

**Project directory** is structured as follows:

```bash
├── my_project
│   ├── config.json     // project settings
│   ├── tasks.json      // all imported tasks in a dict like {task_id: task}
│   ├── config.xml      // current project labeling config
│   ├── completions     // directory with one completion per task_id stored in one file
│   │   ├── <task_id>.json
│   ├── export          // stores archives with all results exported form web UI 
│   │   ├── 2020-03-06-15-23-47.zip
```

> Warning: It is not recommended to modify any of the internal project files. For importing tasks, exporting completions or changing label config please use web UI or command line arguments (see `label-studio start --help` for details)

## Labeling config
Project labeling config is an XML file consists of 
- **object tags** specifying input data sources from imported tasks,
- **control tags** for configuring labeling schema (how annotation result looks like)
- **visual tags** applying different user interface styles

[Check all tags available](/tags).

#### Example
Here an example of XML config for classifying images exposed by task data key `image_url` onto Cats & Dogs:

```xml
<Image name="image_object" value="$image_url"/>
<Choices name="image_classes" toName="image_object">
    <Choice value="Cat"/>
    <Choice value="Dog"/>
</Choices>
```

## Setup from file

It is possible to create `config.xml` with labeling config and initialize project:

```bash
label-studio my_new_project start --init --label-config config.xml
```

## Setup from UI

You can also use the web interface at [`/setup`](http://localhost:8200/setup) to paste your labeling config.

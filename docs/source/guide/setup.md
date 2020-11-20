---
title: Project setup
type: guide
order: 101
---

**Project** is a directory where all annotation assets are located. It is a self-contained entity: when you start Label Studio for the first time e.g. `label-studio start ./my_project --init`,
it creates a directory `./my_project` from where its launched.

If you want to start another project, just remove `./my_project` directory, or create a new one by running `label-studio start /path/to/new/project --init`.

## Structure

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

Project labeling config is an XML file that consists of:

- **object tags** specifying input data sources from imported tasks,
- **control tags** for configuring labeling schema (how annotation result looks like),
- **visual tags** applying different user interface styles.

<a class="button" href="/tags">Check Available Tags</a>

#### Example

Here an example config for classifying images provided by `image_url` key into two classes:

```html
<View>
  <Image name="image_object" value="$image_url"/>
  <Choices name="image_classes" toName="image_object">
    <Choice value="Cat"/>
    <Choice value="Dog"/>
  </Choices>
</View>
```

### Setup labeling config from file

It is possible to initialize a new project with predefined `config.xml`:

```bash
label-studio my_new_project start --init --label-config config.xml
```

### Setup labeling config from UI

You can also use the web interface at [`/setup`](http://localhost:8080/setup) to paste your labeling config. Using web UI you also get a live update while you're editting the config.



### Setup labeling config from API

You can configure your labeling config via server API. Check [Backend API page](api.html) for more details.
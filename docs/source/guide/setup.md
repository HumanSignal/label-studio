---
title: Start annotation
type: guide
order: 102
---

## Quickstart

To start annotating your data, you have to

- [Import your data](/guide/tasks.html)
- Select any of predefined annotation _project_ template on **Setup** page.

<div style="margin:auto; text-align:center; width:100%"><img src="/images/setup-page.png"/></div>

For more advanced configuration, please address to [this section](#Labeling-config).

## Command line arguments

Label Studio app is a highly configurable engine for any of your annotation ideas. Most of the configuration part you can carry on web UI, but sometimes it becomes easier to set up something once on the launch.
To look over all possible parameters you can specify on Label Studio launch, run:

```bash
label-studio start --help
```

## Labeling interface

Let's explore the complex example of multi-task labeling which includes text + image + audio data objects:
<br>

<img src="/images/labeling.png">

* Labeling interface is implemented using JavaScript + React and placed to separated repository [Label Studio Frontend](https://github.com/heartexlabs/label-studio-frontend). Label Studio has integrated Label Studio Frontend build. 

* Labeling interface is highly configurable: you can enable or disable some parts of it (completions panel, predictions panel, results panel, controls, submit & skip buttons).  


### Instructions

Most of the actions described in this section are similar for all the data objects (images, audio, text, etc.).

### Choices, TextArea and other simple tags
Such tags have straightforward labeling mechanics. It’s intuitive for users, so let’s talk about more complex things below. 

### Add region
1. Select label you want to add (if you use Tag without labels like Polygon, just go to 2)
2. Click on your data object (image, audio, text, etc) 

### Change label
You can change the label of the existing region:
1. Select entity (span, bounding box, image segment, audio region, etc)
2. Select a new label

### Delete entity
1. Select entity 
2. Press Backspace or go to Results panel and remove selected item 

### Add relation

You can create relations between two results with  
 * direction 
 * and labels ([read more about relations with labels](/tags/relations.html))

<br>
<img src="/images/screens/relations.png">

1. Select a first region (bounding box, text span, etc)
2. Click on "Create Relation" button
3. Select the second region
4. **Optionally**: After the relation is created you can change the direction by click on the direction button
4. **Optionally**: [If you've configured labels](/tags/relations.html), click on the triple dots button and add your predefined labels

### Hotkeys
Use hotkeys to improve your labeling performance. Hotkeys help is available in the labeling settings dialog.

<table>
<tr><th>Key</th><th>Description</th></tr>
<tr><td>ctrl+enter</td><td>Submit a task</td></tr>
<tr><td>ctrl+backspace</td><td>Delete all regions</td></tr>
<tr><td>escape</td><td>Exit relation mode</td></tr>
<tr><td>backspace</td><td>Delete selected region</td></tr>
<tr><td>alt+shift+$n</td><td>Select a region</td></tr>
</table>


## Project structure

**Project** is a directory where all annotation assets are located. It is a self-contained entity: when you start Label Studio for the first time e.g. `label-studio start ./my_project --init`,
it creates a directory `./my_project` from where its launched.

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


## Sampling

You can define the way of how your imported tasks are exposed to annotators. Several options are available. To enable one of them, specify `--sampling=<option>` as command line option.

#### sequential

Tasks are ordered ascending by their `"id"` fields. This is default mode.

#### uniform

Tasks are sampled with equal probabilities.

#### prediction-score-min

Task with minimum average prediction score is taken. When this option is set, `task["predictions"]` list should be presented along with `"score"` field within each prediction.

#### prediction-score-max

Task with maximum average prediction score is taken. When this option is set, `task["predictions"]` list should be presented along with `"score"` field within each prediction.


### Setup labeling config from API

You can configure your labeling config via server API. Check [Backend API page](api.html) for more details.
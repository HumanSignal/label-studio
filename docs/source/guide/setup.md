---
title: Set up your labeling project
type: guide
order: 104
---

All labeling activities in Label Studio occur in the context of a project. 

## Customize the labeling interface for your project

Configure the labels and task type for annotators using the templates included with Label Studio or by defining your own combination of tags to customize the labeling interface for your project. 

### Select one of the available templates or customize one

You can select or customize a [labeling config template](https://labelstud.io/templates/) or use a custom configuration that you create. If you create a custom configuration that might be useful to other Label Studio users, consider [contributing the configuration as a template](https://github.com/heartexlabs/label-studio/tree/master/label_studio/examples).

The labeling configuration for a project is an XML file that contains three types of tags specific to Label Studio.

| Tag type | When to use |
| --- | --- |
| Object | Specify the data type and input data sources from your dataset. |
| Control | Configure how the annotation results appear. |
| Visual | Define how the user interface looks for labeling. | 

Combine these tags to create a custom label configuration for your dataset. 

<a class="button" href="/tags">See All Available Tags</a>

### Example labeling config

For example, to classify images that are referenced in your data as URLs into one of two classes, Cat or Dog, use this example labeling config: 
```html
<View>
  <Image name="image_object" value="$image_url"/>
  <Choices name="image_classes" toName="image_object">
    <Choice value="Cat"/>
    <Choice value="Dog"/>
  </Choices>
</View>
```

This labeling config references the image resource in the [Image](https://labelstud.io/tags/image.html) object tag, and specifies the available labels to select in the [Choices](https://labelstud.io/tags/choices.html) control tag.

If you want to customize this example, such as to allow labelers to select both Cat and Dog labels for a single image, modify the parameters used with the [Choices](https://labelstud.io/tags/choices.html) control tag:

```html

<View>
  <Image name="image_object" value="$image_url"/>
  <Choices name="image_classes" toName="image_object" choice="multiple">
    <Choice value="Cat"/>
    <Choice value="Dog"/>
  </Choices>
</View>
```

### Set up labeling config from file
You can define the labeling configuration in a `config.xml` file and initialize a project in Label Studio with that file. 

```bash
label-studio my_new_project start --init --label-config config.xml
```

### Set up labeling config in the Label Studio UI 

Set up the labeling config on the [`/settings`](http://localhost:8080/settings) page of the Label Studio UI. As you update the configuration, a live preview displays how your configuration looks to labelers. 

### Set up labeling config with the API

You can configure your labeling configuration with the server API. See the [Backend API](api.html) documentation for more details.


## Where Label Studio stores your project data and configurations


All labeling activities in Label Studio occur in the context of a project. 

When you start Label Studio for the first time, it launches from a project directory that Label Studio creates, called `./my_project` by default.

`label-studio start ./my_project --init`


## Set up multiple projects

To start another project in Label Studio, remove the `./my_project` directory and start over, or create an additional project with a different directory by running `label-studio start /path/to/new/project --init` from the command line. 

You can also use Label Studio in multi-session mode. See [Install Label Studio](tasks.html) for more. 

### Project directory structure

The project directory is structured as follows: 
```
├── my_project
│   ├── config.json     // project settings
│   ├── tasks.json      // all imported tasks in a JSON dictionary: {task_id: task}
│   ├── config.xml      // labeling config for the current project
│   ├── completions     // directory with all completed annotations stored in one file for each task_id 
│   │   ├── <task_id>.json
│   ├── export          // stores archives with all results exported from Label Studio UI 
│   │   ├── 2020-03-06-15-23-47.zip
```

> Warning: Modifying any of the internal project files is not recommended and can lead to unexpected behavior. Use the Label Studio UI or command line arguments (run `label-studio start --help`) to import tasks, export completed annotations, or to change label configurations. 



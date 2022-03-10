---
title: Set up your labeling interface
type: guide
order: 401
meta_title: Set up labeling config interface
meta_description: Customize and configure your data labeling and annotation interface with templates or custom tag combinations in the Label Studio UI for your machine learning and data science projects.
---

All labeling activities in Label Studio occur in the context of a project. After you [create a project](setup_project.html#Create-a-project) and [import data](tasks.html), set up the labeling interface and labeling configuration for your project. This setup process is essential to your labeling project. 

## Set up the labeling interface for your project

Configure the labels and task type for annotators using the templates included with Label Studio or by defining your own combination of tags to set up the labeling interface for your project. 

1. Select a template from the [available templates](/templates) or customize one.
2. Label Studio automatically selects the field to label based on your data. If needed, modify the selected field. 
3. Add label names on new lines. 
4. (Optional) Choose new colors for the labels by clicking the label name and choosing a new color using the color selector.
5. Configure additional settings relevant to the labeling interface functionality. For example, when labeling text you might have the option to **Select text by words**. 
6. Click **Save**. 

### Modify the labeling interface 
You can make changes to the labeling interface and configuration in the project settings.

> **Note:** You cannot remove labels or change the type of labeling being performed unless you delete existing annotations using those labels.

1. In Label Studio UI, open the project you want to modify.
2. Click **Settings**.
3. Click **Labeling Interface**.
4. Browse templates, update the available labels, or use the `Code` option to further customize the interface using [tags](/tags).

> If you make changes to the labeling configuration, any tabs that you might have created in the data manager are removed. 

## Customize a template

You can customize a [labeling config template](/templates) or use a custom configuration that you create from scratch using [tags](/tags). If you create a custom configuration that might be useful to other Label Studio users, consider [contributing the configuration as a template](https://github.com/heartexlabs/label-studio/tree/master/label_studio/examples).

The labeling configuration for a project is an XML file that contains three types of tags specific to Label Studio.

| Tag type | When to use |
| --- | --- |
| Object | Specify the data type and input data sources from your dataset. |
| Control | Configure what type of annotation to perform and how the results of annotation appear. |
| Visual | Define how the user interface looks for labeling. | 

You can combine these tags to create a custom label configuration for your dataset. 

<a class="button" href="/tags">See All Available Tags</a>

### Example labeling config

For example, to classify images that are referenced in your data as URLs (`$image_url`) into one of two classes, Cat or Dog, use this example labeling configuration: 
```xml
<View>
  <Image name="image_object" value="$image_url"/>
  <Choices name="image_classes" toName="image_object">
    <Choice value="Cat"/>
    <Choice value="Dog"/>
  </Choices>
</View>
```

This labeling configuration references the image resource in the [Image](/tags/image.html) object tag, and specifies the available labels to select in the [Choices](/tags/choices.html) control tag.

If you want to customize this example, such as to allow labelers to select both Cat and Dog labels for a single image, modify the parameters used with the [Choices](/tags/choices.html) control tag:

```xml
<View>
  <Image name="image_object" value="$image_url"/>
  <Choices name="image_classes" toName="image_object" choice="multiple">
    <Choice value="Cat"/>
    <Choice value="Dog"/>
  </Choices>
</View>
```

## Set up labeling config in other ways

If you want to specify a labeling configuration for your project without using the Label Studio UI, you can use the command line or the API. 

### Add a labeling config from the command line
You can define the labeling configuration in a `config.xml` file and initialize a specific project in Label Studio with that file. 

```bash
label-studio my_new_project start --label-config config.xml
```

### Add a labeling config with the API
You can configure your labeling configuration with the server API. See the [Backend API](api.html) documentation for more details.

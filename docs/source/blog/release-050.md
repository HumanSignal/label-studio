---
title: Label Studio Release Notes 0.5.0
type: blog
order: 102
---

## Label Studio Frontend

### Image Segmentation

Initial implementation of the image segmentation using masks. You get two controls, brush with configurable size, and eraser. The output format is RLE implemented by [rle-pack](https://www.npmjs.com/package/@thi.ng/rle-pack) library.

There is a [new template]() available that provides more information about the setup.

### Relations labeling

You can create relations between labeled regions. For example, if you put two bounding boxes, you can connect them with a relation. We've extended the functionality to include the direction of the relation, and the possibly label the relation. Here is an example config for that:

```html
<View>
  <Relations>
    <Relation value="Is A" />
    <Relation value="Has Function" />
    <Relation value="Involved In" />
    <Relation value="Related To" />
  </Relations>
  <Labels name="lbl-1" toName="txt-1">
    <Label value="Subject"></Label>
    <Label value="Object"></Label>
  </Labels>
  <Text name="txt-1" value="$text"></Text>
</View>
```

### Named Entity Recognition performance

NER got an update, nested entities representation is more apparent now, and it's optimized to support large texts.

<br>
<img src="/images/release-050-ner.png">

### Changing the labels

Changing the labels of the existing regions is now easy and supported for any of the data types.

### Validate labeling before submitting

Simple validation to protect you from empty results. When choices or labels are required you can specify `required=true` parameter for the <Labels/> or <Choices/> tag.

### Labels and Choices now support more markup

That enables you to build more complex interfaces. Here is an example that puts labels into different groups:

<br>
<img src="/images/release-050-views.png" style="max-width: 732px">

```html
<View>
  <Choices name="label" toName="audio" required="true" choice="multiple" >
    <View style="display: flex; flex-direction: row; padding-left: 2em; padding-right: 2em; margin-bottom: 3em">
      <View style="padding: 1em 4em; background: rgba(255,0,0,0.1)">
        <Header size="4" value="Speaker Gender" />
        <Choice value="Business" />
        <Choice value="Politics" />
      </View>
      <View style="padding: 1em 4em; background: rgba(255,255,0,0.1)">
        <Header size="4" value="Speach Type" />
        <Choice value="Legible" />
        <Choice value="Slurred" />
      </View>
      <View style="padding: 1em 4em; background: rgba(0,0,255,0.1)">
        <Header size="4" value="Additional" />
        <Choice value="Echo" />
        <Choice value="Noises" />
        <Choice value="Music" />
      </View>
    </View>
  </Choices>
  <Audio name="audio" value="$url" />
</View>
```

### Image Ellipses labeling

A significant contribution from @lrlunin, implementing ellipses labeling for the images, checkout the [template]().

### Misc

- **zoomControl, brightnessControl and contrastControl for the image tag** - zoom has been available for sometime, but now there is an additional toolbar that can be created if one of the above params is provided to the <Image/> tag.

- **select each region with shift+alt+number** - hotkeys to quickly navigate the regions

- **settings now show the hotkeys** - show the defined and available hotkeys inside the Hotkeys tab in the Settings

- **simplifying the creation of concave polygons** - polygons are not closed unless fully defined, that enables you to create concave polygons easily

- **HyperText works with it's body** now you can put in html right into the HyperText tag, here is an example config:

```html
<View>
  <HyperText><h1>Hello</h1></HyperText>
</View>
```


## Label Studio Backend

### Multiplatform

Support for Windows, MacOSX, Linux with Python 3.5 or greater

### Extended import possibilities

The are now several ways on how you can import your tasks for labeling:

- uploading files via [web UI](http://localhost:8200/import)
- by [specifying path](/guide/tasks.html#Import-formats) to a file or directory with images, audios or text files on Label Studio initialization
- using [import API](/guide/tasks.html#Import-using-API)

### On-the-fly labeling config validation

Previously changing a config after importing or labeling tasks could be dangerous because of created tasks/completions invalidation, therefore this was switched off. Now you should not worry about that - labeling config validation is taken on the fly considering the data already created. You can freely change the appearance of your project on [setup page](http://localhost:8200/setup) and even add new labels - when you modify something crucial, you'll be alerted about.

### Exporting with automatic converters

When finishing your project - go to the [export page](http://localhost:8200/export) and choose in between the [common export formats](/guide/completions.html#Export-formats) valid for your current project configuration.

### Connection to running Machine Learning backend

[Connecting to a running machine learning backend](/guide/ml.html) gives your an opportunity to constantly retrain your model and visually inspect how its predictions behaves on tasks. Just specify ML backend URL when launching Label Studio, and start labeling.

## Miscellanious

### Docker support

Now Label Studio is also maintained and distributed as Docker container - [run one-liner](/guide/index.html#Running-with-Docker) to build your own cloud labeling solution.

### Multisession mode

You can launch Label Studio in [multisession mode](/guide/#Multisession-mode) - then each browser session dynamically creates its own project. 

---
title: Use tags and parameters when customizing the labeling interface
short: Tags and parameters
type: guide
tier: all
order: 207
order_enterprise: 107
meta_title: Tags and parameters
meta_description: A beginner's guide to what is included in a labeling interface
section: "Labeling"
parent: "setup"
parent_enterprise: "setup"
date: 2024-02-26 16:40:52
---


The interface is defined using XML-like [tags](/tags), which determine how the data is presented to users and what annotation tools are available to them. 

You can customize a [labeling config template](/templates) or use a custom configuration that you create from scratch using [tags](/tags). If you create a custom configuration that might be useful to other Label Studio users, consider [contributing the configuration as a template](https://github.com/heartexlabs/label-studio/tree/develop/label_studio/annotation_templates).

!!! info Tip
    The best way to get acquainted with the labeling interface is to create a test project and then go to **Settings > Labeling interface**. From here you can browse the Label Studio template library and then modify each template to suit your needs (your changes will not affect the template library for your organization). 

    For more information about each template available, see our [Templates reference](/templates). 
    
    For more information about each tag available for the labeling interface, see our [Tag reference](/tags). 

## Tags

Tags can be broadly categorized into several types. 

<dl>

<dt>View tag</dt>

<dd>

The `<View>` tag is the root element of the configuration, wrapping all other tags and defining the overall layout of the labeling interface.

You can also have nested `<View>` tags that you use for styling segments of the labeling interface. 

</dd>

<dt>Object tags</dt>

<dd>

The object is the data you are labeling (the image, video, text, and so on). 

Your labeling configuration must include at least one object tag to specify the type of data you are labeling. For example, if you are drawing regions on images, the object tag for your labeling configuration will likely be the [Image tag](/tags/image). If you are labeling frames from a video, then your object tag choice would be the [Video tag](/tags/video).

Each object tag must have a unique name attribute and a value attribute that so that you can “point” to it from elsewhere within the labeling configuration. You can read more about this in [Parameters](#Parameters) below. 

</dd>

<dt>Control tags</dt>

<dd>

Control tags define the annotation tools available when annotating the data that is defined in the object tag. 

Common control tags are `<Labels>`, `<Choices>`, or `<TextArea>`. Control tags are linked to object tags using the `toName` attribute, which should match the `name` attribute of the corresponding object tag.

</dd>

<dt>Visual tags</dt>

<dd>

Visual tags are not always used, but can help you control the presentation of specific labeling options or add visual elements like headers to the interface.

</dd>

</dl>

##### Example

For example, let's build a simple tag interface, beginning with the following tag structure (note that this example is not usable until you add the required parameters):

```xml

<View>
  <Image />
  <Rectangle />
  <Header />
</View>

```
* The `View` tag wraps the labeling interface. 

* The object tag is `Image`. This tells Label Studio that users will be annotating an image file.  

* The control tag is `Rectangle`. This tells Label Studio to provide users with the tools to draw a rectangle.  

* The `Header` tag is a visual tag and displays a text header in the labeling interface. It is optional, and you can use it to provide some additional information to the user. 

Note that the order in which tags are listed is important. In the example above, your image will be displayed *above* the header.  

For a list of all tags that are available, see our [Tag reference](/tags). 

## Parameters 

Parameters are where you can customize how the tag behaves. Parameters are defined within the tag as attributes using the format `<Tag parameter="value">`. 

!!! note 

    When using the parameter documentation for [tags](/tags), optional parameters are denoted by brackets. 

The types of parameters that are available depend on the tag. Parameters have several uses, including:

* **Annotator options:** Parameters in control tags can determine how annotators interact with the data. For example, in a `<Choices>` tag, the `choice` parameter can specify whether annotators are allowed to select one option (`single`) or multiple options (`multiple`).
* **Data presentation:** Parameters in object tags can affect how data is presented. For example, the `granularity` parameter in a `<Text>` tag can control whether annotators can select text by word, sentence, symbol, or paragraph.
* **Styling:** Some parameters in control tags can determine how the annotation appears. For example, several control tags allow you to specify `opacity` and `fillColor` when drawing regions. 
* **Validation:** Some parameters are used to enforce data validation rules, such as the `required` parameter in a `<TextArea>` tag, which ensures that annotators provide a response before submitting their work.
* **Behavior:** Parameters like `editable` in a `<TextArea>` tag can control whether the text entered by an annotator can be edited after submission, providing flexibility in how the annotation process is managed.

##### Example

Returning to the example from above, we can begin to add parameters:

```xml

<View>
  <Image name="my_image" value="/path/to/image" />
  <Rectangle name="rectangle1" toName="my_image" fillColor="purple" strokeColor="black" />
  <Header value="Draw a box!" style="color:red; font-weight:400; font-size:3rem" />
</View>

```

* **Image parameters:** As documented on the [Image tag page](/tags/image#Parameters), `name` and `value` are required parameters. 
  * `name` identifies the image so we can reference it later.  
  * `value` is the substance of the tag. In this case, it is a file path to tell Label Studio where to find the image.  
  (Typically here you would actually want to use a variable instead of a static path. See [Variables](#Variables) below.)
* **Rectangle parameters:** As documented on the [Rectangle tag page](/tags/rectangle#Parameters), `name` and `toName` are required. 
  * `name` is so that we can reference it later (we do not need to in this example, but the parameter is still required). 
  * `toName` is where we specify that this rectangle should be drawn on the image that the `<Image>` tag references, so we use the value specified earlier in the `name` parameter of the `<Image>` tag. 

    While this might not seem necessary in such a simplified scenario, as your configuration grows more complex with multiple tags, then the `name`/`toName` references become essential. 
  * `fillColor` and `strokeColor` are two optional parameters where you can customize how you want the rectangle to look. 
* **Header parameters:** As documented on the [Header tag page](/tags/header#Parameters), `value` is required. 
  * `value` this is the text the header displays on the page. 
  * `style` this is an optional parameter, where we can use CSS to define how the header appears. 


## Variables

Variables are used within tag parameters to dynamically insert data from the task into the labeling configuration. 

While variables are commonly used in the `value` parameter to bind the data to the object tags, they can also be used in other parameters where dynamic content is needed.

For example, consider a situation in which your tasks are populated from a CSV file, which includes a "definition" column. You can specify that you want the text to pull from this column rather than other columns that may have text strings: 

```xml
<Text name="text" value="$definition"/>
```

Here, `$definition` would be replaced by the actual text content from your imported data as the task is loaded into the labeling interface.

Variables can also be used in control tags to dynamically set properties based on the task data. For instance, you might use a variable to set the options available in a Choices tag dynamically:

```xml
<Choices name="category" toName="text">
  <Choice value="$option1"/>
  <Choice value="$option2"/>
</Choices>
```

In this case, `$option1 `and `$option2` would be replaced by the actual values specified in the task data, allowing for a flexible configuration that adapts to the content of each task.


##### Example

Returning once more to the example from above, we had been using a static file path to point to a single image. While you can point to a single file path, in most cases you would want to dynamically load a different image for each task. 

We can accomplish that by using a variable for the `value` parameter:

```xml

<View>
  <Image name="my_image" value="$image" />
  <Rectangle name="rectangle1" toName="my_image" fillColor="purple" strokeColor="black" />
  <Header value="Draw a box!" style="color:red; font-weight:400; font-size:3rem" />
</View>

```

Now you can copy and paste the example above into a test project in Label Studio to see how it works.

## Styling

You can apply custom styling to your labeling interface configuration. 

Many tags have style-focused optional parameters. For example, the `<Rectangle>` tag has `fillColor`, `opacity`, `strokeColor`, and `strokeWidth`. 

But for other tags, you can implement [CSS styling](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference)  using both the `<Style>` tag and the `style` parameter within other tags. 

### `style` parameter

The `style` parameter is used to apply inline CSS styles directly to a specific tag. The style parameter is supported on the following tags:

* Choice
* Filter
* Header
* View

The `style` parameter is similar to the [style attribute in HTML](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/style), allowing you to define CSS properties directly on an element.

Inline styles defined using the `style` parameter will only affect the tag they are applied to, making them useful for one-off styling needs.


### `<Style>` tag

The `<Style>` tag is used to define CSS styles that can be applied globally across the entire labeling interface. It's similar to the `<style>` element in HTML, where you can write CSS rules that affect multiple elements within the interface.

You can use the `<Style>` tag to create CSS classes and then apply these classes to various elements within your labeling configuration. For more information, see the [Style tag reference](/tags/style). 
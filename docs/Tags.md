# Editor Tags

Editor configuration is based on XML-like tags. Tags can be divided
into three categories:

- Visual tags used for visual only elements
(non-interactive), examples: **View**, **Header**. 
- Control tags used to label the objects, examples: **Labels**, **Choices**, **Rating**, **TextArea**. 
- Object tags used to show elements that can be labeled: **Image**, **Text**, **Audio**, **AudioPlus**.

The **name** attribute is mandatory for all control and object tags. Also,
each control tag should have **toName** attribute that should match
the **name** parameter in the object element. For example:

```html
<View>
  <Labels name="lbl" toName="txt">
    <Label value="Label 1"></Label>
    <Label value="Label 2"></Label>
  </Labels>
  <Text name="txt" value="$value"></Text>
</View>
```

Note that in the case above Labels tags is used to label Text
tag. There could be multiple control, and object tags in the same
configuration and names are used to connect them.

Here is an example of two-column labeling interface with multiple
control and object elements:

```html
<View style="display: flex;">
 <View style="flex: 50%">
  <Header value="Choose:"></Header>
  <Text name="txt-1" value="$value"></Text>
  <Choices name="chc" toName="txt-1">
    <Choice value="Choice 1"></Choice>
    <Choice value="Choice 2"></Choice>
  </Choices>
 </View> 
 <View style="flex: 50%; margin-left: 1em">
  <Header value="Enter your question and rate text:"></Header>
  <Text name="txt-2" value="$value"></Text>
  <Rating name="rating" toName="txt-2"></Rating>
  <TextArea name="question" ></TextArea>
 </View>
</View>
```

### Table of Contents

-   [Choice](#choice)
-   [Choices](#choices)
-   [Label](#label)
-   [Labels](#labels)
-   [List](#list)
-   [Polygon](#polygon)
-   [PolygonLabels](#polygonlabels)
-   [Ranker](#ranker)
-   [Rating](#rating)
-   [Rectangle](#rectangle)
-   [RectangleLabels](#rectanglelabels)
-   [TextArea](#textarea)
-   [Audio](#audio)
-   [AudioPlus](#audioplus)
-   [Image](#image)
-   [Text](#text)
-   [Header](#header)
-   [Table](#table)
-   [View](#view)

## Choice

Choice tag represents a single choice

### Parameters

-   `value` **[string]** label value
-   `selected` **[boolean]?** If this label should be preselected
-   `alias` **[string]?** label alias
-   `hotkey` **[string]?** hokey

### Examples

```html
<View>
  <Choices name="gender" toName="txt-1" choice="single">
    <Choice alias="M" value="Male"></Choice>
    <Choice alias="F" value="Female"></Choice>
  </Choices>
  <Text name="txt-1" value="John went to see Marry"></Text>
</View>
```

## Choices

Choices tag, create a group of choices, radio, or checkboxes. Shall
be used for a single or multi-class classification.

### Parameters

-   `name` **[string]** of the group
-   `toName` **[string]** name of the elements that you want to label
-   `choice` **(single | single-radio | multiple)** single or multi-class (optional, default `single`)
-   `showInline` **[boolean]** show items in the same visual line

### Examples

```html
<View>
  <Choices name="gender" toName="txt-1" choice="single-radio">
    <Choice alias="M" value="Male"></Choice>
    <Choice alias="F" value="Female"></Choice>
  </Choices>
  <Text name="txt-1" value="John went to see Marry"></Text>
</View>
```

## Label

Label tag represents a single label

### Parameters

-   `value` **[string]** A value of the label
-   `selected` **[boolean]** If this label should be preselected
-   `alias` **[string]** Label alias
-   `hotkey` **[string]** Hotkey
-   `showalias` **[boolean]** Show alias inside label text
-   `aliasstyle` **[string]** Alias CSS style default=opacity: 0.6
-   `size` **[string]** Size of text in the label
-   `background` **[string]** The background color of active label
-   `selectedColor` **[string]** Color of text in an active label

### Examples

```html
<View>
  <Labels name="type" toName="txt-1">
    <Label alias="B" value="Brand"></Label>
    <Label alias="P" value="Product"></Label>
  </Labels>
  <Text name="txt-1" value="$text"></Text>
</View>
```

## Labels

Labels tag, create a group of labels

### Parameters

-   `name` **[string]** name of the element
-   `toName` **[string]** name of the element that you want to label
-   `choice` **(single | multiple)** configure if you can select just one or multiple labels (optional, default `single`)

### Examples

```html
<View>
  <Labels name="type" toName="txt-1">
    <Label alias="B" value="Brand"></Label>
    <Label alias="P" value="Product"></Label>
  </Labels>
  <Text name="txt-1" value="$text"></Text>
</View>
```

## List

List element, used for ranking results. Great choice for recomendation systems.

### Parameters

-   `elementValue` **[string]** lookup key for child object
-   `elementTag` **([Text] \| [Image] \| [Audio])** element used to render children
-   `value` **[string]** list value
-   `name` **[string]** of group
-   `sortedHighlightColor` **[string]?** color
-   `axis` **[string]?** axis used for drag-n-drop
-   `lockAxis` **[string]?** lock axis

### Examples

```html
<View>
 <HyperText value="$markup"></HyperText>
 <List name="ranker" value="$replies" elementValue="$text" elementTag="Text" ranked="true" sortedHighlightColor="#fcfff5"></List>
</View>
```

## Polygon

Polygon tag
Polygon is used to add polygons to an image

### Parameters

-   `name` **[string]** name of tag
-   `toname` **[string]** name of image to label
-   `opacity` **[number]** opacity of polygon (optional, default `0.6`)
-   `fillColor` **[string]?** rectangle fill color, default is transparent
-   `strokeColor` **[string]?** stroke color
-   `strokeWidth` **[number]** width of stroke (optional, default `1`)
-   `pointSize` **(small | medium | large)** size of polygon handle points (optional, default `medium`)
-   `pointStyle` **(rectangle | circle)** style of points (optional, default `rectangle`)

### Examples

```html
<View>
  <Polygon name="rect-1" toName="img-1" value="Add Rectangle"></Polygon>
  <Image name="img-1" value="$img"></Image>
</View>
```

## PolygonLabels

PolygonLabels tag, create labeled polygons

### Parameters

-   `name` **[string]** name of tag
-   `toname` **[string]** name of image to label
-   `opacity` **[number]** opacity of polygon (optional, default `0.6`)
-   `fillColor` **[string]?** rectangle fill color, default is transparent
-   `strokeColor` **[string]?** stroke color
-   `strokeWidth` **[number]** width of stroke (optional, default `1`)
-   `pointSize` **(small | medium | large)** size of polygon handle points (optional, default `medium`)
-   `pointStyle` **(rectangle | circle)** style of points (optional, default `rectangle`)

### Examples

```html
<View>
  <Image name="image" value="$image"></Image>
  <PolygonLabels name="lables" toName="image">
    <Label value="Car"></Label>
    <Label value="Sign"></Label>
  </PolygonLabels>
</View>
```

## Ranker

Ranker tag, used to ranking models

### Parameters

-   `name` **[string]** of group
-   `axis` **(y | x)** axis direction (optional, default `y`)
-   `sortedHighlightColor` **[string]** sorted color

### Examples

```html
<View>
  <Ranker name="ranker" value="$items"></Ranker>
</View>
```

## Rating

Rating tag

### Parameters

-   `name` **[string]** of the element
-   `toName` **[string]** name of the element that you want to label
-   `maxRating` **integer** maxmium rating value (optional, default `5`)
-   `size` **[string]** one of: mini tiny small large huge massive (optional, default `large`)
-   `icon` **[string]** one of: star heart (optional, default `star`)
-   `hotkey` **[string]?** hokey

### Examples

```html
<View>
  <Text name="txt" value="$text"></Text>
  <Rating name="rating" toName="txt" maxRating="10"></Rating>
</View>
```

## Rectangle

Rectangle tag
Rectangle is used to add rectangle (BBox) to an image

### Parameters

-   `name` **[string]** name of the element
-   `toname` **[string]** name of the image to label
-   `opacity` **float** opacity of rectangle (optional, default `0.6`)
-   `fillColor` **[string]?** rectangle fill color, default is transparent
-   `strokeColor` **[string]?** stroke color
-   `strokeWidth` **[number]** width of the stroke (optional, default `1`)
-   `canRotate` **[boolean]** show or hide rotation handle (optional, default `true`)

### Examples

```html
<View>
  <Rectangle name="rect-1" toName="img-1"></Rectangle>
  <Image name="img-1" value="$img"></Image>
</View>
```

## RectangleLabels

RectangleLabels tag creates labeled rectangles

### Parameters

-   `name` **[string]** name of the element
-   `toname` **[string]** name of the image to label
-   `opacity` **float** opacity of rectangle (optional, default `0.6`)
-   `fillColor` **[string]?** rectangle fill color, default is transparent
-   `strokeColor` **[string]?** stroke color
-   `strokeWidth` **[number]** width of stroke (optional, default `1`)
-   `canRotate` **[boolean]** show or hide rotation handle (optional, default `true`)

### Examples

```html
<View>
  <RectangleLabels name="labels" toName="image">
    <Label value="Person"></Label>
    <Label value="Animal"></Label>
  </RectangleLabels>
  <Image name="image" value="$image"></Image>
</View>
```

## TextArea

TextArea tag shows the textarea for user input

### Parameters

-   `name` **[string]** name of the element
-   `toName` **[string]** name of the element that you want to label if any
-   `value` **[string]** 
-   `label` **[string]?** label text
-   `placeholder` **[string]?** placeholder text
-   `maxSubmissions` **[string]?** maximum number of submissions

### Examples

```html
<View>
  <TextArea name="ta"></TextArea>
</View>
```

## Audio

Audio tag plays a simple audio file

### Parameters

-   `name` **[string]** of the element
-   `value` **[string]** of the element
-   `hotkey` **[string]** hotkey used to play/pause audio

### Examples

```html
<View>
  <Audio name="audio" value="$audio"></Audio>
</View>
```

```html
<!-- Audio classification -->
<View>
  <Audio name="audio" value="$audio"></Audio>
  <Choices name="ch" toName="audio">
    <Choice value="Positive"></Choice>
    <Choice value="Negative"></Choice>
  </Choices>
</View>
```

```html
<!-- Audio transcription -->
<View>
  <Audio name="audio" value="$audio"></Audio>
  <TextArea name="ta" toName="audio"></TextArea>
</View>
```

## AudioPlus

AudioPlus tag plays audio and shows its wave

### Parameters

-   `name` **[string]** of the element
-   `value` **[string]** of the element
-   `hasZoom` **[boolean]** speficy if audio has zoom functionality
-   `regionBG` **[string]** region color
-   `selectedRegionBG` **[string]** selected region background

### Examples

```html
<View>
 <Labels name="lbl-1" toName="audio-1"><Label value="Hello"></Label><Label value="World"></Label></Labels>
 <Rating name="rate-1" toName="audio-1"></Rating>
 <AudioPlus name="audio-1" value="$audio"></AudioPlus>
</View>
```

## Image

Image tag shows an image on the page

### Parameters

-   `name` **[string]** name of the element
-   `value` **[string]** value
-   `width` **[string]** image width (optional, default `100%`)
-   `maxWidth` **[string]** image maximum width (optional, default `750px`)

### Examples

```html
<View>
  <Image value="$url"></Image>
</View>
```

```html
<View>
  <Image value="https://imgflip.com/s/meme/Leonardo-Dicaprio-Cheers.jpg" width="100%" maxWidth="750px"></Image>
</View>
```

## Text

Text tag shows a text that can be labeled

### Parameters

-   `name` **[string]** of the element
-   `value` **[string]** of the element
-   `selelectWithoutLabel` **[boolean]** controls if text can be selected without any labels selected

### Examples

```html
<Text name="text-1" value="$text"></Text>
```

## Header

Header tag, show header

### Parameters

-   `size` **[string]** Size of header
-   `value` **[string]** Text of header
-   `underline` **[boolean]** Underline of header

### Examples

```html
<Header name="text-1" value="$text"></Header>
```

## TagAttrs

HyperText element. Render html inside

### Parameters

-   `name` **[string]** 
-   `value` **[string]** 

### Examples

```html
<View>
 <HyperText value="<p>Hey</p>"></HyperText>
<View>
```

## Table

Table tag, show object keys and values in a table

### Parameters

-   `value` **[string]** 

### Examples

```html
<View>
    <Table name="text-1" value="$text"></Table>
</View>
```

## View

View element. It's analogous to div element in html and can be used to visual configure display of blocks

### Parameters

-   `display` **(block | inline)** 
-   `backgroundColor` **hexColor** background color
-   `style` **style** css style string

### Examples

```html
<View style="display: flex;">
 <View style="flex: 50%">
  <Header value="Facts:"></Header>
  <Text name="text" value="$fact"></Text>
 </View>
 <View style="flex: 50%; margin-left: 1em">
  <Header value="Enter your question:"></Header>
  <TextArea name="question" ></TextArea>
 </View>
</View>
```

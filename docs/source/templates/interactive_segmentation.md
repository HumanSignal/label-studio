---
title: Interactive Segmentation
type: templates
category: Computer Vision
cat: computer-vision
order: 100
meta_title: Interactive Segmentation Labeling Template
meta_description: Template for interactive image segmentation powered by a SegmentAnything model. 
date: 2024-03-24 16:39:38
---

Image segmentation powered by a SegmentAnything model. 

To use this template, you need to connect a SegmentAnything model to the Label Studio project. You can write your own, or use the [pre-built example](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/segment_anything_model).

For information on connecting an example model, see [Integrate Label Studio into your machine learning pipeline](/guide/ml). 

## Labeling Configuration

```html
<View>
  <Style>
    .main {
      font-family: Arial, sans-serif;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
    }

    .container {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .column {
      flex: 1;
      padding: 10px;
      background-color: #fff;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      text-align: center;
    }

    .column .title {
      margin: 0;
      color: #333;
    }

    .column .label {
      margin-top: 10px;
      padding: 10px;
      background-color: #f9f9f9;
      border-radius: 3px;
    }

    .image-container {
      width: 100%;
      height: 300px;
      background-color: #ddd;
      border-radius: 5px;
    }

    .text-adv {
      background-color: white;
      border: 2px solid #000;  # Add border
      border-radius: 15px;  # Increase border radius
      box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
      padding: 30px;  # Increase padding
      font-family: 'Arial', sans-serif;  # Change font type
      line-height: 1.6;
      font-size: 16px;
      text-align: center;  # Center align text
   }
  </Style>
  <View className="main">
    <View className="container">
      <View className="column">
        <View className="title">Choose Label</View>
        <View className="label">
          <BrushLabels name="tag" toName="image">
            <Label value="Foreground" background="#FF0000" />
            <Label value="Background" background="#0d14d3" />
          </BrushLabels>
        </View>
      </View>
      <View className="column">
        <View className="title">Use Keypoint</View>
        <View className="label">
          <KeyPointLabels name="tag2" toName="image" smart="true">
            <Label value="Foreground" smart="true" background="#000000" showInline="true" />
            <Label value="Background" smart="true" background="#000000" showInline="true" />
          </KeyPointLabels>
        </View>
      </View>
      <View className="column">
        <View className="title">Use Rectangle</View>
        <View className="label">
          <RectangleLabels name="tag3" toName="image" smart="true">
            <Label value="Foreground" background="#000000" showInline="true" />
            <Label value="Background" background="#000000" showInline="true" />
          </RectangleLabels>
        </View>
      </View>
    </View>
    <View className="text-adv">
      <HyperText name="title" value="Use &lt;a href='https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/segment_anything_model' target='_blank' rel='noopener noreferrer' &gt;SegmentAnything model &lt;/a&gt; with this template." clickableLinks="true" inline="true"/>
    </View>
    <View className="image-container">
      <Image name="image" value="$image" zoom="true" zoomControl="true" />
    </View>
  </View>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.


Use the [Image](/tags/image.html) object tag to display the image and allow the annotator to zoom the image:
```xml
<Image name="image" value="$image" zoom="true"/>
```


---
title: KeyPointLabels
type: tags
order: 408
meta_title: Keypoint Label Tags for Labeling Keypoints
meta_description: Label Studio Keypoint Label Tags customize Label Studio for labeling keypoints for machine learning and data science projects.
---

KeyPointLabels tag
KeyPointLabels tag creates labeled keypoints

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the image to label |
| [choice] | <code>single</code> \| <code>multiple</code> | <code>single</code> | Configure whether you can select one or multiple labels |
| [maxUsages] | <code>number</code> |  | Maximum available uses of the label |
| [showInline] | <code>boolean</code> | <code>true</code> | Show items in the same visual line |
| [opacity] | <code>float</code> | <code>0.9</code> | Opacity of the keypoint |
| [fillColor] | <code>string</code> | <code>&quot;#8bad00&quot;</code> | Keypoint fill color |
| [strokeWidth] | <code>number</code> | <code>1</code> | Width of the stroke |
| [stokeColor] | <code>string</code> | <code>&quot;#8bad00&quot;</code> | Keypoint stroke color |

### Example
```html
<View>
  <KeyPointLabels name="kp-1" toName="img-1">
    <Label value="Face" />
    <Label value="Nose" />
  </KeyPointLabels>
  <Image name="img-1" value="$img" />
</View>
```

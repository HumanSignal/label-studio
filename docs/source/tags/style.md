---
title: Style
type: tags
order: 504
meta_title: Style Tag to use CSS Styles
meta_description: Customize Label Studio with CSS styles to modify the labeling interface for machine learning and data science projects.
---

The `Style` tag is used in combination with the View tag to apply custom CSS properties to the labeling interface. See the [CSS Reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference) on the MDN page for a full list of available properties that you can reference. You can also adjust default Label Studio CSS classes. Use the browser developer tools to inspect the element on the UI and locate the class name, then specify that class name in the `Style` tag.

### Parameters

| Param | Type | Description |
| --- | --- | --- |
| `.<className>` | <code>string</code> | Reference the className specified in the View tag to apply to a section of the labeling configuration. |
| [CSS property] | <code>string</code> | CSS property and value to apply. |

### Example

Use CSS styling to make a header appear with a red background on the labeling interface

```html
<View>
  <Style> .cls-name { background: red; }</Style>
  <View className="cls-name">
    <Header value="Header" />
  </View>
</View>
```
### Example

Use CSS styling to make a header appear centered with a dotted blue border while the task is unstyled

```html
<View>
  <Style> .fancy-border { border: 4px dotted blue; text-align: center; }</Style>
  <View className="fancy-border">
    <Header value="Greatest Task Header of All Time" />
  </View>
  <View>
    <Text name="text" value="$value"/>
    <Choices name="other" toName="text" choice="single">
      <Choice value="Other"/>
      <Choice value="Other2"/>
    </Choices>
  </View>
</View>
```
### Example

Use CSS styling to wrap a text classification task with a green dotted border with 35px of padding, apply a green shadow to all text, align all text in the center

```html
<View>
<Style> .fancy-choices { outline: 5px dotted green; padding: 35px; text-shadow: 2px 2px green; text-align: center; } </Style>
  <View className="fancy-choices">
    <Text name="text" value="$value"/>
    <Choices name="other" toName="text" choice="single">
      <Choice value="Other"/>
       <Choice value="Other2"/>
    </Choices>
  </View>
</View>
```
### Example

Adjust the default CSS styling in Label Studio to surround each radio button choice with a solid green border

```html
<View>
<Style>
  .ant-radio-wrapper {border: 2px solid green;}
</Style>
<Choices name="chc" toName="text" choice="single-radio">
  <Choice value="First Choice"/>
  <Choice value="Second Choice"/>
</Choices>
<Text name="text" value="$text"/>
</View>
```

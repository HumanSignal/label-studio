## Enhance classification templates with nested choices

You can add conditional or nested choices to any classification template. 

### Conditional classification

```xml
<View>
  <Text name="text1" value="$text1" />
  <Choices name="sentiment" toName="text1" showInLine="true">
    <Choice value="Positive" />
    <Choice value="Negative" />
    <Choice value="Neutral" />
  </Choices>

  <View visibleWhen="choice-selected"
        whenTagName="sentiment" whenChoiceValue="Positive">
    <Header value="What about this text?" />
    <Text name="text2" value="$text2" />
  </View>

  <Choices name="sentiment2" toName="text2"
  	   choice="single" showInLine="true"
           visibleWhen="choice-selected"
           whenTagName="sentiment"
           whenChoiceValue="Positive">
    <Choice value="Positive" />
    <Choice value="Negative" />
    <Choice value="Neutral" />
  </Choices>
</View>
```

### Two level classification

```xml
<View>
  <Image name="image" value="$image"/>
  <Choices name="content" toName="image">
    <Choice value="Adult content"/>
    <Choice value="Weapons" />
    <Choice value="Violence" />
  </Choices>
    
  <Choices name="other-props" toName="image"
           choice="single" showInline="true"
           visibleWhen="choice-selected"
           whenTagName="content">
    <View style="width:100%">
      <Header value="Are there people or animals?" />
    </View>
    <Choice value="Yes" />
    <Choice value="No" />
  </Choices>
</View>
```


### Three level classification
```xml
<View>
  <Text name="text" value="$text" />

  <Choices name="sentiment" toName="text" showInLine="true">
    <Choice value="Positive" />
    <Choice value="Negative" />
    <Choice value="Neutral" />
  </Choices>

  <Choices name="other-props" toName="text"
  	   choice="single" showInLine="true"
           visibleWhen="choice-selected"
           whenTagName="sentiment">
    <View style="width: 100%">
      <Header value="Other properties of the text" />
    </View>
    <Choice value="Descriptive" />
    <Choice value="Emotional" />
  </Choices>

  <Choices name="emotion" toName="text"
  	   choice="single" showInline="true"
           visibleWhen="choice-selected"
           whenTagName="other-props"
           whenChoiceValue="Emotional">
    <View style="width: 100%">
      <Header value="What emotion?" />
    </View>
    <Choice value="Sadness" />
    <Choice value="Disgust" />
    <Choice value="Fear" />
    <Choice value="Surprise" />
  </Choices>
</View>
```
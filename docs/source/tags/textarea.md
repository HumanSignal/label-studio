---
title: TextArea
type: tags
order: 427
meta_title: Textarea Tag for Text areas
meta_description: Customize Label Studio with the TextArea tag to support audio transcription, image captioning, and OCR tasks for machine learning and data science projects.
---

The `TextArea` tag is used to display a text area for user input. Use for transcription, paraphrasing, or captioning tasks.

Use with the following data types: audio, image, HTML, paragraphs, text, time series, video.

{% insertmd includes/tags/textarea.md %}

### Example: Basic TextArea

You can open this example in the playground and experiment with different parameters. 

```html
<View>
  <TextArea name="text-area"></TextArea>
</View>
```

### Example: Region list TextArea fields

This example combines the `TextArea` tag with other tags for OCR labeling. 

Because `displayMode="region-list"`, the text area fields are displayed under the **Regions** panel instead of in the labeling interface. 

![Screenshot](/images/tags/textarea-ocr.png)

```html
<View>
  <Image name="image" value="$ocr"/>
  <Labels name="label" toName="image">
    <Label value="Product" background="#166a45"/>
    <Label value="Price" background="#2a1fc7"/>
  </Labels>
  <Rectangle name="bbox" toName="image" strokeWidth="3"/>
  <TextArea name="transcription" toName="image" editable="true" perRegion="true" required="true" maxSubmissions="1" rows="5" placeholder="Recognized Text" displayMode="region-list"/>
</View>
```
### Example: Enforce unique values 

To keep submissions unique, you can set `skipDuplicates="true"`. The user will receive a pop-up message if they attempt to enter the same value twice. 

![Screenshot](/images/tags/textarea-unique.png)

```html
<View>
  <Audio name="audio" value="$audio"/>
  <TextArea name="genre" toName="audio" skipDuplicates="true" />
</View>
```

### Example: Ensure users can submit by pressing Enter

If you are trying to optimize your annotation process by speed, you may want to use keyboard shortcuts or want to avoid additional clicks.

For that you should note the following:

- If `rows="1"` you can press Enter to submit your text. 
- If rows > 1, the **Add** button appears. You can click this or press Shift + Enter. 
- You do not have to add the text (meaning click **Add** or pressing Enter/Shift + Enter) to save your text when you press **Submit**. 

  It is enough to simply enter your text into the input field. You only need to add your text if you want to include multiple submissions from the same TextArea. See the video below. 

<video style="max-width: 600px;" class="gif-border" autoplay loop muted>
  <source src="/images/tags/textarea-demo.mp4">
</video>


!!! info Tip
    You can click Control + Enter (Windows) or Command + Enter (Mac) to submit the annotation. 

    You can also configure your own [custom hotkeys](/guide/user_account#Set-custom-hotkeys) 

```html
<View>
  <Header value="Press Enter to submit"/>
  <Text name="text1" value="Example text 1" />
  <TextArea name="text-area-1" toName="text1" rows="1" />
  
  <Header value="Press Shift + Enter to submit"/>
  <Text name="text2" value="Example text 2" />
  <TextArea name="text-area-2" toName="text2" rows="3" />
</View>
```

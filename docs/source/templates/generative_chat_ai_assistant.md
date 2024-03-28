---
title: Chat with AI assistant
type: templates
category: Generative AI
cat: generative-ai
order: 909
meta_title: Chat with AI assistant
date: 2024-03-24 16:40:58
---

Collect a chat completions dataset using the [Interactive LLM backend](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/llm_interactive). 

To use this template, you need to connect a Interactive LLM backend model to the Label Studio project. This model requires an OpenAI API key. For information on connecting an example model, see [Integrate Label Studio into your machine learning pipeline](/guide/ml). 

## Labeling Configuration

```html
<View>
   <Style>
    .lsf-main-content.lsf-requesting .prompt::before { content: ' loading...'; color: #808080; }
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
  <View className="text-adv">
   <HyperText name="title" value="Use &lt;a href='https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/llm_interactive' target='_blank' rel='noopener noreferrer' &gt;Interactive LLM &lt;/a&gt; with this template." clickableLinks="true" inline="true"/>
  </View>
  <Paragraphs name="chat" value="$messages" layout="dialogue" nameKey="role" textKey="content" />
  <Header value="User:" />
  <View className="prompt">
    <TextArea name="prompt"
              toName="chat"
              rows="4"
              editable="true"
              maxSubmissions="1"
              showSubmitButton="false"
              placeholder="Type user prompt here then Shift+Enter..."
    />
  </View>
  <Header value="Assistant:"/>
  <TextArea name="response"
            toName="chat"
            rows="4"
            editable="true"
            maxSubmissions="1"
            showSubmitButton="false"
            placeholder="Generated response will appear here..."
  />

</View>
```
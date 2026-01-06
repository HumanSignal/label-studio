---
title: Evaluate Production Conversations for RLHF
type: templates
category: Chat
cat: Chat
order: 870
meta_description: Template for monitoring and evaluating chat conversations.
---

<img src="/images/templates/chat-rlhf.png" alt="" class="gif-border" style="max-width:552px" />

Bring production chats into this template to learn why your agent succeeds or fails. 

Import conversations, review what users liked to codify wins, examine disliked cases to surface gaps, and randomly sample chats to see real behavior. Tag issues like relevance, correctness, safety, and tone—then turn patterns into concrete fixes and fine‑tuning data.

!!! error Enterprise
    This template requires Label Studio Enterprise or Starter Cloud. 

    For Community users, see our [Conversation AI templates](gallery_conversational_ai) or the [Multi-Turn Chat Evaluation template](multi_turn_chat). 

## Labeling configuration

```xml
<View>
  <Style>
    .chat {
      border: 1px solid #ccc;
      padding: 10px;
      border-radius: 5px;
    }
    .evaluation {
        border: 2px solid #cc854f;
        background-color: #ffe4d0;
        color: #664228;
        padding: 10px;
        border-radius: 5px;
        margin-bottom: 20px;
    }
    <!-- Choice text -->
    .evaluation span {
        color: #664228;
    }
    <!-- Star rating -->
    .evaluation .ant-rate-star.ant-rate-star-full span {
      color: #f4aa2a;
     }
    
    <!-- Dark mode comment text and button color -->
    [data-color-scheme="dark"] .evaluation .lsf-row p,
    [data-color-scheme="dark"] .evaluation button span {
       color: #f9f8f6
    }
   
    .overall-chat {
       border-bottom: 1px solid #cc854f;
       margin-bottom: 15px;
    }
    .instructions {
       color: #664228;
       background-color: #ffe4d0;
       padding-top: 15px;
       padding-bottom: 15px;
    }
    <!-- Allow enlarging the instruction text -->
    .lsf-richtext__container.lsf-htx-richtext {
      font-size: 16px !important;
      line-height: 1.6;
    }
    
    <!-- Remove excess height from the chat to allow space for instruction text -->
    .htx-chat { 
      --excess-height: 275px 
    }
  </Style>
  <View style="display: flex; gap: 24px;">
    
    <!-- Left: conversation -->
    <View className="chat" style="flex: 2;">
      <View className="instructions">
        <Text name="instructions" value="Review the conversation in detail. 
                                         As you read through it, click on individual messages to 
                                         provide feedback about accuracy, clarity, and intent." />
      </View>
      
      <Chat name="chat" value="$chat" 
            minMessages="2" 
            editable="false" />
    </View>

    <!-- Right: conversation-level evaluation -->
    <View style="flex: 1;" className="evaluation">
      <View style="position:sticky;top:14px">

          <!-- Evaluate the whole conversation -->
			<View className="overall-chat" style="margin-top:auto">
				<Header size="4">Overall quality of this conversation</Header>
				<Rating name="rating" toName="chat" />
                <View style="padding-top:15px">
				  <Text name="add_comment" value="Add a comment (optional)" />
				  <TextArea name="conversation_comment" toName="chat" />
                </View>
			</View>
        <!-- Only visible when no message is selected -->
         <View visibleWhen="no-region-selected">
          <View style="padding-top:15px">
          <Header value="Click on a message to evaluate it"/>
          </View>
        </View>
        
        <!-- Only visible when a user message is selected, and only applies to selected message -->
        <View visibleWhen="region-selected" whenRole="user">
          <Header value="Classify the user message"/>
          <Choices name="request_classification" toName="chat" perRegion="true" >
            <Choice value="Question" />
            <Choice value="Clarifying Question" />
            <Choice value="Command or Request" />
            <Choice value="Positive Feedback" />
            <Choice value="Negative Feedback" />
            <Choice value="Off-topic / Chit-chat" />
          </Choices>
       </View>
        
        <!-- Only visible when an assistant message is selected, and only applies to selected message -->
        <View visibleWhen="region-selected" whenRole="assistant">
          <Header value="Rate assistant's clarity"/>
          <Rating name="assistant_response_clarity" toName="chat" perRegion="true" />
          
          <Header value="Rate assistant's accuracy"/>
          <Rating name="assistant_response_accuracy" toName="chat" perRegion="true" />
          
          <Header value="Classify the message tone"/>
          <Choices name="q" toName="chat" perRegion="true" >
            <Choice value="Professional" />
            <Choice value="Casual" />
          </Choices>
          
          <Header value="Add a comment (optional)"/>
          <TextArea perRegion="true" name="message_comment" toName="chat" />
       </View>
     </View>
   </View>
 </View>
</View>
```

## About this labeling configuration

This labeling configuration is divided into two columns with the chat interface on the left and both conversation and message evaluation on the right. 

### Style

The styling is applied through `<View>` tags, which are rendered as HTML `<div>` tags. 

You can apply styling using inline styles directly on `View` tags or by defining CSS rules for classes in a `<Style>` block. Those classes are then applied within the labeling configuration using the `className` parameter. 

For example, this `View` tag uses a combination of inline styles and `className`:

```xml
<View className="chat" style="flex: 2;">
```

The CSS rules for the `.chat` class are defined with the `<Style>` block.

!!!info Tip
    `.htx-chat` is a special Label Studio class that allows you to control the height of the chat portion of the interface. 

For more information, see the [Style tag](/tags/style).

### Text

Above the chat there are instructions guiding the user as to what they should try to achieve with the text. 

You can hard-code this into the labeling configuration (`<Text value="Your instruction text" />`), but if you are going to have multiple tasks within a project, you will likely want to specify the text as part of the imported data. 

In this example, we use `$text` because the input JSON uses `"text"`. See [input data](#Input-data) below. 

For more information, see the [Text tag](/tags/text).

### Chat 

The `Chat` tag provides an interface where the annotator can type and send messages. 

```xml
<Chat name="chat" value="$chat" 
            minMessages="2" 
            editable="false" />
```
* `name`: This is required, and when you want your control tags (choices, ratings, etc) to reference the chat element, you point to it using `toName="chat"`. You can use whichever name you like when customizing your own labeling configurations. 

* `value`: This is required, and should use a variable referencing your [input data](#Input-data). In this example, we use `$chat` because the input JSON uses `"chat"`. 

* `minMessages`: The minimum number of messages users must submit to complete the task. You can also set a maximum. 

    Both minimum and maximum can also be set in the task data, allowing you to have different limits for each task. For an example, see [Chatbot Evaluation](chatbot#Chat).  

* `editable`: In this example, you are not allowing the annotator to edit messages. 

For more information and additional parameters, see the [Chat tag](/tags/chat.html). 

!!! note
    This template is designed to be used to evaluate an imported conversation, so you will likely want to import messages from an external source as [predictions](/tags/chat.html#Prediction-format). 

### Conversation evaluation

This template uses a combination of conversation-level evaluation and per-message evaluation. 

The conversation-level evaluation allows users to rate the conversation and leave an optional comment. This remains visible at all times and is not tied to a specific region (message).

```xml
<!-- Evaluate the whole conversation -->
<View className="overall-chat" style="margin-top:auto">
  <Header size="4">Overall quality of this conversation</Header>
  <Rating name="rating" toName="chat" />
  
  <View style="padding-top:15px">
    <Text name="add_comment" value="Add a comment (optional)" />
    <TextArea name="conversation_comment" toName="chat" />
  </View>
</View>
```

### Per-message evaluation

For per-message evaluation, an annotator must click on a message in the chat interface. And then options specific to that role appear on the right. 

For example:

```xml
<View visibleWhen="region-selected" whenRole="user">
```

* `visibleWhen` - The controls within this section are only visible when a region (in this case a chat message) is selected. 
* `whenRole` - Further refines `visibleWhen` so that the controls within the section are only visible when the selected region (message) is from the specified role. 

For more information, see the [View tag](/tags/view).

### Rating, Choices, and TextArea

Per-message evaluations should include `perRegion="true"`, as your chat will likely have multiple messages from each role. 

```xml
<Rating name="assistant_response_accuracy" toName="chat" perRegion="true" />
```

For conversation-level evaluation, you can set `perRegion="false"` (or just not add the parameter, as the default is `false`). 

For more information, see the [Rating tag](/tags/rating), [TextArea tag](/tags/textarea), [Choice tag](/tags/choice), and [Choices tag](/tags/choices).

## Input data

The `Chat` tag accepts JSON data. 

### Empty chat

The following would provide an empty chat window and instruction text for the annotator:

```json
{
  "data": {
    "text": "Review the conversation in detail. As you read through it, click on individual messages to provide feedback about accuracy, clarity, and intent.",
    "chat": []
  }
}
```

### Imported chat messages

You can also import demo chat messages as follows:

```json
{
  "data": {
    "text": "Review the conversation in detail. As you read through it, click on individual messages to provide feedback about accuracy, clarity, and intent.",
    "chat": [
        {
            "role": "user",
            "content": "Demo chat message 1"
        },
        {
            "role": "assistant",
            "content": "Demo chat message 2"
        },
        {
            "role": "developer",
            "content": "Demo chat message 3 "
        }
    ]
  }
}
```

!!! attention
    The chat messages that you import are not selectable. This means that you cannot edit them or apply annotations (ratings, choices, etc) to them.

    You can only select and annotate messages that are added to the chat by an annotator or that are imported as predictions.

### Predictions

If you want to be able to select messages and evaluate them, then you can use [predictions](/tags/chat.html#Prediction-format). For example:

```json
[
  {
    "data": {
      "chat": [
        { 
          "text": "Review the conversation in detail. As you read through it, click on individual messages to provide feedback about accuracy, clarity, and intent."
        }
      ]
    },
    "predictions": [
      {
        "model_version": "demo-model",
        "result": [
          {
            "type": "chatmessage",
            "value": {
              "chatmessage": {
                "role": "user",
                "content": "I'm onboarding a new annotator. What are the first steps to ensure quality and speed?",
                "createdAt": 1757612212681
              }
            },
            "to_name": "chat",
            "from_name": "chat"
          },
          {
            "type": "chatmessage",
            "value": {
              "chatmessage": {
                "role": "assistant",
                "content": "Start by creating their account and assigning the Annotator role so permissions are scoped correctly. Add concise labeling instructions that appear before labeling. Use a small ground-truth set and require overlap (e.g., 2 annotators per task) with a reviewer to resolve disagreements. Enable comments so reviewers can leave precise, in-task feedback.",
                "createdAt": 1757612363718
              }
            },
            "to_name": "chat",
            "from_name": "chat"
          }
        ]
      }
    ]
  }
]
```


## Related tags

* [Chat](/tags/chat.html)
* [Style](/tags/style)
* [View](/tags/view)
* [Text](/tags/text)
* [TextArea](/tags/textarea)
* [Choices](/tags/choices)
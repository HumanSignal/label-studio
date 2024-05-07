---
title: Chatbot response generation with HuggingFace's GPT2 model
type: guide
hide_menu: true
tier: all
order: 50
meta_title: Chatbot response generation with HuggingFace's GPT2 model
meta_description: Label Studio tutorial for Chatbot response generation with HuggingFace's GPT2 model
section: "Machine learning"
parent: "ml_tutorials"
parent_enterprise: "ml_tutorials"
parent_page_extension: "html"
---


If you want to build a new chatbot, or just experiment with GPT-based text generators, this [Machine Learning backend](/guide/ml.html) example is for you! Powered by [HuggingFace's Transformers library](https://github.com/huggingface/transformers), 
it connects a GPT2-like language model to the Label Studio UI, giving you an opportunity to explore different text responses based on the chat history.


Follow this installation guide and then play around with the results. Generate your next superpowered chatbot dataset by editing, removing, or adding new phrases!


<div style="margin:auto; text-align:center; width:100%"><img src="/images/ml-backend-chatbot.png" style="opacity: 0.7"/></div>

## Start using it

1. Install ML backend:
    ```bash
    pip install -r label_studio_ml/examples/huggingface/requirements.txt
    label-studio-ml init my-ml-backend --from label_studio_ml/examples/huggingface/gpt.py
    label-studio-ml start my-ml-backend
    ```

2. Start Label Studio and create a new project.
   
3. In the project **Settings**, set up the **Labeling Interface**.
   
4. Select **Browse Templates** and select the Conversational AI **Response Generation** template. 

5. Open the **Machine Learning** settings and click **Add Model**. 

6. Add the URL `http://localhost:9090` and save the model as an ML backend.


You can import your chat dialogs in the input format of [`<Paragraphs>` object tag](/tags/paragraphs.html), or use a sample task import just to give it a try.

After you import data, you'll see text boxes with generated answers. 

## Tweaking parameters

You can control some model parameters when you start the ML backend:

For example, you can specify the model that you want to use, and the number of responses returned by the model:
```bash
label-studio-ml start my-ml-backend --with \
model=microsoft/DialoGPT-small \
num_responses=5
```

#### model
Model name from [HuggingFace model hub](https://huggingface.co/models?filter=gpt2)

#### num_responses
Number of generated responses

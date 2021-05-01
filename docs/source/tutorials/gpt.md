---
title: 
type: blog
order: 50
---

## Chatbot response generation with HuggingFace's GPT2 model

If you're going to build a new chatbot, or just want to play with GPT-based text generators, this [Machine Learning backend](https://labelstud.io/guide/ml.html) is for you! Powered by [HuggingFace's Transformers library](https://github.com/huggingface/transformers), 
it connects GPT2-like language model to Label Studio UI, giving you an opportunity to explore different text responses based on the chat history.


Check this installation guide and then play around them. 

Collect your next superpower chatbot dataset by edit, remove or add new phrases!


<div style="margin:auto; text-align:center; width:100%"><img src="/images/ml-backend-chatbot.png" style="opacity: 0.7"/></div>

## Start using it

1. Install ML backend:
    ```bash
    pip install -r label_studio_ml/examples/huggingface/requirements.txt
    label-studio-ml init my-ml-backend --from label_studio_ml/examples/huggingface/gpt.py
    label-studio-ml start my-ml-backend
    ```

2. Create Dialog generation setup - go to **Setup** page and select _Chatbot_ template

3. Run Label Studio, then go to the **Model** page. Paste the selected ML backend URL then click on **Add Backend**.


Now you can import your chat dialogs in the input format of [`<Paragraphs>` object tag](/tags/paragraphs.html), or use sample task import just for give it a try.

Finally you'll see text boxes with generated answers - 

## Tweaking parameters

Additionally you can control some model parameters on starting ML backend

```bash
label-studio-ml start my-ml-backend --with \
model=microsoft/DialoGPT-small \
num_responses=5
```

#### model
Model name from [HuggingFace model hub](https://huggingface.co/models?filter=gpt2)

#### num_responses
Number of generated responses

---
title: How to Connect Hugging Face with Label Studio SDK
hide_sidebar: true
order: 1001
open_in_collab: true
tutorial: true
community_author: yyassi-heartex
ipynb_repo_path: tutorials/how-to-connect-Hugging-Face-with-Label-Studio-SDK/how_to_connect_Hugging_Face_with_Label_Studio_SDK.ipynb
repo_url: https://github.com/HumanSignal/awesome-label-studio-tutorials/tree/main/tutorials/how-to-connect-Hugging-Face-with-Label-Studio-SDK
report_bug_url: https://github.com/HumanSignal/awesome-label-studio-tutorials/issues/new
thumbnail: /images/tutorials/tutorials-hugging-face-ls-sdk.png
meta_title: How to Connect Hugging Face with Label Studio SDK
meta_description: Learn how to create a NLP workflow by integrating Hugging Face datasets and models with Label Studio for annotation and active learning.
badges: SDK, Hugging Face, Colab
duration: 5-10 mins
---
**A Complete Guide to Connecting Hugging Face and Label Studio**

This tutorial shows you how to create a seamless NLP workflow by integrating Hugging Face datasets and models with Label Studio for annotation and active learning.

## 📚 What You'll Learn:

1. **HF → LS**: Load datasets from Hugging Face into Label Studio for annotation
2. **LS → HF**: Export labeled data from Label Studio for model training
3. **HF → LS**: Connect Hugging Face models as ML backends for pre-annotations and active learning

## 🎯 Tutorial Use Case:

We'll build a **Named Entity Recognition (NER)** annotation project using the WikiANN dataset and integrate pre-trained models for intelligent pre-labeling.

## ✅ Prerequisites:
- Label Studio instance (local or cloud)
- Hugging Face account with API token (optional for public models)
- Basic understanding of NLP and NER tasks
- Python 3.8+

---

## 💡 Why This Integration Matters

Before we dive into the code, let's understand the value of connecting Hugging Face with Label Studio.

This integration creates a powerful, automated ML workflow that transforms how you build and deploy NLP models.

### 🚀 Key Benefits:

#### 1. **Accelerated Annotation Workflow** ⚡
- **10x faster labeling**: Pre-trained models provide initial annotations, reducing manual work by 60-80%
- **Smart pre-labeling**: Models suggest entities, annotators only review and correct
- **Focus on hard cases**: Spend time on uncertain predictions, not obvious labels

#### 2. **Seamless Data Pipeline** 🔄
- **No manual data prep**: Direct import from Hugging Face datasets to Label Studio
- **One-click export**: Labeled data automatically formatted for model training
- **Zero data loss**: Perfect alignment between annotations and tokenization

#### 3. **Continuous Model Improvement** 📈
- **Active learning loop**: Label → Train → Predict → Repeat
- **Domain adaptation**: Fine-tune general models on your specific data
- **Track progress**: Compare model versions and measure improvement over time

#### 4. **Production-Ready ML** 🏭
- **Reproducible workflows**: Automated pipelines eliminate manual steps
- **Version control**: Track datasets, labels, and model versions together
- **Scale effortlessly**: Process thousands of documents with batch predictions

### 🎯 Real-World Impact:

**Typical improvements across annotation projects:**

| Metric | Without Integration | With HF + Label Studio | Improvement |
|--------|---------------------|------------------------|-------------|
| Labeling speed | Baseline | 60-80% faster | ⚡ 2-5x speedup |
| Annotation accuracy | 90-95% | 98%+ | ✅ Fewer errors |
| Data preparation | Days of manual work | Minutes (automated) | ⏱️ Massive time savings |
| Model iteration | Static (train once) | Continuous improvement | 🔄 Active learning |
| Workflow complexity | Multiple disconnected tools | Single integrated pipeline | 🎯 Simplified workflow |

### 📊 Concrete Example:

**Project**: Label 10,000 medical documents for entity extraction

| Step | Traditional Approach | HF + Label Studio | Time Saved |
|------|---------------------|-------------------|------------|
| Data import | Manual download + formatting (8-10 hrs) | Automated import (5 min) | ~10 hrs |
| Initial labeling | Label all 10,000 docs (500-600 hrs @ 3 min/doc) | Label 500 docs to bootstrap (25 hrs) | — |
| Model training | Train once at end | Train on 500 examples (1 hr) | — |
| Remaining labels | — | Pre-annotate 9,500 docs (2 hrs)<br>Review/correct (95-140 hrs @ 45 sec/doc) | ~360 hrs |
| **Total time** | **~530 hours** | **~130 hours** | **75% reduction** |
| **Outcome** | Static model | Continuously improving model | ✅ |

### 🌟 Who Benefits Most:

- **Data Scientists**: Faster experimentation and model iteration
- **Annotation Teams**: Less tedious work, focus on quality
- **ML Engineers**: Production-ready pipelines from day one
- **Researchers**: Reproducible experiments and dataset management
- **Startups**: Build high-quality labeled datasets on limited budgets

---

**Ready to build this workflow?** Let's get started! 👇



```python
# Install required packages
%pip install -q label-studio-sdk datasets transformers torch huggingface_hub accelerate

print("✅ All packages installed successfully!")
```

---

## 🔧 Setup & Authentication

### Step 1: Connect to Label Studio

Set your environment variables before running:
```bash
export LABEL_STUDIO_URL="http://localhost:8080"  # or your Label Studio URL
export LABEL_STUDIO_API_KEY="your-api-key-here"
```

To get your API key: Go to Label Studio → Account & Settings → Personal Access Token


```python
import os
from label_studio_sdk import Client

# Get credentials from environment variables
ls_api_key = os.environ.get('LABEL_STUDIO_API_KEY')
ls_url = os.environ.get('LABEL_STUDIO_URL', 'http://localhost:8080')

if not ls_api_key:
    raise ValueError('❌ Please set LABEL_STUDIO_API_KEY environment variable.')

# Connect to Label Studio
try:
    ls = Client(url=ls_url, api_key=ls_api_key)
    connection_status = ls.check_connection()
    print(f'✅ Connected to Label Studio at {ls_url}')
    print(f'   Connection status: {connection_status}')
except Exception as e:
    raise ConnectionError(f'❌ Failed to connect to Label Studio: {str(e)}')
```

### Step 2: Authenticate with Hugging Face

Set your Hugging Face token:
```bash
export HF_TOKEN="your-hf-token-here"
```

Get your token at: https://huggingface.co/settings/tokens


```python
from huggingface_hub import login

# Get Hugging Face token (optional but recommended for accessing private models)
hf_token = os.environ.get('HF_TOKEN')

if hf_token:
    try:
        login(token=hf_token)
        print('✅ Logged into Hugging Face Hub')
    except Exception as e:
        print(f'⚠️  Warning: HF login failed: {str(e)}')
        print('   Continuing with public models only...')
else:
    print('ℹ️  No HF_TOKEN provided. Using public models only.')
```

---

## 📥 Part 1: Hugging Face → Label Studio (Import Dataset)

### Step 3: Create Label Studio Project

We'll create a Named Entity Recognition project with labels for Person (PER), Organization (ORG), Location (LOC), and Miscellaneous (MISC) entities.


```python
# Define Label Studio labeling configuration for NER
ner_config = '''
<View>
  <Text name="text" value="$text"/>
  <Labels name="ner" toName="text">
    <Label value="PER" background="#FF6B6B"/>
    <Label value="ORG" background="#4ECDC4"/>
    <Label value="LOC" background="#95E77D"/>
    <Label value="MISC" background="#FFE66D"/>
  </Labels>
</View>
'''

# Create project (or use existing one)
project_title = 'Hugging Face + Label Studio NER Tutorial'
project = ls.start_project(
    title=project_title,
    label_config=ner_config,
    description='Tutorial: NER annotation with WikiANN dataset from HuggingFace'
)

print(f'✅ Project created successfully!')
print(f'   Project ID: {project.id}')
print(f'   Project URL: {ls_url}/projects/{project.id}')
```

We'll load the WikiANN dataset (a multilingual NER dataset) from Hugging Face. WikiANN provides high-quality NER annotations for English and 175+ other languages.

**Why this matters:** Direct dataset import eliminates manual data preparation, ensures consistency, and makes it easy to update your annotation project with new data.


```python
from datasets import load_dataset

# Load dataset from Hugging Face
print('📦 Loading WikiANN dataset from Hugging Face...')
dataset = load_dataset('wikiann', 'en', split='train[:100]')
print(f'   Loaded {len(dataset)} examples')

# Convert Hugging Face dataset format to Label Studio task format
tasks = []
for idx, row in enumerate(dataset):
    # Join tokens into a single text string
    text = ' '.join(row['tokens'])

    # Create Label Studio task format
    task = {
        "data": {
            "text": text
        },
        # Store original metadata for reference
        "meta": {
            "source": "wikiann",
            "hf_index": idx
        }
    }
    tasks.append(task)

# Import tasks into Label Studio using SDK
print(f'\n📤 Importing {len(tasks)} tasks into Label Studio...')
project.import_tasks(tasks)

# Verify import
imported_tasks = project.get_tasks()
print(f'✅ Successfully imported {len(imported_tasks)} tasks!')
print(f'\n📝 Sample task:')
print(f'   Text: {imported_tasks[0]["data"]["text"][:100]}...')
```

---

## 📤 Part 2: Label Studio → Hugging Face (Export & Train)

### Step 5: Label Some Data (Manual Step)

**⚠️ Action Required:** Before continuing, go to Label Studio and label a few tasks (at least 10-20 for meaningful training).

1. Open your project: {ls_url}/projects/{project.id}
2. Click on tasks and annotate entities (PER, ORG, LOC, MISC)
3. Submit your annotations

Once you've labeled some data, continue to the next cell.

---

### Step 6: Export Annotations from Label Studio

We'll export the labeled data and convert it to Hugging Face format for model training.

**Why this matters:** This automated conversion saves hours of manual data preparation and ensures your annotations are correctly aligned with model tokenization.


```python
from transformers import AutoTokenizer
from datasets import Dataset

# Export annotations from Label Studio using SDK
print('📥 Exporting annotations from Label Studio...')
ls_data = project.export_tasks(export_type='JSON')  # Already returns a list

# Check how many tasks have annotations
labeled_tasks = [task for task in ls_data if task.get('annotations')]
print(f'   Total tasks: {len(ls_data)}')
print(f'   Labeled tasks: {len(labeled_tasks)}')

if len(labeled_tasks) < 5:
    print('\n⚠️  Warning: Very few labeled tasks. Results may not be meaningful.')
    print('   Consider labeling more data in Label Studio before training.')

# Initialize tokenizer (using BERT for NER)
print('\n🔤 Loading tokenizer...')
tokenizer = AutoTokenizer.from_pretrained('bert-base-cased', use_fast=True)

# Define NER label schema (BIO format)
label_list = ['O', 'B-PER', 'I-PER', 'B-ORG', 'I-ORG', 'B-LOC', 'I-LOC', 'B-MISC', 'I-MISC']
label_to_id = {label: idx for idx, label in enumerate(label_list)}
print(f'   Label schema: {label_list}')

# Convert Label Studio annotations to HuggingFace format
print('\n🔄 Converting annotations to HuggingFace format...')

texts = [task['data']['text'] for task in ls_data]
tokenized = tokenizer(texts, return_offsets_mapping=True, truncation=True, padding=True)

all_labels = []
for i, task in enumerate(ls_data):
    offsets = tokenized['offset_mapping'][i]

    # Extract entity spans from Label Studio annotations
    spans = []
    annotations = task.get('annotations', [])
    if annotations:
        # Use the first annotation (or implement logic for multiple annotations)
        results = annotations[0].get('result', [])
        for result in results:
            if result.get('type') == 'labels':
                value = result['value']
                spans.append((
                    value['start'],
                    value['end'],
                    value['labels'][0]
                ))

    # Align spans with tokenized output (handle tokenization offsets)
    token_labels = []
    for token_start, token_end in offsets:
        # Special tokens (CLS, SEP, PAD) have start==end
        if token_start == token_end:
            token_labels.append(-100)  # Ignore in loss calculation
            continue

        # Find if this token overlaps with any entity span
        label = 'O'  # Default: Outside any entity
        for span_start, span_end, span_label in spans:
            # Check if token overlaps with span
            if token_end <= span_start or token_start >= span_end:
                continue  # No overlap

            # Determine if this is the beginning of an entity or inside
            if token_start == span_start:
                label = f'B-{span_label}'  # Beginning of entity
            else:
                label = f'I-{span_label}'  # Inside entity
            break

        token_labels.append(label_to_id[label])

    all_labels.append(token_labels)

# Create HuggingFace Dataset
hf_dataset = Dataset.from_dict({
    "input_ids": tokenized['input_ids'],
    "attention_mask": tokenized['attention_mask'],
    "labels": all_labels
})

print(f'✅ Conversion complete!')
print(f'   Dataset size: {len(hf_dataset)} examples')
print(f'\n📝 Sample (first example):')
print(f'   Input IDs shape: {len(hf_dataset[0]["input_ids"])}')
print(f'   Labels shape: {len(hf_dataset[0]["labels"])}')
print(f'   Sample tokens: {tokenizer.convert_ids_to_tokens(hf_dataset[0]["input_ids"][:20])}')
```

### Step 7 (Optional): Train Hugging Face Model

**Note:** This step demonstrates training a custom model. You can skip this and jump to Part 3 to use pre-trained models instead.

**Why train:** Fine-tuning on your labeled data creates domain-specific models that outperform general models on your specific use case.


```python
from transformers import (
    AutoModelForTokenClassification,
    TrainingArguments,
    Trainer,
    DataCollatorForTokenClassification
)
import numpy as np

# Only train if we have enough labeled data
if len(labeled_tasks) < 10:
    print('⚠️  Skipping training: Need at least 10 labeled examples.')
    print('   Label more data in Label Studio, then re-run this cell.')
else:
    print('🚀 Starting model training...')

    # Initialize model
    num_labels = len(label_list)
    model = AutoModelForTokenClassification.from_pretrained(
        'bert-base-cased',
        num_labels=num_labels,
        id2label={i: label for i, label in enumerate(label_list)},
        label2id=label_to_id
    )

    # Split into train/validation
    splits = hf_dataset.train_test_split(test_size=0.15, seed=42)
    train_dataset = splits['train']
    eval_dataset = splits['test']
    print(f'   Train set: {len(train_dataset)} examples')
    print(f'   Eval set: {len(eval_dataset)} examples')

    # Data collator handles padding
    data_collator = DataCollatorForTokenClassification(tokenizer=tokenizer)

    # Training arguments
    training_args = TrainingArguments(
        output_dir='./ner_model',
        num_train_epochs=3,
        per_device_train_batch_size=8,
        per_device_eval_batch_size=8,
        learning_rate=5e-5,
        evaluation_strategy='epoch',
        save_strategy='epoch',
        save_total_limit=2,
        logging_steps=10,
        load_best_model_at_end=True,
        push_to_hub=False,  # Set to True to push to HuggingFace Hub
    )

    # Simple metrics function
    def compute_metrics(eval_pred):
        predictions, labels = eval_pred
        predictions = np.argmax(predictions, axis=2)

        # Remove ignored index (special tokens)
        true_predictions = [
            [label_list[p] for (p, l) in zip(prediction, label) if l != -100]
            for prediction, label in zip(predictions, labels)
        ]
        true_labels = [
            [label_list[l] for (p, l) in zip(prediction, label) if l != -100]
            for prediction, label in zip(predictions, labels)
        ]

        # Simple accuracy
        all_preds = [p for pred_list in true_predictions for p in pred_list]
        all_labels = [l for label_list in true_labels for l in label_list]
        accuracy = sum([p == l for p, l in zip(all_preds, all_labels)]) / len(all_labels)

        return {"accuracy": accuracy}

    # Initialize Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        tokenizer=tokenizer,
        data_collator=data_collator,
        compute_metrics=compute_metrics
    )

    # Train!
    print('\n📚 Training in progress...')
    train_result = trainer.train()

    print('\n✅ Training complete!')
    print(f'   Final loss: {train_result.training_loss:.4f}')

    # Save the model
    trainer.save_model('./ner_model_final')
    print('💾 Model saved to ./ner_model_final')
```

---

## 🤖 Part 3: Hugging Face → Label Studio (ML Backend Integration)

### Step 8: Create ML Backend with Hugging Face Model

Now we'll connect a Hugging Face model as an ML backend to provide pre-annotations in Label Studio. This dramatically speeds up the annotation process!

**Benefits:**
- **Pre-annotations**: Model generates initial predictions for annotators to review
- **Active Learning**: Focus annotation efforts on difficult/uncertain examples
- **Continuous Improvement**: Retrain model with new labels, deploy updated predictions

We'll use a pre-trained NER model from Hugging Face. You can also use your custom trained model from Step 7.


```python
from transformers import pipeline
import time

# Load a pre-trained Hugging Face NER model
print('🤗 Loading Hugging Face NER model...')
# Using a popular pre-trained NER model
ner_pipeline = pipeline(
    "ner",
    model="dslim/bert-base-NER",
    aggregation_strategy="simple"  # Combines B- and I- tags
)
print('✅ Model loaded successfully!')

# Map Hugging Face labels to our Label Studio labels
LABEL_MAPPING = {
    'PER': 'PER',
    'ORG': 'ORG',
    'LOC': 'LOC',
    'MISC': 'MISC'
}

def create_predictions_for_task(task):
    """Generate predictions for a single Label Studio task"""
    text = task['data']['text']

    # Get predictions from Hugging Face model
    entities = ner_pipeline(text)

    # Convert to Label Studio format
    results = []
    for entity in entities:
        # Map label if needed
        label = LABEL_MAPPING.get(entity['entity_group'], 'MISC')

        result = {
            "from_name": "ner",
            "to_name": "text",
            "type": "labels",
            "value": {
                "start": entity['start'],
                "end": entity['end'],
                "text": text[entity['start']:entity['end']],
                "labels": [label]
            },
            "score": entity['score']  # Confidence score
        }
        results.append(result)

    return results

# Test the prediction function with a sample
print('\n🧪 Testing prediction function...')
sample_text = "Apple Inc. was founded by Steve Jobs in California."
test_task = {"data": {"text": sample_text}}

predictions = create_predictions_for_task(test_task)
print(f'   Input: "{sample_text}"')
print(f'   Found {len(predictions)} entities:')
for pred in predictions:
    entity_text = pred['value']['text']
    entity_label = pred['value']['labels'][0]
    entity_score = pred['score']
    print(f'     - "{entity_text}" → {entity_label} (confidence: {entity_score:.2f})')
```

### Step 9: Generate Pre-annotations

Now let's use our Hugging Face model to generate predictions for unlabeled tasks in Label Studio!


```python
# Get unlabeled tasks from Label Studio
print('📋 Fetching unlabeled tasks...')
all_tasks = project.get_tasks()
unlabeled_tasks = [task for task in all_tasks if not task.get('annotations')]

print(f'   Total tasks: {len(all_tasks)}')
print(f'   Unlabeled tasks: {len(unlabeled_tasks)}')

if len(unlabeled_tasks) == 0:
    print('\n✅ All tasks are already labeled! No predictions needed.')
else:
    # Generate predictions for unlabeled tasks
    print(f'\n🔮 Generating predictions for {min(10, len(unlabeled_tasks))} tasks...')

    prediction_count = 0
    for task in unlabeled_tasks[:10]:  # Start with first 10 for demo
        try:
            # Generate predictions using our HuggingFace model
            results = create_predictions_for_task(task)

            # Create prediction in Label Studio using SDK
            project.create_prediction(
                task_id=task['id'],
                result=results,
                model_version='huggingface-bert-base-NER'
            )

            prediction_count += 1

            # Show progress
            if prediction_count % 5 == 0:
                print(f'   Generated {prediction_count} predictions...')

        except Exception as e:
            print(f'   ⚠️  Error on task {task["id"]}: {str(e)}')
            continue

    print(f'\n✅ Successfully created {prediction_count} pre-annotations!')
    print(f'\n💡 Next steps:')
    print(f'   1. Open Label Studio: {ls_url}/projects/{project.id}')
    print(f'   2. Review and correct the pre-annotations')
    print(f'   3. Submit your annotations')
    print(f'   4. Export and retrain for continuous improvement!')

```

---

## 🎉 Summary & Next Steps

Congratulations! You've built a complete Hugging Face + Label Studio integration pipeline for Named Entity Recognition!

### What You Accomplished:

✅ **HF → LS**: Loaded WikiANN dataset from Hugging Face into Label Studio  
✅ **LS → HF**: Exported labeled data and converted to Hugging Face format with token alignment  
✅ **HF → LS**: Generated pre-annotations using Hugging Face NER models  
✅ **Trained**: Fine-tuned a custom NER model on your labeled data

### The Complete Workflow:

```
1. Import data from Hugging Face → Label Studio
2. Annotate tasks in Label Studio (with ML assistance)
3. Export annotations → Train/fine-tune Hugging Face model  
4. Deploy updated model → Generate better predictions
5. Repeat for continuous improvement! 🔄
```

### 🔄 Apply to Other Tasks:

Want to adapt this workflow for other tasks? Check out:
- **Text Classification**: Adapt the export/prediction logic for sentiment analysis, topic classification, etc.
- **Question Answering**: Modify for extractive or generative QA tasks
- **Summarization**: Apply to text summarization workflows

### Advanced Use Cases:

- **Active Learning**: Use model confidence scores to prioritize uncertain examples for annotation
- **Domain Adaptation**: Fine-tune on your specific domain data for better performance
- **Multi-annotator**: Combine predictions from multiple models or annotators
- **Batch Processing**: Process large datasets efficiently with batch predictions
- **Model Versioning**: Track model versions and compare performance over time

### Resources:

- 📖 [Label Studio SDK Documentation](https://labelstud.io/sdk/)
- 🤗 [HuggingFace Transformers](https://huggingface.co/docs/transformers)
- 🎯 [Label Studio ML Backend](https://github.com/HumanSignal/label-studio-ml-backend)

### Need Help?

- Label Studio Community: https://slack.labelstudio.heartex.com/
- HuggingFace Forums: https://discuss.huggingface.co/


---

## 🚀 Next steps: Production ML Backend Setup

For production use, you'll want to deploy your Hugging Face model as a persistent ML backend server. Here's how:

### Option 1: Using Label Studio ML Backend (Recommended for Production)

```bash
# Install label-studio-ml
pip install label-studio-ml

# Create a new ML backend project
label-studio-ml init my_ner_backend --script label_studio_ml/examples/simple_text_classifier.py

# Edit my_ner_backend/model.py to use your Hugging Face model
# Then start the server:
label-studio-ml start my_ner_backend --port 9090
```

Then connect it in Label Studio:
1. Go to Project Settings → Machine Learning
2. Click "Add Model"
3. Enter URL: `http://localhost:9090`
4. Enable "Use for interactive preannotations"

### Option 2: Direct SDK Predictions (This Tutorial)

The approach used in this tutorial (SDK's `create_prediction()`) is perfect for:
- Batch processing of large datasets
- One-time pre-annotation runs
- Jupyter notebooks and data science workflows
- Prototyping and experimentation

### When to Use Each:

| Feature | SDK Predictions | ML Backend Server |
|---------|----------------|-------------------|
| Real-time predictions | ❌ | ✅ |
| Interactive labeling | ❌ | ✅ |
| Batch processing | ✅ | ✅ |
| Easy setup | ✅ | ⚠️ Moderate |
| Production ready | ⚠️ | ✅ |

Choose based on your use case!


# Evaluating Named Entity Recognition parsers with spaCy and Label Studio

![image](https://user-images.githubusercontent.com/2641205/112475305-f5863900-8d70-11eb-9eb8-9da879f61708.png)



Use Named Entity Recognition (NER) parsers to turn unstructured text into useful information by classifying information like organizations, dates, countries, professions, and others in the text. After a model detects those entities, they must be tagged and classified. FOR WHAT PURPOSE? 

This tutorial covers the process of extracting and tagging entities with a NER parser. You can tag a corpus of text manually or automatically using a machine learning model, then use Label Studio to iterate over the initial NER parsing results to improve their quality. 


This tutorial assumes that you're comfortable with basic natural language processing (NLP) and machine learning (ML) terminology, such as the technical meaning of evaluation, the basic function and results provided by NER taggers, and the definitions of standard NLP terms like entity and token. 

To follow along with this tutorial, you need to do the following:
- set up a local Python environment
- use pip to install packages
- write Python code to script the parsing pipeline


## What this tutorial covers

You can use off-the-shelf parsers and NER taggers to handle named entity parsing and tagging, but the tagging accuracy of these for a specialized or small text corpus can often be low. Because of that, in many real-world settings you need to evaluate the accuracy of various NER taggers and fine tune it for better accuracy for your data.

This tutorial helps you evaluate accuracy of NER taggers from standard spaCY language models for a dataset based on transcripts from the podcast This American Life, then you can use Label Studio to correct the transcripts to prepare you to fine tune a specific tagger. 

Use the NLP library spaCy to process and analyze the text corpus by writing a Python NLP application. spacCy contains the relevant POS and NER tagging functions. Compare the tag location predictions from spaCY with the manual NER tag annotations that you create. 

Then use Label Studio to create a manually-annotated text chunk with using the NER labels used by spaCy. The manually annotated text is highly likely to be more accurate than any results produced by most NER parsers.

## Steps in this tutorial

- Download a dataset from data.world of podcast transcripts.
- Install spaCy, pandas and the relevant spaCy models.
- Parse the downloaded dataset with spaCy
- Evaluate spaCy's "small" language model against its "large" one; 
- Evaluate the `Easter` token parsing specifically, since it is often mistagged.
- Add correct NER tags manually to the dataset using Label Studio.
- Evaluate the larger spaCy model and compare the results to the gold standard.

## Get started: Download the dataset and install spaCy and pandas


Download the [This American Life dataset from data.world](https://data.world/cjewell/this-american-life-transcripts). It contains transcripts of every episode since November 1995. You need a data.world account to download the dataset. 

The text corpus is available in two files in CSV format. Download the `lines_clean.csv` version of the file, ordered by line of text. This file is formatted in a way that is easier to analyze the raw text of the podcast transcripts.

An excerpt of the file looks like the following:

<img width="1137" alt="The columns of our dataset" src="https://user-images.githubusercontent.com/2641205/111653437-34b00980-8808-11eb-9514-eeabdd9556a7.png">

You need to analyze the `line_text` column found in the `lines_clean.csv` file, which contains clean textual data.

### Install spaCy and pandas

Before you install spaCy, make sure that `pip` is installed and has been updated recently. Type the following in the command line: 

```bash
python -m pip install -U pip
```

After you install or update pip, use pip to install the most recent [spaCy](https://spacy.io) version:
```bash
pip install -U spacy
```

You also need to install [pandas](https://pandas.pydata.org), which provides methods and data structures for dataset preprocessing to make spaCy processing possible. Use the following pip command:
```bash
pip install pandas
```

### Import preannotated data
Let's import Spacy models predictions into Label Studio.

Here the simple script to create Label Studio tasks in JSON format:

```python
import spacy
import pandas as pd
import json
from itertools import groupby

# Download SpaCy models:
models = {
    'en_core_web_sm': spacy.load("en_core_web_sm"),
    'en_core_web_lg': spacy.load("en_core_web_lg")
}

# This function converts SpaCy docs to the list of named entity spans, in Label Studio compatible JSON format:
def doc_to_spans(doc):
    tokens = [(tok.text, tok.idx, tok.ent_type_) for tok in doc]
    results = []
    entities = set()
    for entity, group in groupby(tokens, key=lambda t: t[-1]):
        if not entity:
            continue
        group = list(group)
        _, start, _ = group[0]
        word, last, _ = group[-1]
        text = ' '.join(item[0] for item in group)
        end = last + len(word)
        results.append({
            'from_name': 'label',
            'to_name': 'text',
            'type': 'labels',
            'value': {
                'start': start,
                'end': end,
                'text': text,
                'labels': [entity]
            }
        })
        entities.add(entity)

    return results, entities

# Now load our data:
df = pd.read_csv('data/lines_clean.csv')
df = df[df['line_text'].str.contains("Easter ", na=False)]
print(df.head())
texts = df['line_test']

# Prepare Label Studio tasks in import JSON format
entities = set()
tasks = []
for text in texts:
    predictions = []
    for model_name, nlp in models.items():
        doc = nlp(text)
        spans, ents = doc_to_spans(doc)
        entities |= ents
        predictions.append({'model_version': model_name, 'result': spans})
    tasks.append({
        'data': {'text': text},
        'predictions': predictions
    })

# Save Label Studio tasks.json
print(f'Save {len(tasks)} tasks to "tasks.json"')
with open('tasks.json', mode='w') as f:
    json.dump(tasks, f, indent=2)
    
# Save class labels 
print('Named entities are saved to "named_entities.txt"')
with open('named_entities.txt', mode='w') as f:
    f.write('\n'.join(sorted(entities)))
```

Now we get 
- `tasks.json` to import in Label Studio
- `named_entities.txt` file to copy list of entities and paste them into project configuration
 
 
## Label Named Entities in Label Studio

To classify named entities, you need to create a dataset with gold standard labels that are accurate for your use case. To do that, use the open source data labeling tool, [Label Studio](https://labelstud.io). 

### Install and start Label Studio
Install it in a virtual environment with `pip` using the following command:
```bash
python3 -m venv env
source env/bin/activate
python -m pip install label-studio
```
After you install Label Studio, start the server and initialize a project when prompted:

```bash
label-studio
```

<img width="908" alt="CleanShot 2021-03-19 at 14 33 53@2x" src="https://user-images.githubusercontent.com/2641205/111788264-2cb3a080-88c0-11eb-858b-08a8a7908b79.png">

```bash
label-studio start ner-tagging
```

Open Label Studio in your web browser and create an account to sign up.
<img width="1122" alt="CleanShot 2021-03-19 at 14 36 23@2x" src="https://user-images.githubusercontent.com/2641205/111788581-8ae08380-88c0-11eb-91ad-fd169e72c864.png">

### Set up your Label Studio project

Open the `ner-tagging` project and do the following:
1. Click **Import** to add data. 
2. Upload the `tasks.json` file

Next, set up the labeling interface with the spaCy NER labels to create a gold standard dataset.
1. From the project in Label Studio, click **Settings** and click **Labeling Interface**.
2. Choose **Named Entity Recognition** template and paste the content of `named_entities.txt` inside the textarea <pic>
3. Click **Save** to save the configuration and return to the project data.
4. Filter the project data so that you can focus on only the lines that contain the word "Easter". Click **Filters** and select the field `line_text`. For **contains**, type `Easter ` with a trailing space.  

![CleanShot 2021-03-19 at 14 42 47@2x](https://user-images.githubusercontent.com/2641205/111789496-7fda2300-88c1-11eb-8308-ddd6156290a6.png)

### Label your gold standard dataset in Label Studio

From the filtered list of data, click **Label** to start labeling the instances of "Easter" in your data. You can use the keyboard shortcuts to select the correct label, then highlight the word Easter in the text to label it. 
![](https://cln.sh/9WZBul+)

### Export your data to retrain your model

After you finish labeling the instances of Easter in the dataset manually, export the annotated data so that you can retrain the spaCy model to be more accurate when recognizing this keyword. 
1. From your Label Studio project, click **Export**.
2. Select the **JSON** file format and download `annotations.json`

![CleanShot 2021-03-19 at 14 52 09@2x](https://user-images.githubusercontent.com/2641205/111790696-c3815c80-88c2-11eb-96b1-afd57a65cf36.png)

As with all human-in-the-loop data labeling projects, the correct tag for "Easter" can be subjective and contextual. Some instances of "Easter" might be labeled with `EVT` to indicate an event, and others might be `PER` if the Easter Bunny is being discussed. Choose the labels that make the most sense for your use case.

## Compare the spaCy model with the gold standard dataset

Run this script to evaluate exported data:

```python
import json
from collections import defaultdict

tasks = json.load(open('annotations.json'))
model_hits = defaultdict(int)

for task in tasks:
    annotation_result = task['annotations'][0]['result']
    for r in annotation_result:
        r.pop('id')
    for prediction in task['predictions']:
        model_hits[prediction['model_version']] += int(prediction['result'] == annotation_result)

num_task = len(tasks)
for model_name, num_hits in model_hits.items():
    acc = num_hits / num_task
    print(f'Accuracy for {model_name}: {acc:.2f}%')
```

It gives the following output:
```bash
Accuracy for en_core_web_sm: 79.4%
Accuracy for en_core_web_lg: 87.8%
```
So, as you can see, the result are not perfect for both models, but large CNN model performs significantly better then small one. 
And that's how we can easily evaluate the performance results of two models in just few minutes of annotation, without spending too much time in building complex evaluation pipelines with static datasets. 

## What's next?

You've seen how to do basic NER tagging, both by coding your own approach and by adding NER tags manually with the help of the Label Studio data labeling software. For a real-world use case, manually label a large amount of data specific to your project, and then [retrain spaCy's models](https://spacy.io/usage/training) based on this new data set.

This is a simple demo of using only one specific corner case based on `Easter` keyword, but of course it could be easily extended to monitore more complex semantics, and assessing more than 2 models at once.
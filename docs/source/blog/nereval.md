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

### Install spaCy models

After you install spaCy and pandas, install specific models from spaCy. SpaCy includes multiple pre-trained models in 64 languages. In this case, let's evaluate the smaller English language core model `en_core_web_sm` and the larger English language core model `en_core_web_lg`. 

In general, the smaller model might be more efficient but less accurate while the larger model might be more accurate, but less efficient.

Download both models by running the following commands from the command line:

```bash
python -m spacy download en_core_web_sm
python -m spacy download en_core_web_lg
```

### Prepare to evaluate the models

This tutorial has you write code to run from the command line. 

Using your desired Python editor, create a file called `ner-evaluation.py` to update according to the code examples discussed in this tutorial. 

If you're more comfortable using a Jupyter Notebook to implement the code in this tutorial, that is possible but is outside the scope of this tutorial.

## Load the data for evaluation

You now need to do the following:

- Load both spaCy models
- Read in the CSV corpus as a source for analysis
- Extract text lines containing the keyword "Easter".

This tutorial uses the word Easter to test the accuracy of the NER tagger.

Place the following code in your `ner-evaluation.py` file:

```python 
1  import spacy
2  import pandas as pd
3
4  # Imported both libraries needed to read and process our CSV corpus
5
6  nlp_sm = spacy.load("en_core_web_sm")
7  nlp_lg = spacy.load("en_core_web_lg")
8
9  # Loaded both models and saved both to their own language objects.
10
11 df = pd.read_csv('lines_clean.csv')
12
13 # Loaded the CSV file into its own dataframe.
14
15 df = df[df['line_text'].str.contains("Easter ", na=False)]
16
17 # Extracted all occurrences of the word "Easter" from the line text 
18 # column in the dataframe. The 'na' parameter lets missing
19 # parameters be renamed as False, rather than as NaN
20 # parameters.
21
22 print(df.head(20))
23
24 # prints the first 20 lines of the dataframe
```

Run the program from the command line:

```bash
 python ner-evaluation.py
```

With this code, you successfully set up the Python libraries and spaCy models and loaded in the cleaned corpus. To check whether the corpus has been saved correctly to the dataframe, the code retrieved occurrences of the word "Easter" to set up a simple test case. 

## Parse and evaluate the corpus

You can now start parsing and tagging the corpus to start evaluating the NER tagging results.

Because the cleaned and formatted text lines are available in a column of the dataset, you can iterate through the column to find and tag lines containing the "Easter" token. 

Your code needs to do the following:
1. Save the first ten lines of the `line_text` column saved in the dataframe to a variable called `texts`. 
2. Apply the pre-trained pipeline package to the `texts` object. 
3. Save the results to the new variable `doc_sm`. 
4. Create another nested `for` loops to iterate through the corpus, the lines and the tokens, classifying the relevant tokens according to their NER entity categories. 
5. Then, print the tokens and their entity type.

To accomplish these steps, add the following lines to your `ner-evaluation.py` file in the editor and run the program.

```python
1  texts = df['line_text'][:10]
2 
3  # Save the first 10 lines of the  line_text portion of the dataframe
4  # to the texts object
5 
6  docs = nlp_sm.pipe(texts)
7
8  # Now apply the complete spaCy NLP pipeline, including the NER
9  # tagger, to the texts object. Use the small model ("nlp_sm"). The resulting corpus 
10 # contains parsing and NER tags, but results for each tag category
11 # have to be read out separately.
12 
13 for doc in docs:   
14 
15 # Iterate through all parsed and tagged lines in the texts object.
16 
17     for token in doc:
18 
19 # Iterate through all individual tagged tokens in each line inside the texts 
20 # object.
21 
22         print(token.text, token.ent_type_)
23
24 # Print out the token, plus its NER entity type tag
25 
26     print("----------")
```

The following is an excerpt from the printed output: 

```
And 
then 
, 
we 
had 
Easter ORG
dinner 
at 
John 
's 
house 
on 
Irving ORG
. 
```

The spaCy model tagged 'Easter' with the `ORG` (Organization) tag instead of the EVT (Event) tag.  

To see whether the results improve when using the large spaCy model, update your script with the code below, replacing `nlp_sm` with `nlp_lg` to specify the large model. 

```python
1 docs = nlp_lg.pipe(texts)
2 
3 # Note the large `nlp_lg` model.
4 
5 for doc in docs:    
6     for token in doc:
7         print(token.text, token.ent_type_)
8    print("----------") 
```

Run the program again and review the same excerpt as before:
```
And 
then 
, 
we 
had 
Easter GPE
dinner 
at 
John 
's 
house 
on 
Irving ORG
. 

```
The large model makes different predictions for two entity labels.  It labels the first instance of 'Easter' as `GPE` (Geopolitical Entity) and Irving as an ORG (Organization). Although the prediction is different from that of the small model, it's still wrong.  


## Automatically evaluate NER of small and large spaCy models

Based on the small-scale parsing output from the small and large spaCY models, it's unclear which model will perform better at correctly labeling "Easter" across the entire transcript corpus. 

To more fully evaluate the model accuracy for this token, replace the code in your `ner-evaluation.py` script with the following code sample. This code sets up spaCy and pandas and reads in the transcript corpus, loading both the small and large models, and placing the labeled text segments into a list.

```python
import pandas as pd
import spacy

KEYWORD = "Easter"

# A literal that can be passed to the functions below. 
 
df = pd.read_csv("lines_clean.csv")
df = df[df["line_text"].str.contains(f"{KEYWORD} ", na=False)]

# This passes the KEYWORD literal to the 'contains' function, 
# asking whether the KEYWORD, i.e. "Easter", is part of the line.

texts = df["line_text"]

print(df.head())
print(df.shape)

# The head() function defaults to a line count of 5, while the shape
# parameter contains the number of columns and rows. Useful for
# testing.

nlp_sm = spacy.load("en_core_web_sm")
nlp_lg = spacy.load("en_core_web_lg")

docs_sm = list(nlp_sm.pipe(texts))
docs_lg = list(nlp_lg.pipe(texts))

```

As an additional step, your code can automatically compare the NER tagging results for both models. To do that, append the following code to your `ner-evaluation.py` script: 
```python
total_tokens = 0
# Add up the number of tokens in the text to the number total_tokens 
# in order to determine the percentage of tokens recognized as 
# named entities that both models can find and tag.

agreed_tokens = 0
# Indicates the number of tokens both models have in common.

total_matches = 0
# Shows the number of properly tagged named entities per model.

agreed_matches = 0
# Shows the number of named entities both models share.

for i in range(len(texts)):
  # Iterates through each line of text. Note that both models are
  # iterating through their own copy of the text lines
   doc_sm = docs_sm[i]
   doc_lg = docs_lg[i]
   for i in range(len(doc_sm)):
      # Iterates through each token in each line.
       total_tokens += 1
      # Adds up the number of tokens analyzed by the small model. 
      # The number can be used for the large and the small model.
      if doc_sm[i].text == f"{KEYWORD}" and doc_lg[i].text == f"{KEYWORD}":
          total_matches += 1
          # Adds up the number of keyword matches between models. In 
          # this case there is only 1 keyword.
          print(doc_sm[i - 5 : i + 5])
          print(
               f"spacy_sm: {doc_sm[i].ent_type_} {doc_sm[i].text}
                 spacy_lg: {doc_lg[i].ent_type_} {doc_lg[i].text} "
                 )
                print("---")
          # This prints out matching keywords and their NER entity types
          # and the context words and their entity types. The prediction 
          # results from both models are being compared.
          if doc_sm[i].ent_type == doc_lg[i].ent_type:
             agreed_matches += 1
               # If the keyword NER entity types found in both models 
               # match, you can assume that the NER tag is correct and 
               # they are added to the sum total of the agreed_matches 
               # number. 
       if doc_sm[i].ent_type is not None:
           if doc_sm[i].ent_type == doc_lg[i].ent_type:
               agreed_tokens += 1
              # If the NER entity types match, add each token matching a 
              # keyword tagged by an NER tag to the agreed_tokens total.
```

The script now runs the transcript through both the large and small spaCy models, analyzes whether or not the NER tag for the "Easter" keyword matches for the models, and gathers the predictions and 10 additional words of context from the transcript to use for quality checking.

Append the following code sample to your script to see the results of the analysis:
```python
print(f"""{total_tokens}
        Total tokens processed              
         {agreed_tokens} ({(agreed_tokens/total_tokens):.2f}%)
         Proportion of agreed tokens when using both models to collect the total number of tokens.
         Keywords ({KEYWORD}) processed: {total_matches}
         Small and large model agree on {agreed_matches} ({(agreed_matches/
         total_matches):.2f}%)""")  
```

Run the script, and review the output. 

For example, the following output is what you might see, showing 10 words of context for the "Easter" keyword as well as the predicted labels from the small and large models that don't agree.
```
And then, we had Easter dinner at John's
spacy_sm: ORG Easter spacy_lg: GPE Easter 
---
When? 11:30 PM, Easter eve. Where?
spacy_sm: PERSON Easter spacy_lg: DATE Easter 
---
Super Sport, night before Easter, Route 11.
spacy_sm: GPE Easter spacy_lg: DATE Easter 
---
Our viewers saw art last Easter with a two-
spacy_sm:  Easter spacy_lg:  Easter 
---
. We went back for Easter and then Thanksgiving and
spacy_sm: PERSON Easter spacy_lg:  Easter 

<...>

Total tokens processed: 3286
Small and large model agreed on 3182 (0.97%)
Keywords (Easter) processed: 39
Small and large model agreed on 6 (0.15%)
```

This allows you to assess which model is more effective for your use case, as well as identify where the NER tagger might have applied the wrong tags. 

The accuracy of entity class predictions in widely-available models can vary for niche use cases like this Easter keyword. To improve the spaCy model accuracy for accurately labeling Easter, label a small corpus of data to serve as a gold standard for the model that you can use to train the machine learning model. 

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
2. Upload the `lines_clean.csv` file.
3. Specify that `lines_clean.csv` is a `List of tasks`. 
4. Click **Import** to add the data.

Next, set up the labeling interface with the spaCy NER labels to create a gold standard dataset.
1. From the project in Label Studio, click **Settings** and click **Labeling Interface**.
2. Click **Code** to use the XML editor and paste the following configuration:
```xml
<View>
  <Labels name="label" toName="text">
    <Label value="ORG" background="darkorange"/>
    <Label value="LOC" background="orange"/>
    <Label value="MISC" background="green"/>
    <Label value="PER" background="#FFA39E"/>
    <Label value="EVT" background="#D4380D"/>
    <Label value="PROD" background="#FFC069"/>
    <Label value="DRV" background="#AD8B00"/>
    <Label value="GPE_LOC" background="#D3F261"/>
    <Label value="GPE_ORG" background="#389E0D"/>
    <Label value="NORP" background="#5CDBD3"/>
    <Label value="FACILITY" background="#096DD9"/>
    <Label value="PRODUCT" background="#F759AB"/>
    <Label value="WORK_OF_ART" background="#D4380D"/>
    <Label value="LAW" background="#FFC069"/>
    <Label value="LANGUAGE" background="#AD8B00"/>
    <Label value="DATE" background="#D3F261"/>
    <Label value="TIME" background="#389E0D"/>
    <Label value="PERCENT" background="#5CDBD3"/>
    <Label value="MONEY" background="#096DD9"/>
    <Label value="QUANTITY" background="#ADC6FF"/>
    <Label value="ORDINAL" background="#9254DE"/>
    <Label value="CARDINAL" background="#F759AB"/>
  </Labels>
  <Text name="text" value="$line_text" granularity="word"/>
</View>
```
3. Click **Save** to save the configuration and return to the project data.
4. Filter the project data so that you can focus on only the lines that contain the word "Easter". Click **Filters** and select the field `line_text`. For **contains**, type `Easter ` with a trailing space.  

![CleanShot 2021-03-19 at 14 42 47@2x](https://user-images.githubusercontent.com/2641205/111789496-7fda2300-88c1-11eb-8308-ddd6156290a6.png)

### Label your gold standard dataset in Label Studio

From the filtered list of data, click **Label** to start labeling the instances of "Easter" in your data. You can use the keyboard shortcuts to select the correct label, then highlight the word Easter in the text to label it. 
![](https://cln.sh/9WZBul+)

### Export your data to retrain your model

After you finish labeling the instances of Easter in the dataset manually, export the annotated data so that you can retrain the spaCy model to be more accurate when recognizing this keyword. 
1. From your Label Studio project, click **Export**.
2. Select the **CSV** file format to match the dataset used earlier. 

![CleanShot 2021-03-19 at 14 52 09@2x](https://user-images.githubusercontent.com/2641205/111790696-c3815c80-88c2-11eb-96b1-afd57a65cf36.png)

As with all human-in-the-loop data labeling projects, the correct tag for "Easter" can be subjective and contextual. Some instances of "Easter" might be labeled with `EVT` to indicate an event, and others might be `PER` if the Easter Bunny is being discussed. Choose the labels that make the most sense for your use case.

## Compare the spaCy model with the gold standard dataset

Now, evaluate the gold standard annotations against the results produced by spaCy. This tutorial shows the evaluation based on eight manually-created labels, but you'd want to label many more samples to meaningfully retrain the model.  

1. Rename the file you downloaded from Label Studio to `manual-easter-labels.csv`.
2. Place the file in the same directory as your `ner-evaluation.py` script. 
3. Remove the existing code in the `ner-evaluation.py` file and replace it with the following:
```python
import pandas as pd
import json
# This is a new library import
import spacy

nlp = spacy.load('en_core_web_lg')

manual_labels = pd.read_csv('manual-easter-labels.csv')
manual_labels.head()
# Mark the CSV file as the manually tagged corpus.

l = manual_labels[['line_text', 'ner']]

for i, text in enumerate(manual_labels['line_text']):
    gold_labels = set(json.loads(manual_labels['ner'][i])[0]['labels'])
   
   doc = nlp(text)
   spacy_labels = {token.ent_type_ for token in doc if token.ent_type_}
   print(f"""
   {text} ...
    spaCy labels: {spacy_labels}
    gold_labels: {gold_labels}
    """)
```

After you run this script, you see output similar to the following excerpt:

```

I slept there until early morning, when the activity started to increase, and people started coming in. And I went out and followed the crowd where it was going when they were going out to the tombs area in Jerusalem. And I went out. And there were some folding chairs set up in front of this tomb area. And as the sun was coming up on that Easter morning, I was staring at empty tombs. And for a reason that I can not comprehend, as I sat on that chair contemplating this view of the early sun morning coming into the empty tombs, all that I had been wrestling with for the past many, many years in thinking about religion sort of became resolved in my mind. And at that very moment, I believed that Jesus Christ had, indeed, risen from those tombs. ...
spaCy labels: {'GPE', 'TIME'}
gold_labels: {'Date'}
```

If you invest the time and effort into labeling each example by hand, you can compare the two sets of labels and see how often spaCy gets them correct.

## What's next?

You've seen how to do basic NER tagging, both by coding your own approach and by adding NER tags manually with the help of the Label Studio data labeling software. For a real-world use case, manually label a large amount of data specific to your project, and then [retrain spaCy's models](https://spacy.io/usage/training) based on this new data set.

The code in this tutorial uses some shortcuts, like using `Easter ` as a crude filter, skipping examples where "Easter" is followed by a punctuation mark. As a result, the script only calculates very crude accuracy metrics, but you can adapt and extend these code samples to your specific needs.

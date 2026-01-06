---
title: "How to Measure Inter-Annotator Agreement and Build Human Consensus with Label Studio"
hide_sidebar: true
order: 1004
open_in_collab: true
tutorial: true
community_author: hakan458
ipynb_repo_path: tutorials/how-to-measure-inter-annotator-agreement-and-build-human-consensus/how_to_measure_inter_annotator_agreement_and_build_human_consensus.ipynb
repo_url: https://github.com/HumanSignal/awesome-label-studio-tutorials/tree/main/tutorials/how-to-measure-inter-annotator-agreement-and-build-human-consensus
report_bug_url: https://github.com/HumanSignal/awesome-label-studio-tutorials/issues/new
thumbnail: /images/tutorials/tutorials-inter-annotator-agreement-and-consensus.png
meta_title: "How to Measure Inter-Annotator Agreement and Build Human Consensus with Label Studio"
meta_description: Learn how to measure inter-annotator agreement, build human consensus, establish ground truth and compare model predictions using the Label Studio SDK.
is_enterprise: true
is_starter_cloud: true
badges: SDK, Agreement, Colab
duration: 5-10 mins
---

This tutorial walks through a practical workflow to measure inter-annotator agreement, build human consensus, establish ground truth and
compare model predictions to that consensus using the Label Studio SDK.

Being able to measure agreement between different annotators, ground truth and models can help you get a sense of annotator/model performance, and help you make informed decisions to ultimately get higher quality labels in your project.

**Why This Matters**
- Reduce ambiguity: Low agreement reveals unclear instructions and subjective edge cases to fix.
- Improve label quality: Consensus strength is a practical confidence signal for ground truth.
- Target QA: Focus review on contentious tasks and annotator pairs instead of boiling the ocean.
- Fair model eval: Compare models to human consensus, not a single rater, to avoid evaluator bias.
- Faster iteration: Quantify reliability, prioritize fixes, and measure improvements over time.

**In this tutorial you will**
- Import data with overlap and (for demo) simulate multiple annotators.
- Compute IAA and per‑task consensus (majority vote) to establish ground truth.
- Compare a model to human consensus, flag low‑agreement and disagreement items, and bulk‑assign them for QA.
- Visualize results and summarize reliability to inform next steps.

**Outputs**
- Per‑task consensus + agreement ratio (confidence proxy)
- Model alignment score vs human consensus
- Targeted QA task lists for re‑annotation/review

**Notes:**
- We provide steps here to create a dataset from scratch, but you can skip these steps and use an existing project as well.
- Fill in your Label Studio URL and API key.


## Label Studio Requirements

This tutorial showcases one or more features available only in Label Studio paid products. We recommend [creating a Starter Cloud trial](https://app.humansignal.com/user/cloud-trial?offer=d9a5&) to follow the tutorial.

## Install dependencies


```python
!pip install -q label-studio-sdk pandas numpy seaborn scikit-learn matplotlib
```

## Import Libraries


```python
import os
import json
import random
from typing import Dict, List, Any, Tuple
from collections import Counter, defaultdict

import pandas as pd
import numpy as np

import matplotlib.pyplot as plt
import seaborn as sns

from label_studio_sdk import LabelStudio
from label_studio_sdk.types import ImportApiRequest, PredictionRequest
from label_studio_sdk.projects.assignments import AssignmentsBulkAssignRequestSelectedItemsIncluded
```

## 1) Connect to Label Studio

Replace placeholders with your details


```python
# URL of your Label Studio instance
BASE_URL = "https://app.humansignal.com"

# Your API key (find it in Account & Settings > Personal Access Token)
API_KEY = "YOUR API KEY"

ls = LabelStudio(base_url=BASE_URL, api_key=API_KEY)
```

## 2) Create a Project (or use existing)

We'll create a project with subjective tasks (toxicity severity) that benefits from multiple human judgments.
You can swap this labeling config for another subjective task, e.g., sarcasm detection, humor rating, or topic relevance.


```python
LABEL_CONFIG = """
<View>
  <Text name="text" value="$text"/>
  <Choices name="toxicity" toName="text" choice="single" showInLine="true">
    <Choice value="Non-toxic"/>
    <Choice value="Somewhat toxic"/>
    <Choice value="Very toxic"/>
  </Choices>
  <Style> .lsf-labels .lsf-choices__item { padding: 6px 10px; } </Style>
  <Choices name="flag" toName="text" choice="single" showInLine="true" visibleWhen="region-selected=false" perRegion="false">
    <Choice value="Needs QA"/>
  </Choices>
</View>
"""

PROJECT_TITLE = "Agreement & Consensus Tutorial"
```

### Create Project


```python
project = ls.projects.create(
    title=PROJECT_TITLE,
    label_config=LABEL_CONFIG,
    description=(
        "Subjective toxicity severity labeling with multiple annotators to measure agreement and build consensus."
    ),
    show_collab_predictions=True,
    maximum_annotations=3,  # allow up to 3 annotations per task
    is_published=True,
)
```

### Alternatively Get Project by ID


```python
# Uncomment and replace project ID with the one you wish to use
# project = ls.projects.get(id=1)
```

### Confirm We Are Using Correct Project


```python
print(f"Using project ID {project.id}: {project.title}")
```

## 3) Import Data (If creating new project)


```python
texts = [
    "I can't believe you think that's acceptable.",
    "Great job on the release, really proud of the team!",
    "You're clueless."
    "",
    "This comment is borderline rude, but maybe not intended.",
    "That post was hilarious, I loved it.",
    "This is the worst idea I've ever heard.",
    "Please refrain from using that tone here.",
    "I appreciate your perspective though we disagree.",
    "What a mess; whoever wrote this didn't think it through.",
]

tasks = [{"data": {"text": t}} for t in texts]
```


```python
response = ls.projects.import_tasks(
    id=project.id,
    request=tasks,
    commit_to_project=True,
    return_task_ids=True,
)
```

### Ensure tasks were created
If importing data from above, there should be 9 tasks


```python
tasks = [t for t in ls.tasks.list(project=project.id)]
```


```python
print(f"There are {len(tasks)} tasks in project {project.title}")
```

## 4) Create or Get Annotators

### Create Annotator Users if Needed
If you have annotations already in your project, skip this step


```python
current_user = ls.users.get_current_user()
org = current_user.active_organization
```


```python
annotator1 = ls.users.create(first_name="Annotator", last_name="1", username="Annotator1", email="annotator1@mycompany.com")
annotator2 = ls.users.create(first_name="Annotator", last_name="2", username="Annotator2", email="annotator2@mycompany.com")
annotator3 = ls.users.create(first_name="Annotator", last_name="3", username="Annotator3", email="annotator3@mycompany.com")
```


```python
ls.organizations.members.update(id=org, user_id=annotator1.id, role="AN")
ls.organizations.members.update(id=org, user_id=annotator2.id, role="AN")
ls.organizations.members.update(id=org, user_id=annotator3.id, role="AN")
```

### Alternatively Get Existing Annotators


```python
# Replace user IDs with annotators from your organization
annotator1 = ls.users.get(id=31228)
annotator2 = ls.users.get(id=13061)
annotator3 = ls.users.get(id=11551)
```

## 5) Create Annotations for Tasks
This will create 3 annotations per task in the project. This will simulate strong consensus on some tasks, and disagreement on others. <br>
__* Skip this step if you are using an existing project that already has annotations.__


```python
annotator_ids = [annotator1.id, annotator2.id, annotator3.id]
# Will be used in agreement matrix step
annotator_id_to_initials = {annotator1.id: annotator1.initials, annotator2.id: annotator2.initials, annotator3.id: annotator3.initials}
```


```python
def to_annotation_result(label: str, from_name: str = "toxicity", to_name: str = "text") -> List[Dict[str, Any]]:
    """
    Helper function that takes a single label and returns a full result dict
    """
    return [
        {
            "from_name": from_name,
            "to_name": to_name,
            "type": "choices",
            "value": {"choices": [label]},
        }
    ]
```


```python
for idx, task in enumerate(tasks):
    # Define label pattern by index
    if idx % 3 == 0:
        # strong consensus
        labels = ["Non-toxic", "Non-toxic", "Non-toxic"]
    elif idx % 3 == 1:
        # no consensus (all different)
        labels = ["Non-toxic", "Somewhat toxic", "Very toxic"]
    else:
        # weak consensus (2 vs 1)
        labels = ["Somewhat toxic", "Very toxic", "Very toxic"]

    for i, lab in enumerate(labels):
        kwargs: Dict[str, Any] = {"result": to_annotation_result(lab)}
        if annotator_ids:
            kwargs["completed_by"] = annotator_ids[i % len(annotator_ids)]
        ls.annotations.create(id=task.id, **kwargs)
```

## 6) Measure and Analyze Agreement
Label Studio Starter Cloud and Label Studio Enterprise provide a variety of features that allow you to see agreement at different levels. We will start with project level stats and work our way down into more detailed stats.

### Get Project-Level Agreement
This is the average agreement score across all tasks in the project <br>
Gives you a sense of overall agreement at a high level


```python
response = ls.projects.stats.total_agreement(id=project.id)
print(f"Total Agreement for Project: {response.total_agreement*100:.2f}%")
```

### Get Annotator-Level Agreement
This is the average agreement score across all tasks, for a specific annotator. <br>
This can provide you information on how well a single annotator is agreeing with others in the project. <br>
For example here we can see annotator 2 has a higher agreement across all other annotators.


```python
response = ls.projects.stats.agreement_annotator(id=project.id, user_id=annotator1.id)
print(f"Annotator Agreement for {annotator1.email}: {response.agreement_per_annotator*100:.2f}%")
```


```python
response = ls.projects.stats.agreement_annotator(id=project.id, user_id=annotator2.id)
print(f"Annotator Agreement for {annotator2.email}: {response.agreement_per_annotator*100:.2f}%")
```

### Annotator Agreement Matrix
Using the IAA (inter-annotator-agreement) we can get a matrix of annotators in the project, and see how specific annotators agree with eachother.


```python
response = ls.projects.stats.iaa(id=project.id)
```


```python
# Plot the matrix as a table
iaa_matrix = np.array(response.iaa, dtype=float)
user_labels = [annotator_id_to_initials[u] for u in (response.users or list(range(1, iaa_matrix.shape[0] + 1)))]

# Create percentage text, hide diagonal (self-agreement)
cell_text = []
for i in range(iaa_matrix.shape[0]):
    row = []
    for j in range(iaa_matrix.shape[1]):
        row.append("—" if i == j else f"{iaa_matrix[i, j] * 100:.0f}%")
    cell_text.append(row)

fig_w = 1.5 + 0.9 * len(user_labels)
fig_h = 1.2 + 0.7 * len(user_labels)
fig, ax = plt.subplots(figsize=(fig_w, fig_h))
ax.axis("off")

table = ax.table(
    cellText=cell_text,
    rowLabels=user_labels,
    colLabels=user_labels,
    cellLoc="center",
    loc="center",
)
table.auto_set_font_size(True)
#table.set_fontsize(15)
table.scale(1.5, 2)

ax.set_title("Inter-Annotator Agreement (IAA)")
plt.show()
```

Here we can see how differerent annotators agree with eachother, which annotators have a stronger consensus versus which annotators do not. This can give you an idea of annotator performance and allows you make decisions based on this data, such as removing certain annotators from a project, or assigning more tasks to annotators with high agreement.

## 7) Route Low-Agreement Tasks for Further Annotation
Use task-level agreement values to identify items below a configurable threshold and bulk-assign them for additional annotations (AN). This is useful to strengthen consensus on ambiguous items.


```python
tasks = ls.tasks.list(project=project.id)
```


```python
# Set a threshold for low agreement to filter tasks that we want to re-annotate - 50% for this example but in a real world project it would likely be higher
low_agreement_threshold = 0.5
```


```python
tasks_to_reannotate = []
for task in tasks:
    if task.agreement < low_agreement_threshold:
        tasks_to_reannotate.append(task.id)
```

**Note**: This bulk assign call requires that the user we are assigning to has signed in and used the platform. If you are using the programmatic flow from above to create users, we can only assign to the current_user. If you retrieved existing annotators, we can assign to one of those (annotator1, annotator2, annotator3) <br>
To make sure this call works for everyone using this tutorial, we will assign them to the current user


```python
current_user_id = ls.users.get_current_user().id
selected = AssignmentsBulkAssignRequestSelectedItemsIncluded(all_=False, included=tasks_to_reannotate)
resp = ls.projects.assignments.bulk_assign(
    id=project.id,
    type="AN",  # assign for additional annotation , also possible to assign for review using "RE"
    users=[current_user_id],
    selected_items=selected,
)
```

## 8) Get Task-Level Agreement and Establish Ground Truth
We can get agreement on a task-level which will help us establish ground truth based on annotator consensus


```python
tasks = ls.tasks.list(project=project.id)
```


```python
# Configure threshold to consider a task as high consensus and add an annotation as ground truth - for this example we will use 100%
gt_threshold = 1.0
for task in tasks:
    if task.agreement >= gt_threshold:
        annotations = ls.annotations.list(id=task.id)
        # Add new GT annotation so we can compare each annotator to GT individually
        ls.annotations.create(id=task.id, result=annotations[0].result, ground_truth=True)
```

## 9) Annotator-Ground Truth Agreement
However you choose to add ground truth to your project - comparing annotators against ground truth allows you to really get an understanding of annotator performance. <br>
Comparing an annotator versus other annotators can give you an idea of their performance, but comparing against ground truth is one of the most valuable metrics for an annotator. <br>
For example this can inform you on which annotators might need more training or education on how to properly label tasks in this project.


```python
# Ensure we have the latest stats calculated
response = ls.projects.stats.update_stats(id=project.id, stat_type="stats")
```


```python
response = ls.projects.stats.user_ground_truth_agreement(id=project.id, user_pk=annotator1.id)
print(f"Annotator-Ground Truth Agreement for {annotator1.email}: {response.agreement*100:.2f}%")
```


```python
response = ls.projects.stats.user_ground_truth_agreement(id=project.id, user_pk=annotator2.id)
print(f"Annotator-Ground Truth Agreement for {annotator2.email}: {response.agreement*100:.2f}%")
```


```python
response = ls.projects.stats.user_ground_truth_agreement(id=project.id, user_pk=annotator3.id)
print(f"Annotator-Ground Truth Agreement for {annotator3.email}: {response.agreement*100:.2f}%")
```

## 10) Model-Annotator Agreement
Comparing model predictions against annotators and/or ground truth is a useful way to see how well your model is performing. <br>

### Add Predictions
There are many ways to add predictions to a project in Label Studio, such as connecting a model, using prompts, or importing them manually. <br>
For this example we will import them directly into the project.
We will add one prediction per task


```python
# Get all tasks
tasks = ls.tasks.list(project=project.id)
```


```python
# Possible predictions
labels = ["Non-toxic", "Somewhat toxic", "Very toxic"]
```


```python
model_version1 = "model-v1"
model_version2 = "model-v2"
```


```python
# For each task, create a prediction from model-v1 , always outputting "Non-Toxic"
for task in tasks:
    ls.predictions.create(
        task=task.id,
        model_version=model_version1,
        result=to_annotation_result(labels[0])
    )

# For each task, create a prediction from model-v2 , always outputting "Somewhat toxic"
for task in tasks:
    ls.predictions.create(
        task=task.id,
        model_version=model_version2,
        result=to_annotation_result(labels[2])
    )
```

### Get Agreement Between Model and Ground Truth
Helps you easily understand how your model is performing against ground truth tasks <br>


```python
response = ls.projects.stats.model_version_ground_truth_agreement(id=project.id, model_version=model_version1)
print(f"Agreement between {model_version1} and ground truth: {response.agreement*100:.2f}%")
```


```python
response = ls.projects.stats.model_version_ground_truth_agreement(id=project.id, model_version=model_version2)
print(f"Agreement between {model_version2} and ground truth: {response.agreement*100:.2f}%")
```

### Get Agreement Between Model and All Annotators
Helps you get a sense of how well your model is agreeing with your annotators <br>


```python
response = ls.projects.stats.model_version_annotator_agreement(id=project.id, model_version=model_version1)
print(f"Agreement between {model_version1} and all annotators: {response.agreement*100:.2f}%")
```


```python
response = ls.projects.stats.model_version_annotator_agreement(id=project.id, model_version=model_version2)
print(f"Agreement between {model_version2} and all annotators: {response.agreement*100:.2f}%")
```

### Get Agreement Between One Model and All Other Models
Helps you understand agreement between models <br>
In this case we created predictions from 2 different models, with both of them outputting different labels per-task so agreement will be 0%


```python
response = ls.projects.stats.model_version_prediction_agreement(id=project.id, model_version=model_version1)
print(f"Agreement between {model_version1} and all other models: {response.average_prediction_agreement_per_model*100:.2f}%")
```

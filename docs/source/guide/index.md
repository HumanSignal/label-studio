---
title: Get started with Label Studio
type: guide
order: 100
---

## What is Label Studio?

Label Studio is an open source data labeling tool for labeling and exploring multiple types of data. You can perform many different types of labeling for many different data formats. 

You can also integrate Label Studio with machine learning models to supply predictions for labels (pre-labels), or perform continuous active learning. See [Set up machine learning with your labeling process](ml.html). 

## Get started labeling your data

Follow these steps to start labeling your data with Label Studio: 

1. [Install Label Studio](install.html).
2. [Import data as labeling tasks](tasks.html). 
3. [Set up the labeling project](setup.html). Define the type of labeling to perform on the dataset, and add the labels that you want annotators to apply. 
4. [Label and annotate the data](labeling.html). 
5. [Export the labeled data or the annotations](export.html).

By default, Label Studio supports 1 project and 1 labeling configuration for the dataset in that project. To label multiple different types of data with different types of labeling configurations in different projects, [start Label Studio in multi-session mode](install.html#Multisession-mode). 

## About Label Studio components and architecture
You can use any of the Label Studio components in your own tools, or customize them to suit your needs. Before customizing Label Studio extensively, you might want to review Label Studio Enterprise Edition to see if it already contains the relevant functionality you want to build. See [What you get from Label Studio]() for more. 

### Main modules

The component parts of Label Studio are available as modular extensible packages that you can integrate into your existing machine learning processes and tools. 

| Module | Technology | Description |
| --- | --- | --- | 
| [Label Studio Backend](https://github.com/heartexlabs/label-studio/) | Python and [Flask](https://github.com/pallets/flask) | Use to perform data labeling | 
| [Label Studio Frontend](https://github.com/heartexlabs/label-studio-frontend) | JavaScript web app using [React](https://reactjs.org/) and [MST](https://github.com/mobxjs/mobx-state-tree) | Perform data labeling in a user interface |
| [Data Manager](https://github.com/heartexlabs/dm2) | JavaScript web app using [React](https://reactjs.org/) | Manage data and tasks for labeling |
| [Machine Learning Backends](https://github.com/heartexlabs/label-studio/tree/master/label_studio/ml) | Python | Predict data labels at various parts of the labeling process |

<br>
<div style="margin:auto; text-align:center;"><img src="/images/ls-modules-scheme.png" style="opacity: 0.8"/></div>
<!--update to include data manager--> 

## Information collected by Label Studio

Label Studio collects anonymous usage statistics about the number of page visits and data types being used in labeling configurations that you set up. No sensitive information is included in the information we collect. The information we collect helps us improve the experience of labeling data in Label Studio and helps us plan future data types and labeling configurations to support.



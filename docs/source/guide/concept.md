---
title: Main concept & design
type: guide
order: 704
---

## Overview

Label Studio is a self-contained Web application for multi-typed data labeling and exploration. The _backend_ is written in pure Python powered by [Flask](https://github.com/pallets/flask). The _frontend_ part is a backend-agnostic [React](https://reactjs.org/) + [MST](https://github.com/mobxjs/mobx-state-tree) app, included as a precompiled script.

Here are the main concepts behind Label Studio's workflow:

<div style="margin:auto; text-align:center; width:100%"><img src="/images/label-studio-ov.jpg" style="opacity: 0.7"/></div>

- **Tasks** represent an individual dataset items. Label Studio is a multi-type labeling tool - you can [import](tasks.html) either text, image, audio URL, HTML text or any number and combination of these data resources.
- **Completions** are the labeling results in [JSON format](export.html#Completion-fields). They could be [exported](export.html) in various common formats, ready to use in machine learning pipelines.
- **Predictions** are the optional labeling results in [the same format](export.html#Completion-fields), but unlike completions they are used for generating pre-labeling during the annotation process, or validating the model predictions.
- [**Machine learning backend** connects](ml.html) popular machine learning frameworks to Label Studio for active learning & generating model predictions on-the-fly.
- **Labeling config** is a simple [XML tree with **tags**](setup.html#Labeling-config) used to configure UI elements, connect input data to output labeling scheme.
- **Project** encompasses tasks, config, predictions and completions all-in-one in an isolated directory
- **Frontend Labeling UI** is accessible from any browser, distributed as precompiled js/css scripts and could be [easily extendable with new labeling tags](frontend.html). You can also [embed Label Studio UI into your applications](frontend.html#Quickstart).


### Main modules

The main modules of LS are 
* [Label Studio Backend](https://github.com/heartexlabs/label-studio/) (LSB, main repository)
* [Label Studio Frontend](https://github.com/heartexlabs/label-studio-frontend) (LSF, editor)
* [Machine Learning Backends](https://github.com/heartexlabs/label-studio/tree/master/label_studio/ml) (MLB)

<br>
<div style="margin:auto; text-align:center;"><img src="/images/ls-modules-scheme.png" style="opacity: 0.8"/></div>

### Relations among tasks, completions and results 

Here you can see relations among labeling objects: tasks, completions, results, etc.

One user provides one completion, it’s atomic, and it consists of the result items. Result items can have relations between themselves with the specified direction of three types: left-right, right-left, or bidirectional. Normalizations are additional information in the custom string format about the current result item.
 
<br>
<center><img src="/images/labeling-scheme.png" style="width: 100%; opacity: 0.6"></center>
<br>
Completions and Predictions are very similar. But predictions must be generated automatically by ML models.   

**Usage statistics**

Label Studio collects anonymous usage statistics without any sensitive info about page request number and data types from the labeling config. It helps us to improve the labeling quality and gives a better understanding about the next development.
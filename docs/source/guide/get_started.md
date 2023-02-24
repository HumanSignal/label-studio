---
title: Label Studio
short: Overview
type: guide
tier: all
order: 99
order_enterprise: 99
section: "Get started"
meta_title: Overview of Label Studio
meta_description: Get started with Label Studio by creating projects to label and annotate data for machine learning and data science models.
---


## What is Label Studio?

Label Studio is an open source data labeling tool for labeling and exploring multiple types of data. It allows you to do the following:
- Perform different types of labeling with many data formats. 

<div class="enterprise-only">

- Use [Label Studio Enterprise as a cloud offering](https://heartex.com/product). 

</div>

- Integrate Label Studio with machine learning models to supply predictions for labels (pre-labels), or perform continuous active learning. See [Set up machine learning with your labeling process](ml.html). 

Label Studio is also available in Enterprise and Cloud editions with additional features. For more information, see the [Label Studio features](https://labelstud.io/guide/label_studio_compare.html) page.



<div class="opensource-only">

## Quick start

1. Install Label Studio:
```bash
pip install label-studio
```
2. Start Label Studio
```bash
label-studio start
```
3. Open the Label Studio UI at http://localhost:8080. 
4. Sign up with an email address and password that you create.
5. Click **Create** to create a project and start labeling data.
6. Name the project, and if you want, type a description and select a color.
7. Click **Data Import** and upload the data files that you want to use. If you want to use data from a local directory, cloud storage bucket, or database, skip this step for now.
8. Click **Labeling Setup** and choose a template and customize the label names for your use case. 
9. Click **Save** to save your project. 

You're ready to start [labeling and annotating your data](labeling.html)!

</div>

## Terminology

When you upload data to Label Studio, each item in the dataset becomes a labeling task. The following table describes some terms you might encounter as you use Label Studio.

<div class="opensource-only">

<br>
<center><i>Project List Screenshot</i></center>
<img class="make-intense-zoom" src="/images/terms/os/projects-min.png">
<br><br>
<center><i>Data Manager Screenshot</i></center>
<img class="make-intense-zoom" src="/images/terms/os/project--data-manager-min.png">
<br><br>
<center><i>Quick View Screenshot</i></center>
<img class="make-intense-zoom" src="/images/terms/os/project--data-manager--quick-view-min.png">

</div>


<div class="enterprise-only">

<br>
<center><i>Project List Screenshot</i></center>
<img class="make-intense-zoom" src="/images/terms/ent/workspace-min.png">
<br><br>
<center><i>Data Manager Screenshot</i></center>
<img class="make-intense-zoom" src="/images/terms/ent/project--data-manager-min.png">
<br><br>
<center><i>Quick View Screenshot</i></center>
<img class="make-intense-zoom" src="/images/terms/ent/project--data-manager--quick-view-min.png">

</div>


| Term | Description |
| --- | --- |
| Dataset | What you import into Label Studio, comprised of individual items, or labeling tasks. |
| Task | A distinct item from a dataset that is ready to be labeled, pre-annotated, or has already been annotated. For example: a sentence of text, an image, or a video clip. |
| Region | The portion of the task identified for labeling. For images, an example region is a bounding box. For text, an example region is a span of text. Often has a label assigned to it. | 
| Labels | What you add to each region while labeling a task in Label Studio. |
| Relation | A defined relationship between two labeled regions. |
| Result | A label applied to a specific region as stored in an annotation or prediction. See [Label Studio JSON format of annotated tasks](export.html#Label-Studio-JSON-format-of-annotated-tasks). |
| Annotations | The output of a labeling task. Previously called "completions". |
| Predictions, <br> Pre-annotations | Annotations in Label Studio format that machine learning models create for an unlabeled dataset. See [import pre-annotations](predictions.html) |
| Templates | Example labeling configurations that you can use to specify the type of labeling that you're performing with your dataset. See [all available templates](/templates) |
| Tags | Configuration options to customize the labeling interface. See [more about tags](/tags). |


<div class="opensource-only">

## Features

Label Studio is available as a <a href="https://labelstud.io">Community edition open source data labeling tool</a>. It is also available as a paid version with extended functionality and support. Smaller organizations might want to consider the SaaS option and larger teams with robust data labeling needs can get the Enterprise edition. To get started with Label Studio Enterprise edition, contact the [Heartex team](https://heartex.com/). 


<table>
  <tr>
    <th>Functionality</th>
    <th>Community</th>
    <th>Enterprise</th>
  </tr>
  <tr>
    <td colspan="4"><b>User Management</b></td>
  </tr>
  <tr>
    <td><a href="signup.html">User accounts to associate labeling activities to a specific user.</a></td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td><a href="https://docs.heartex.com/guide/manage_users.html#Set-up-role-based-access-control-RBAC-with-Label-Studio">Role-based access control for each user account.</a></td>
    <td style="text-align:center">❌</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td><a href="https://docs.heartex.com/guide/manage_users.html">Organizations and workspaces to manage users and projects.</a></td>
    <td style="text-align:center">❌</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td colspan="3"><b>Project Management</b></td>
  </tr>
  <tr>
    <td><a href="setup_project.html">Projects to manage data labeling activities.</a></td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td><a href="setup.html">Templates to get started with specific data labeling tasks faster.</a></td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td colspan="3"><b>Data Management</b></td>
  </tr>
  <tr>
    <td><a href="manage_data.html">Manage your data in a user interface.</a></td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td><a href="tasks.html">Import data from many sources.</a></td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td><a href="export.html">Export data into many formats.</a></td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td><a href="storage.html">Synchronize data from and to remote data storage.</a></td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td colspan="3"><b>Data Labeling Workflows</b></td>
  </tr>
  <tr>
    <td><a href="manage_data.html#Assign-annotators-to-tasks">Assign specific annotators to specific tasks.</a></td>
    <td style="text-align:center">❌</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td><a href="setup_project.html">Automatic queue management.</a></td>
    <td style="text-align:center">❌</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td>Label text, images, audio data, HTML, and time series data.</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td>Label mixed types of data.</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td>Annotator-specific view.</td>
    <td style="text-align:center">❌</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td colspan="3"><b>Annotator Performance</b></td>
  </tr>
  <tr>
    <td><a href="https://docs.heartex.com/guide/quality.html#Review-annotator-agreement-matrix">Control label quality by monitoring annotator agreement.</a></td>
    <td style="text-align:center">❌</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td><a href="https://docs.heartex.com/guide/quality.html#Review-annotator-activity-on-the-project-dashboard">Manage and review annotator performance.</a></td>
    <td style="text-align:center">❌</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td><a href="https://docs.heartex.com/guide/quality.html">Verify model and annotator accuracy against ground truth annotations.</a></td>
    <td style="text-align:center">❌</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td><a href="https://docs.heartex.com/guide/quality.html#Verify-model-and-annotator-performance">Verify annotation results.</a></td>
    <td style="text-align:center">❌</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td><a href="https://docs.heartex.com/guide/quality.html#Review-annotator-performance">Assign reviewers to review annotation results.</a></td>
    <td style="text-align:center">❌</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td colspan="3"><b>Machine Learning</b></td>
  </tr>
  <tr>
    <td><a href="ml_create.html">Connect machine learning models to Label Studio with an SDK.</a></td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td><a href="active_learning.html">Accelerate labeling with active learning.</a></td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td><a href="ml.html">Automatically label dataset items with ML models.</a></td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td colspan="3"><b>Analytics and Reporting</b></td>
  </tr>
  <tr>
    <td><a href="quality.html#Verify-model-and-annotator-performance">Reporting and analytics on labeling and annotation activity.</a></td>
    <td style="text-align:center">❌</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td>Activity log to use to audit annotator activity.</td>
    <td style="text-align:center">❌</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td colspan="3"><b>Advanced Functionality</b></td>
  </tr>
  <tr>
    <td><a href="api.html">API access to manage Label Studio.</a></td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td>On-premises deployment of Label Studio.</td>
    <td style="text-align:center">✔️</td>
    <td style="text-align:center">✔️</td>
  </tr>
  <tr>
    <td><a href="https://docs.heartex.com/guide/auth_setup.html">Support for single sign-on using LDAP or SAML. </a></td>
    <td style="text-align:center">❌</td>
    <td style="text-align:center">✔️</td>
  </tr>
</table>

</div>

## Labeling workflow 

Start and finish a labeling project with Label Studio by following these steps:

<div class="opensource-only">

1. [Install Label Studio](install.html).
2. [Start Label Studio](start.html).
3. [Create accounts for Label Studio](signup.html). Create an account to manage and set up labeling projects.
4. [Set up the labeling project](setup_project.html). Define the type of labeling to perform on the dataset and configure project settings.
5. [Set up the labeling interface](setup.html). Add the labels that you want annotators to apply and customize the labeling interface. 
6. [Import data as labeling tasks](tasks.html).
7. [Label and annotate the data](labeling.html). 
8. [Export the labeled data or the annotations](export.html).

</div>

<div class="enterprise-only">

1. [Create accounts for Label Studio](manage_users.html#Signup). Create an account to manage and set up labeling projects.
2. [Restrict access to the project](manage_users.html). Set up role-based access control. Only available in Label Studio Enterprise Edition.
3. [Set up the labeling project](setup_project.html). Define the type of labeling to perform on the dataset and configure project settings.
4. [Set up the labeling interface](setup.html). Add the labels that you want annotators to apply and customize the labeling interface. 
5. [Import data as labeling tasks](tasks.html).
6. [Label and annotate the data](labeling.html). 
7. [Review the annotated tasks](quality.html). Only available in Label Studio Enterprise Edition.
8. [Export the labeled data or the annotations](export.html).

</div>


## Architecture

You can use any of the Label Studio components in your own tools, or customize them to suit your needs. Before customizing Label Studio extensively, you might want to review Label Studio Enterprise Edition to see if it already contains the relevant functionality you want to build. See [Label Studio Features](https://labelstud.io/guide/label_studio_compare.html) for more.

The component parts of Label Studio are available as modular extensible packages that you can integrate into your existing machine learning processes and tools. 

| Module | Technology | Description |
| --- | --- | --- | 
| [Label Studio Backend](https://github.com/heartexlabs/label-studio/) | Python and [Django](https://www.djangoproject.com/) | Use to perform data labeling. | 
| [Label Studio Frontend](https://github.com/heartexlabs/label-studio-frontend) | JavaScript web app using [React](https://reactjs.org/) and [MST](https://github.com/mobxjs/mobx-state-tree) | Perform data labeling in a user interface. |
| [Data Manager](https://github.com/heartexlabs/dm2) | JavaScript web app using [React](https://reactjs.org/) | Manage data and tasks for labeling. |
| [Machine Learning Backends](https://github.com/heartexlabs/label-studio-ml-backend) | Python | Predict data labels at various parts of the labeling process. |

<br>
<div style="margin:auto; text-align:center;"><img src="/images/ls-modules-scheme.png" style="opacity: 0.8"/></div>
<!--update to include data manager--> 


## Information collected by Label Studio

Label Studio collects anonymous usage statistics about the number of page visits and data types being used in labeling configurations that you set up. No sensitive information is included in the information we collect. The information we collect helps us improve the experience of labeling data in Label Studio and helps us plan future data types and labeling configurations to support. 



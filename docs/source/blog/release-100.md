---
title: Announcing Label Studio v1.0
type: blog
image: /images/release-100/announcement.png
order: 97
meta_title: Label Studio Release Notes 1.0.0
meta_description: Label Studio Release 1.0.0 rewrites Label Studio to support multiple users, projects, and scalable data labeling and annotation for machine learning and data science projects. 
---

Hooray! The day is finally here. After almost a year and a half of development, 1000+ commits, 40 releases, and 50+ developers contributing minor and major parts, we’re happy to announce a big milestone – **Label Studio v1.0!**

<br/>
<img src="/images/release-100/title.gif"  class="gif-border" />

<center><h3 style="font-style: italic">We’ve rebuilt Label Studio from the ground up, thanks to a lot of feedback over the last year. Say hello to a multi-user, multi-project system. Plus it’s scalable!</h3></center>

## Why use Label Studio?

Label Studio is an open source data labeling tool. It’s the most robust and easiest to use solution for labeling a raw dataset or a previously labeled dataset that you want to improve. If you work on computer vision, NLP, conversational AI, audio/speech processing, and time-series projects, you can get up and running in minutes. Improving training data with Label Studio becomes a more transparent and easily-managed process.

<br/>
<img src="/images/release-100/icons.png"  class="gif-border" />
<center style="font-style: italic">Various data types you can label using Label Studio</center>

Label Studio also natively integrates with ML models. You can connect your models and keep updating them with new labeled data, as well as perform quality assurance on model predictions.

## What’s new with 1.0

For the last four months, the Label Studio team has been on a nonstop journey of rethinking interfaces, the annotation flow, and the robustness of the overall system. 

<br/>
<img src="/images/release-100/open-source-github-pull-request.png" />
<center style="font-style: italic">Here is how this effort looks in terms of development time</center>

As a result, we’ve re-engineered almost everything! Data labeling is heavily dependent on the simplicity and ease-of-use of the user interface, so we streamlined and updated the entire Label Studio UI. In addition to the UI improvements, we have also improved the speed and performance of working with large datasets. Now you can work efficiently with datasets containing millions of items. Let’s dive into the details!

### Data labeling by multiple users 

One of the biggest changes we’ve introduced in this version is the addition of user accounts. Now, multiple users can create accounts in the same Label Studio instance. User's can work off of the same datasets and each user's annotations are tied to their account.

<br/>
<img src="/images/release-100/users.png" />
<center style="font-style: italic">People page is showing the list of users</center>

### Multiple projects to handle all your datasets in one place

Label Studio Projects enable you to create and save labeling configurations for different datasets or projects. Label Studio Projects streamline managing and working on different datasets, can be shared with other users, and can be reused for similar projects in the future.

<br/>
<img src="/images/release-100/projects-list.png" />

We also restructured the project settings and made it easier to configure the labeling interface for each project. A few updates worth mentioning:

#### Model Assisted Labeling

ML models can help pre-label data and optimize the data labeling process. For example,  connect a segmentation model like Mask RCNN to give its prediction, then you can adjust the prediction to make it perfect. Another example is if you connect an ASR model to provide speech transcription for further labeling.

<br/>
<img src="/images/release-100/ml-assistance.png" />
<center style="font-style: italic">Adding machine learning model for assisted labeling</center>

#### Read data from cloud storage

If you store your data in the cloud, Label Studio can natively sync with it. Out of the box you can configure Label Studio to read data from AWS S3, GCP, or Microsoft Azure. You can sync from multiple cloud providers or buckets at the same time, and each project can connect to a different cloud storage location. 

<br/>
<img src="/images/release-100/cloud-storage-modal.png" />
<center style="font-style: italic">Configuration to read audio files stored in an S3 bucket</center>

#### Interface configuration wizard

You can start labeling quickly by using a template to configure the labeling interface for your project, or enjoy a greater level of flexibility with custom tags.

<br/>
<img src="/images/release-100/wizard.png" />
<center style="font-style: italic">Dozens of the most common data labeling scenarios have templates <GIF showing selecting different templates></center>

### Label large datasets with new scalable data labeling backend

We migrated to a more robust backend from our enterprise version based on Django. We also transitioned from a filesystem-based to SQL-based data storage for tasks and annotations. While a filesystem is probably the simplest approach for storage, it doesn’t scale well when you work on datasets with more than 10,000 items. With SQLite as a storage backend, we can now easily upload datasets of hundreds of thousands of items.

<br/>
<img src="/images/release-100/data-manager-filtering.gif"  class="gif-border" />
<center style="font-style: italic">Here is filtering performance on dataset with 250K items</center>

> For production deployments, we recommend using PostgreSQL instead of SQLite, especially if you expect to create a large number of users or projects in parallel, because SQLite doesn’t support parallel writes.

## What’s next

We hope you’re excited to try out this new version of Label Studio!

For the next month we will be focusing on fixing bugs and issues based on your feedback, so we’d like to ask you to join our Slack channel. The community is very active and no questions go unanswered and no feedback goes unnoticed.

<a href="https://join.slack.com/t/label-studio/shared_invite/zt-cr8b7ygm-6L45z7biEBw4HXa5A2b5pw" title="Data labeling community">Join Slack</a>

Next, we'll be releasing an update of our <a href="https://heartex.com/">Label Studio Enterprise</a> and then working on a new version of Label Studio. The focus for that version is more performance improvements and seamless integration into various ML pipelines. See you in Slack!

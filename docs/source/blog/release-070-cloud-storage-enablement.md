---
title: Label Studio Release Notes 0.7.0 - Cloud Storage Enablement
type: blog
order: 100
meta_title: Label Studio Release Notes 0.7.0 - Cloud Storage
meta_description: Label Studio Release 0.7.0 includes new connectors to integrate Label Studio with cloud storage, including Amazon AWS S3 and Google Cloud Storage.
---

Just a couple of weeks after our 0.6.0 release, we’re happy to announce a new big release. We’ve started the discussion about the cloud months ago, and as the first step in simplifying the integration, we’re happy to introduce cloud storage connectors, like AWS S3. 

We’re also very interested to learn more from you about your ML pipelines, if you’re interested in having a conversation, please ping us on [Slack](https://join.slack.com/t/label-studio/shared_invite/zt-cr8b7ygm-6L45z7biEBw4HXa5A2b5pw).

<br/>
<img src="/images/release-070/s3-mascot-04.png" />

## Connecting cloud storage

You can configure label studio to synchronize labeling tasks with your s3 or gcp bucket, potentially filtering by a specific prefix or a file extension. Label Studio will take that list and generate pre-signed URLs each time the task is shown to the annotator. 

<br/>
<img src="/images/release-070/configure-s3.gif" class="gif-border" />

There are several ways how label studio can load the file, either as a URL or as a blob therefore, you can store the list of tasks or the assets themselves and load that.

<br/>
<img src="/images/release-070/s3-config.png" class="gif-border" />

You can configure it to store the results back to s3/gcp, making Label Studio a part of your data processing pipeline. Read more about the configuration in the docs [here](/guide/storage.html).

## Frontend package updates 

Finally with a lot of [work](https://github.com/heartexlabs/label-studio-frontend/pull/75) from [Andrew](https://github.com/hlomzik) there is an implementation of frontend testing. This will make sure that we don’t break things when we introduce new features. Along with that another  Important part — improved building and publishing process, configured CI. Now the npm frontend package will be published along with the pip package.

## Labeling Paragraphs and Dialogs

Introducing a new object tag called “Paragraphs”. A paragraph is a piece of text with potentially additional metadata like the author and the timestamp. With this tag we’re also experimenting now with an idea of providing predefined layouts. For example to label the dialogue you can use the following config: `<Paragraphs name=“conversation” value=“$conv” layout=“dialogue” />`

<br/>
<img src="/images/release-070/dialogues.png" class="gif-border" />

This feature is available in the [enterprise version](https://heartex.ai/) only

## Different shapes on the same image

One limitation label studio had was the ability to use only one shape on the same image, for example, you were able to put either bounding boxes or polygons. Now this limitation is waived and you can define different label groups and connect those to the same image.

<br/>
<img src="/images/release-070/multiple-tools.gif" class="gif-border" />

## maxUsages

There are a couple of ways how you can make sure that the annotation is being performed in full. One of these concepts is a `required` flag, and we’ve created a new one called `maxUsages`. For some datasets you know how much objects of a particular type there is, therefore you can limit the usage of specific labels.

## Bugfixes and Enhancements
- Allow different types of shapes to be used in the same image. For example you can label the same image using both rectangles and ellipses. 
- Fixing double text deserialization https://github.com/heartexlabs/label-studio-frontend/pull/85
- Fix bug with groups of required choices https://github.com/heartexlabs/label-studio-frontend/pull/74
- Several fixes for NER labeling — empty captured text, double clicks, labels appearance

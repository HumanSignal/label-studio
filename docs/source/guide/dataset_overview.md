---
title: Data Discovery overview - Beta 🧪
short: Data Discovery overview
tier: enterprise
type: guide
order: 0
order_enterprise: 201
meta_title: Data Discovery overview and features
meta_description: An overview of Label Studio's Data Discovery functionality, including features and limitations. 
section: "Curate Datasets"
date: 2023-11-10 15:23:18
---

> Streamline your data preparation process using Data Discovery in Label Studio. 

<div class="admonition todo"><p class="admonition-title">Beta Release</p><p>This feature is currently in beta. To enable Data Discovery, contact your customer success manager or email <a href="mailto:cs@humansignal.com">cs@humansignal.com</a>.</p></div>

In machine learning, the quality and relevance of the data used for training directly affects model performance. However, sifting through extensive unstructured datasets to find relevant items can be cumbersome and time-consuming. 

Label Studio's Data Discovery simplifies this by allowing users to perform targeted, [AI-powered searches](dataset_search) within their data. This is incredibly beneficial for projects where specific data subsets are required for training specialized models.

For example, imagine a scenario in a retail context where a company wants to develop an AI model to recognize and categorize various products in their inventory. Using Label Studio's Data Discovery functionality, they can quickly gather images of specific product types from their extensive database, significantly reducing the time and effort needed for manual data labeling and sorting. This efficiency not only speeds up the model development process, but also enhances the model's accuracy by ensuring a well-curated training dataset.

This targeted approach to data gathering not only saves valuable time but also contributes to the development of more accurate and reliable machine learning models.

!!! info Tip
    You can use the label distribution charts on a project's [dashboard](dashboards) to identify areas within the project that are underrepresented. You can then use Data Discovery to identify the appropriate dataset records to add to your project for more uniform coverage.


#### Process overview

1. Create a dataset by connecting your cloud environment to Label Studio and importing your data. See [Create datasets](dataset_create). 
2. Use our AI-powered search to sort and filter the dataset. See [Search and filter datasets](dataset_search). 
3. Select the data you want to use and add it to a labeling project. See [Manage datasets](dataset_manage). 
4. Start labeling data! 

## Terminology

| Term | Description |
| --- | --- |
| **Dataset** | In general terms, a dataset is a collection of data. <br>When referred to here, it means a collection of data created using the Datasets page in Label Studio. |
| **Data discovery** | In general terms, data discovery is the process of gathering, refining, and classifying data. A data discovery tool helps teams find relevant data for labeling. This covers a full spectrum of tasks, from finding data to include in your initial ground truth dataset to finding very specific data points to remedy underperforming classes or address edge cases.  |
| **Natural language search** <br><br>**Semantic search**| These two terms are used interchangeably and, in simple terms, mean using text as the search query.|
| **Similarity search** | Similarity search is when you select one or more records and then sort the dataset by similarity to your selections. |
| **Record** | An item in a dataset. Each record can be added to a Label Studio project as a task. |


## Features, requirements, and constraints

<div class="noheader rowheader">

| Feature | Support |
| --- | --- |
| **Supported file types** | .txt <br><br>.png <br><br>.jpg/.jpeg |
| **Indexable/searchable data** | Image and text |
| **Supported storage for import** | Google Cloud storage <br><br>AWS S3 <br><br>Azure blob storage |
| **Number of storage sources per dataset** | One |
| **Maximum number of records per dataset** | 1 million |
| **Maximum number of records returned per search** | 16,384 |
| **Number of datasets per org** | 10 |
| **Supported search types** | Natural language search <br><br>Similarity search |
| **Supported filter types** | Similarity score |
| **Required permissions** | **Owners and Administrators** -- Can create datasets and have full administrative access to any existing datasets <br><br>**Managers** -- Must be invited to a dataset. Once invited, they can view the dataset and export records as project tasks. Managers cannot create new datasets or perform administrative tasks on existing ones. <br><br>**Reviewers and Annotators** -- No access to datasets and cannot be added as dataset members.  |
| **Enterprise vs. Open Source** | Label Studio Enterprise only |

</div>




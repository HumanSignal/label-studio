---
title: Prevent Data and Concept Drift with Data Labeling
type: blog
order: 93
image: 
meta_title: Data Drift vs Concept Drift&#58; How Data Labeling Can Prevent Both
meta_description: This blog describes the differences between data drift and concept drift as part of model drift, and how you can prevent both kinds of drift with and without data labeling for your machine learning and data science projects. 
---

*Authored by Harshil Patel* 

Working with data can be a complex process, as it requires significant time and effort to collect, label, and organize. One potentially damaging issue is model drift—the tendency for a complex system to change over time, sometimes in unpredictable ways. If you don’t watch for these changes, your model may fail.

Data labeling offers a solution. It can help you address data drift and concept drift, the two main factors in model drift, so you can avoid errors in your work.  

This article will explore data drift and concept drift, and how to use data labeling to prevent both issues. 

## Model Drift

Model drift is an important concept in machine learning and artificial intelligence. It refers to changes in the training data set that can cause a model’s generalization to alter. These types of interactions are often hard for humans to predict, which is why they’re such an important issue for AI research. 

There are two main types of model drift: data drift and concept drift. 

![Image courtesy Harshil Patel](https://i.imgur.com/sZCvVRz.png)

### Data Drift

When the accuracy of a model decreases over time as new data is collected, this phenomenon is known as data drift. This can happen because the data sets diverge in meaning, typically because of ambiguous language in the initial definition; it also happens when two different data sets are used for a single purpose without being compared against one another. 

Generally, data drift occurs in academic fields with large amounts of data collection. It’s also known as feature drift or covariate shift.

For example, you’ve created an application where users can receive personalized offers from a retail website. That website also runs ads on various social channels and different platforms, but the model was not segmented properly while training. Many users arrive from social platforms after a fresh ad campaign, and it’s hard to tell if the traffic is organic or paid. To fix the degradation due to this drift, you’ll have to either retrain the model on new data or rebuild it for the new segment. 

### Concept Drift

While data drift describes the change in the properties of the independent variables, concept drift describes the target variable. It refers to a change in the meaning or focus of a concept over time. This term is most commonly used in the medical sciences, especially because new diseases and conditions are classified as they arise. An example of concept drift is when the DSM-5 combined several diagnoses into ADHD.

As a result of concept drift, the model based on historical data is no longer valid, and the model’s assumptions must be changed using current data. 

Consider this scenario. Let's say you developed a model to detect one type of spam or fraud. Over time, spammers will create new methods to attempt fraud. As their methods evolve, the concept of fraud detection changes. The model will no longer function properly, and you will need to retrain it with the new type of fraud detection.

For more on concept drift, see [here](https://www.aporia.com/concept_drift_in_machine_learning_101).

Changes in concept drift can be:

* **Sudden:** This happens when there are immediate changes to the concept, such as the worldwide lockdowns during the COVID-19 pandemic that abruptly changed population behavior. 

* **Gradual:** This kind of drift occurs over a longer period of time, and it’s normal in many situations. Inflation is one example. Gradual or incremental changes are usually addressed in time series models by capturing the change in seasonality.

* **Recurring:** This kind of drift reoccurs after a period of time—for instance, the shift in customers’ buying habits as the seasons change. 

![Types of drift, image courtesy Harshil Patel](https://i.imgur.com/KsWNWLb.png)

## Causes of Drift

There are many reasons that drift might occur in production models: 

* The data distribution changes because of external activities, which may require a new model with an updated training set. For example, a model that works perfectly well in the United States may not work in another country. To address this issue, you must retrain your model using new and updated data from a specific country. 

* There is a shift in input data, such as changing customer preferences due to COVID-19 or launching a product in a new market. 

* There are problems with data integrity, which often requires human intervention. Human mistakes, whether purposeful or inadvertent, can affect data integrity. Unintentional modifications or data compromise can cause drift. 

* There are problems with the website used for collecting data, leading to the collection of incorrect data. There could be a website glitch or data inconsistency. This could have an impact on your models.

* Even if the data is correct, it may be erroneously updated due to improper data engineering. Issues including unnecessary infrastructure, difficulty debugging, or a lack of backups can cause drift. 

For more on dealing with drift, read [here](https://www.ijcai.org/Proceedings/11/Papers/266.pdf).

## How to Detect Drift

Because both types of drift involve a statistical change in the data, keeping an eye on the data’s statistical qualities, the model’s predictions, and their interactions with other parameters is the quickest approach to spot drift. Dealing with drift can be time-consuming without the right tools, monitoring prediction, and features.

There are many methods you can use to detect drift. You can also use open-source and paid platforms to monitor your models. Here some of the most common ways to detect drift:

* Adaptive Windowing (ADWIN)

It detects change and maintains current statistics on a data stream. Using it teaches algorithms that aren’t built for drifting data how to withstand it. To learn more about ADWIN, read [here](https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.144.2279&rep=rep1&type=pdf).

* Drift Detection Method (DDM)

This is a concept change detection method based on the PAC learning model premise that, as the number of examined samples grows, the learner’s error rate decreases as long as the data distribution remains steady. To learn more about DDM, read [here](https://www.analyticsinsight.net/data-drift-and-machine-learning-model-sustainability/).

* Early Drift Detection Method (EDDM)

Instead of evaluating the number of errors, this method analyzes the average distance between two errors: the running average distance and standard deviation, as well as the maximum distance and standard deviation. To learn more about EDDM, read [here](https://www.cs.upc.edu/~abifet/EDDM.pdf).

## How to Prevent Drift

Data scientists and developers must take action when they detect a potential drift in order to avoid problems that could arise from unintentional changes. 

Some possible solutions are proper training for personnel and maintenance of equipment. Data can also be assessed for quality by looking at variation throughout a population and examining any outliers that might bring unusual readings in certain individuals or groups. 

Here are some methods for preventing data and concept drift:

* **Retrain the model on a regular basis:** Retraining can be triggered at various times, such as when the model’s performance falls below a certain level or when the average confidence score between two windows of data shows significant drift.

* **Train your model online:** This means that your model weights are automatically updated with new data on a regular basis. The frequency of updates could be daily, monthly, or whenever new data is received. If you expect incremental concept drift or an unstable model, this solution is ideal.

* **Drop features:** Multiple models are built one at a time, and if you discover that some features aren’t working, you can remove them and conduct A/B testing.

* **Develop data pipelines:** This lets you detect issues before they affect downstream analysis, prevent sensitive data from being shared, and even discover new ways to use data. You gain detailed insights into each small change, which will help you improve the performance of your model.

* **Label encoding:** With this technique, you convert categorical values into numerical values so they are machine-readable. You can use this for categorical variables and also work with missing values, outliers, and other difficulties to prevent drift. 

## Data Labeling 

![Labeling, image courtesy Harshil Patel](https://i.imgur.com/DHsdCyv.png)

Data drift is more widespread than you may think. Because your model is exposed to changes on a daily basis in the real world, a model trained a month ago may not perform as expected. Therefore it’s critical to build a scalable, automated training data pipeline to keep your model current. Data labeling—annotating and labeling data throughout the lifetime of the model—can solve this problem by creating updated training data sets that can be used to retrain your model.

In data labeling, the labels are associated with specific values applied to the data, which is organized into groups by these labels to be used for analysis or visualization. 

Data or concept drift can happen when there is a change in data collected over time or when you change the conceptualization of a system. The temporal dimension makes it trickier to tell data from idea drifts because the two often occur together. For example, say you built a model to detect safe driving behavior, beginning with whether the driver is wearing a seat belt. As drivers increasingly use mobile phones, the concept of “safe driving” drifts to include driving without looking at your phone. You decide to collect and label data on that activity as well so that your model recognizes both behaviors.

Here are a few of the benefits of data labeling:

### Improves Accuracy

By training the system with large data sets, image annotations improve output accuracy. The algorithm learns a variety of factors that will aid the model in finding relevant information in the database. With improvement in precision, the model will perform well in production and chances of drift will reduce.

### Smart Labeling

The best way to deal with drift is by making a sequence of windows out of the data stream. Based on the business or application context, assign a class label to individual data items. To detect concept drift, data points from nearby windows are evaluated and metrics like accuracy, precision, execution time, and classification are analyzed. 

For more, read [here](https://towardsdatascience.com/learn-faster-with-smarter-data-labeling-15d0272614c4).

### Improves Data Quality

Data labeling is a type of metadata that can be used to improve the quality and usefulness of data sets. The labels provide detailed information about the content and structure of a data set, such as what data types, measurement units, and time periods are represented. 

The labels help you find patterns in large databases by providing specific details about particular aspects of the data set, which improve data quality by training the model accordingly.

These labels should be as accurate as possible. For a self-driving automobile, for example, all pedestrians, stop signs, speed limit signs, signals, and other vehicles must be correctly tagged inside the image for the model to perform properly.

### Enhances User Experience

Applications like chatbots and AI assistants are a good example. Labeling allows these chatbots to respond to a user’s query with the most relevant information, improving the interaction between user and AI. This also improves dependability during large-scale deployments, since it’s easier to find flaws in large amounts of data.

### Flexibility

Data labeling allows for more granular control over data. The labels enable the system to identify the data elements, and allowing users to define the fields in a data set gives them more flexibility over how they use the data.

## Conclusion 

All data models deteriorate over time. Low data quality, malfunctioning pipelines, and technical issues can cause performance drops, but you can take action to detect and prevent these issues. Data labeling provides multiple benefits for your data model, among them the enhanced capacity for teams to collaborate. 

![Label Studio, courtesy Heartex](https://i.imgur.com/vn2nwn7.png)

One tool that can help you maximize your data labeling practice is [Label Studio](https://labelstud.io/). It can handle images, audio, text, time series, and multi-domain data types. Label Studio provides open-source, enterprise, and cloud products for better collaboration among teams, and it can be integrated with machine learning models to perform pre-labeling, auto-labeling, online learning, and active learning. For a guide to Label Studio, see [here](https://labelstud.io/guide/).
---
title: Understanding Sentiment Analysis
type: blog
image: /images/sentiment/understanding-sentiment-analysis-thumbnail.png
order: 101
meta_title: Understanding Sentiment Analysis
meta_description: This blog covers the basics of sentiment analysis&#58; key components, use cases, challenges, and solutions.
---

Emotions are tricky, even for supercomputers. Sentiment analysis helps computers make sense of conversations so businesses can delight their customers or tackle complex problems at scale. 

Ever wonder how airlines monitor the millions of conversations that agents, AI chat bots, and customer support representatives are having with customers and determine how their customers feel? That takes API-powered sentiment analysis.

Let’s say your favorite coffee company sends out a survey asking how you like their beans and if you’d change anything about their roasting style, they might use sentiment analysis to get a sense of their customer’s opinions as a whole.

Sentiment analysis makes invisible trends visible, and highly complex, manual tasks more manageable.

## What is sentiment analysis?

Sentiment analysis is the process of an application, or computer, taking text-based information, like a conversation, and turning that into quantitative data that humans like us can learn from. 

At scale, AI-powered sentiment analysis programs can read, classify, and report on conversations much faster than we can. 

In order for a program to collect the information it needs to run sentiment analysis, it follows a general three step process: 

**Mining:** In this stage, a program collects all the text it needs from an interaction. 

**Identification:** Here, a program might move from simply holding text-based information, to determining what the meaning of that information is. So, if a program is processing a customer support ticket’s text, the program would parse out what the customer’s name is, what their order number is, and tokenize that information. 

For example, a program might read a customer’s text saying “I’d like to change my delivery address on Order #9401 from 7218 Waverly Drive to 4501 Richardson Drive.” A well-trained program will be able to read that text and identify the customer’s order number, the address the customer originally provided, and the address the customer would like to use as the updated delivery address. 

From there, the program might pass that information into an application labeling Order #9401 as a variable the developer might have called “Order_Number” so the application can perform a lookup and correct the delivery address. 

**Extraction:** This is the act of taking the components that have been identified and selecting them for transport to some sort of place they’ll be stored or acted upon. The program might ferry customer information to a database, or use it as a trigger to kick off some process. 

After text is processed, classified, and sorted, a business or brand can determine what they’d like to do with that information.

### Machine learning vs. NLP vs Sentiment Analysis
Machine learning, Natural Language Processing, and Sentiment Analysis are all parts of a whole, but at the same time distinct from one another. Let’s dive into how they relate and where a company might use each process.

### Machine Learning
Let’s say a business wants to build a chatbot that can respond to customers’ common requests without the need for assistance from a customer support agent. In that case, they would need to build and train a machine learning model to make sense of a conversation. 

Instead of seeing a reply from a customer as a collection of text without meaning, the machine learning model should be able to extract intent, meaning, and action from the conversation so they can serve the customer’s needs. 

To do that, the machine learning model needs to practice using a wealth of existing conversations. Consider this a bit like an aspiring Major League batter going to the batting cages to work on their swing. Instead of hoping everything will go well once they’re up at bat, the Machine Learning model takes time to practice outside of a production environment to dial in its skills.

### Sentiment Analysis
Now, let’s imagine the same company has that chatbot out of the batting cages and up and running. It can respond to customers. But, the company would like to know how those conversations are going. In this case, the company would need to run sentiment analysis on the conversation.  

Sentiment Analysis is the process of mining, identifying, and extracting language from a conversation and then determining what the mood or tenor of that conversation is. So, that chat bot could read words like “late”, “broken”, “terrible” and understand the customer is not happy. Or, it could see words like “great”, “fast”, and “friendly” as positive indicators.

### Natural Language Processing
If you think of the previous processes we described as parts of a larger system of understanding and taking action on text, NLP is the entire connected system. Sentiment analysis itself is a type of natural language processing which is an application of machine learning. Essentially, we’re teaching a computer program (making a machine learn) to understand text (process language naturally) and tell us what’s happening (analyzing sentiment).

NLP involves teaching an artificial intelligence network to understand conversations just like a human would. This could involve fielding written text, or processing spoken words. In both cases, the AI application can process and follow along with conversations seamlessly.  

## Types of sentiment analysis

There are many different approaches to running sentiment analysis. 

You can use graded systems which assign scores to words, with 0 commonly indicating a word with a negative sentiment and 10 indicating a word with a positive sentiment. 

So, if a customer says “That was the worst coffee I’ve ever had in my life,” the program you’re running might see “worst” and score that word as a 0 because it’s indicative of a very strong negative emotion. If a customer says “That was a pretty good coffee,” your application might see “good” as a positive, but not tremendously positive word and score it a 6. 

Another approach, emotion detection, involves a similar structure of assigning a value system to words. But, instead of a numerical score, a company would assign emotions to particular words. Let’s return to our coffee reviews example. When the program reads the review, “That was a pretty good coffee,” instead of just seeing the word “good” and issuing a score, it might read the whole sentence and determine that the user is moderately satisfied and say it has a sentiment of “neutral” or “moderately positive.” 

While the first two types of sentiment analysis we discussed deal with scoring words, aspect-based sentiment analysis deals with scoring those words while also identifying the context surrounding those words. 

So, instead of simply reporting that a user had a positive conversation with a support agent, aspect-based sentiment analysis could tell a business what that customer was excited about - a new feature, product, or service. This type of insight helps businesses keep track of how they’re serving their customers on a granular level.

### Use Cases
Companies use sentiment analysis to do anything from monitoring marketing efforts to maintaining their foothold in their industry. Here are a few common examples:
- **Monitoring social media sentiment** - So, Netflix just upped their prices and they want to see how customers are taking the news. Using a social media monitoring tool and sentiment analysis, they’d track tens of thousands of social media posts to determine the overall sentiment of their customers. 
- **Tracking product release feedback** - Imagine a developer-first company just updated its API. They want to know if developers are pleased with the new application architecture or a bit turned off by it. They’d use product review surveys along with sentiment analysis to track that.  
- **Analyzing competitors presence online** - If one airline starts adding new loyalty rewards and perks that their customers love, their competitor might want to dive into that to decide if they should offer a similar program. They can crawl review sites, aggregate reviews, and run sentiment analysis on those sites to see what customers are really raving about. 
- **Discovering brand advocates and detractors** - It’s not exactly great to have someone screaming negative reviews online from a digital megaphone. But, it is quite a benefit to have someone who promotes and backs your business. To figure out who is who and which high visibility accounts online are detracting from or adding to your brand, you could use a sentiment analysis program. 

Let’s imagine you have a company that rents out A/V equipment for all sorts of events from weddings, to parties, and more. 

You’d like to get candid feedback from customers, but you’re short on time and want to keep your customers’ responses private. Using a form to capture users’ feedback, you could also employ a program to parse through that feedback and report back on how your users feel about your business. That sentiment analysis program could give you the high level data you’re after while you’re on the go, all without you having to pore over each bit of feedback yourself. And, if you’re really short on time, [Label Studio has a template to help you get started](https://labelstud.io/templates/sentiment_analysis.html). 

Now, imagine down the road, your business gets so successful that you’re having trouble responding to the questions you’re getting from customers both day and night. You might want to employ a chatbot that doesn’t require sleep to respond to customers around the clock. 

To get this chatbot up and running, you’d want to leverage machine learning and train the program how to read and respond to customers. Using the customer survey text and customer conversation records you already have on file, you could train the chatbot to be customer-conversation ready. When it’s ready to field customer conversations, it’ll be using NLP to understand their requests, and sentiment analysis to think of the right reply. 

For example, if a customer says “I loved that pair of speakers your A/V company provided,” your program should be able to identify that statement as a positive one. Instead of replying “I’m sorry,” a reply that assumes the statement was negative, or “congrats!” which is a reply out of left field, your program should be trained enough to reply with an appropriate response. 

## The fundamentals of sentiment analysis
Let’s think about the whole chain of events that has to happen for a program or application to analyze and take action on a conversation. 

First, an API-based program has to read, or download the information it will be acting upon. So, this could mean uploading records of a customer conversation to the API’s database, or assigning the API to read conversations in real time. 

Once the application has all the raw information it will be processing, it needs to figure out how to make sense of that information. So, the program might use text categorization, or tags, to put the series of words it’s analyzing into groups. To do this, the program will rely on Natural Language Processing. Remember the program that was training hard at the proverbial batting cages? It’s now coming into play. Meaning, the program is employing a trained NLP model to put “bad” into the negative category and “good” into the positive category by appropriately tagging both words. 

Once the information is sorted, you can store it, respond to it, or take a custom action based on logic you’ve built out. 

Sentiment analysis gives companies the ability to monitor essential areas of their business like customer support, or competitive analysis, 24/7. Instead of having to hire and staff a support team, they can operate more efficiently by using programs to do the monitoring for them around the clock. 

The information the company collects is likely more accurate and actionable than any individual employee's general impression of customer sentiment. The average employee, even the average executive, only has so many hours in the day to pore through customer support tickets, product reviews, and feedback. But, sentiment analysis programs  can parse information with unbelievable speed and highlight key insights in the data they uncover. 

## Getting started with sentiment analysis
A successful sentiment analysis program follows key stages or data processing.
- Data collection
- Pre-processing
- Vectorization
- Visualization 

But the very first step is data collection.

Simply finding a wealth of data isn’t enough to successfully train a program. You wouldn’t teach a hotel concierge how to interact with customers using a handbook meant for restaurant servers. The same principle applies for sentiment analysis programs. While sets of data may seem related to the field in which you’re trying to train a program, the minor details can make a big difference. 

Label Studio is a data labeling platform that can be used for annotating large datasets consisting of all data types, including text (natural language processing, documents, chatbots, transcripts, and more). Use cases include document classification, named entity recognition, question answering and sentiment analysis. 

Interested in learning more about how to get started with sentiment analysis? Check out [our article on building a sentiment analysis program](https://labelstud.io/blog/sentiment-analysis-get-started.html).
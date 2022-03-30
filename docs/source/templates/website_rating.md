---
title: Website Rating
type: templates
category: Ranking and Scoring
cat: ranking-and-scoring
order: 505
meta_title: Website Rating Data Labeling Template
meta_description: Template for rating website content with Label Studio for your machine learning and data science projects.
---

For cases when you want to rate the quality of websites, or rate the trustworthiness and classify the content of a website, you can use this template.

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <HyperText name="website" value="$website" inline="true"/>

  <Header value="Rate this website"/>
  <Rating name="rating" toName="website" maxRating="10" icon="star" size="medium" />

  <Choices name="choices" choice="single-radio" toName="website" showInline="true">
    <Choice value="Important article"/>
    <Choice value="Yellow press"/>
  </Choices>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

The [HyperText](/tags/hypertext.html) object tag specifies the location of the website to be labeled, and specifies to display it inline on the labeling interface:
```xml
<HyperText name="website" value="$website" inline="true"/>
```

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header value="Rate this website"/>
```

The [Rating](/tags/rating.html) control tag provides a star rating out of 10 stars to annotators to use to rate the website content:
```xml
<Rating name="rating" toName="website" maxRating="10" icon="star" size="medium" />
```

The [Choices](/tags/choices.html) control tag lets annotators classify the website content as well:
```xml
  <Choices name="choices" choice="single-radio" toName="website" showInline="true">
    <Choice value="Important article"/>
    <Choice value="Yellow press"/>
  </Choices>
```

## Input data

There are two ways to structure input data to use this template:
- Use HTML files
- Use links to websites in JSON-formatted files

### Use HTML files
**This method is recommended.** Save the website content that you want to rate as HTML files, and import the HTML files into Label Studio. 

If you use this method, change the `inline` parameter for the HyperText tag to `false`. 

### Use links to websites
This method seems simpler, but due to CORS (cross-origin resource sharing) restrictions on websites appearing in HTML iframes, it only works for websites hosted on the same domain as your Label Studio instance. For example, if you want to rate websites hosted on your organization's domain, and Label Studio is hosted on the same domain, you can probably use this option. In most cases, CORS restrictions prevent the website from being visible.  

If this option will work for you, you can use the following example JSON:
One task can be formatted like the following:
```json
{
    "website": "<iframe src='https://heartex.com' width='100%' height='600px'/>"
}
```

Or multiple tasks like the following:
```json
[
   {
      "data":{
         "website": "<iframe src='https://heartex.com' width='100%' height='600px'/>"
      }
   },
   {
      "data":{
         "website": "<iframe src='https://example.com' width='100%' height='600px'/>"
      }
   },
   {
      "data":{
         "website": "<iframe src='https://labelstud.io' width='100%' height='600px'/>"
      }
   }
]


```

## Related tags
- [HyperText](/tags/hypertext.html)
- [Rating](/tags/rating.html)
- [Choices](/tags/choices.html)

## Related templates
- [HTML Classification](html_classification.html)
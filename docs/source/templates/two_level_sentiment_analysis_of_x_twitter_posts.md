---
title: Two-Level Sentiment Analysis of X / Twitter posts
type: templates
category: Community Contributions
cat: community
order: 1004
meta_title: Two-Level Sentiment Analysis of X / Twitter posts Data Labeling Template
meta_description: Template for two-level sentiment analysis of x / twitter posts with Label Studio
community: true
community_author: luarmr
community_contributors: bmartel, redeipirati
community_repo: awesome-label-studio-config
github_repo: humanSignal/awesome-label-studio-config
repo_url: https://github.com/HumanSignal/awesome-label-studio-config/tree/main/label-configs/two-level-sentiment-analysis-of-x-twitter-posts
---


<img src="/images/templates/two-level-sentiment-analysis-of-x-twitter-posts.jpg" alt="" class="gif-border" width="552px" height="408px" />

This labeling config lets you assign a sentiment (Positive, Negative, or Neutral) to X / Twitter post. After picking a sentiment, a second-level classification appears to categorize the text as Descriptive, Emotional, Mixed, Ambigous, or Sarcams. The labeling interface is styled to look like a X / Twitter post.

## Labeling Configuration

```html
<View>
  <!-- CSS fix for the legacy plaground -->
  <Style>
    .htx-text{padding:0; background: transparent; border:none;}
  </Style>
  <View 
    style="
      border: 1px solid #e1e8ed;
      border-radius: 8px;
      padding: 10px;
      max-width: 500px;
      background-color: #fff;
      font-family: Arial, sans-serif;
    "
  >
    <View 
      style="
        display: flex;
        align-items: center;
        gap: 10px;
      "
    >
      <View 
        style="
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: #ccc;
          background-image: url('https://randomuser.me/api/portraits/men/3.jpg');
          background-size: cover;
        "
      ></View>
      <Header name="username" value="John Doe" />
      <Text name="handle" value="@johndoe" style="color:gray;" />
      <Text name="timestamp" value="· 2 hrs ago" style="color:gray;" />
    </View>
    <View style="margin-top: 8px;">
      <Text name="tweet" value="$tweet" />
    </View>
    <View 
      style="
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #657786;
        margin-top: 20px;
      "
    >
      <Text name="comments" value="💬 10" />
      <Text name="retweets" value="🔁 3" />
      <Text name="likes" value="❤️ 7" />
      <Text name="views" value="📊 134" />
      <Text name="other" value="🔖 ⬆" />
    </View>
  </View>

  <Choices name="sentiment" toName="tweet" choice="single">
    <Choice value="Positive" hint="Click on it if it says something nice or good" />
    <Choice value="Neutral" hint="Click on it if overall it doesn't express any sentiment" />
    <Choice value="Negative" hint="Click on if it says something bad or unpleasant" />
  </Choices>
  
  <Choices name="other-props" toName="tweet"
           choice="multiple" showInLine="true"
           visibleWhen="choice-selected"
           whenTagName="sentiment">
    <View style="width:100%">
      <Header value="Other properties of the post" />
    </View>
    <Choice value="Descriptive" />
    <Choice value="Emotional" hint="Click on it if it shows moderate to strong sentiment" />
    <Choice value="Mixed" hint="Click on it if multiple conflicting sentiments are present"/>
    <Choice value="Ambigous" hint="Click on it if it is irrelevant or unclear"/>
    <Choice value="Sarcams" hint="Click on it if it shows ironic or sarcastic content"/>
  </Choices>
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

This configuration uses the following tags:

- [Text](/tags/text.html)
- [Choices](/tags/choices.html)
- [Choice](/tags/choice.html)
- [View](/tags/view.html)
- [Header](/tags/header.html)

## Usage Instructions

- **Conditional Choices**: The second set of choices (other-props) only appears after selecting a sentiment.

This is done with:

```xml
visibleWhen="choice-selected"
whenTagName="sentiment"
```

---


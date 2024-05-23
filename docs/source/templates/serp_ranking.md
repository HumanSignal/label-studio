---
title: Search Page Ranking
type: templates
category: Ranking and Scoring
cat: ranking-and-scoring
order: 555
meta_title: Rank different kinds of results by given search query
meta_description: 
---

Based on your search input query, you can select the most relevant search results provided by search engine.
<br/>

<img src="/images/templates/serp-ranking.png" alt="Search Page Ranking example" class="gif-border" width="552px" height="408px" />

## Labeling Configuration

There are a lot of styles to make it look like search engine page. Search query is loaded as `$text` for `Text` objects. Specially formatted search results in html format are loaded as dynamic `Choices` via `value="$options"` parameter. Task data should contain field `options` with a list of objects, each one contains parameters for generated `Choice`.

Options also can be nested via `children` parameter to visually group results from the same domain. This also requires `allownested="true"` in `Choices` tag. Important thing here is that result will be different — instead of usual array of selected choices values you'll get array of arrays, every item is a list of values from topmost parent choice down to selected one. For example in provided example you'll se in result:
`"choices": [ [ "result1", "result11" ] ]`

`html` content in task data should have escaped quotes (`\"`). `html` content in config should be html-escaped, see example in `Choices name="confidence"`.

Example data for this config you can see below.

```xml
<View>
  
  <Header value="Search request" size="5"/> 
  <Text name="text" value="$text"/>
 
  <Header value="Generated responses" size="5"/> 
  <View className="dynamic_choices">
    <Choices name="dynamic_choices" toName="text" selection="checkbox" value="$options" layout="vertical" choice="multiple" allownested="true"/>
  </View>
  <View style="box-shadow: 2px 2px 5px #999; padding: 20px; margin-top: 1em; border-radius: 5px;">
    <Header value="Search Quality"/>
    <Rating name="relevance" toName="text"/>
  </View>
  <View style="box-shadow: 2px 2px 5px #999; padding: 15px 5px 10px 20px; margin-top: 1.5em; margin-bottom: 1.25em; border-radius: 5px; display: flex; align-items: center;">
    <Header value="Labeling Confidence" style="font-size: 1.25em"/>
    <View style="margin: 0 1em 0.5em 1.5em">
      <Choices name="confidence" toName="text" choice="single" showInLine="true">
        <Choice value="Low" html="&lt;img width='40' src='https://www.iconsdb.com/icons/preview/green/thumbs-up-xxl.png'/&gt;"/>
        <Choice value="High" html="&lt;img width='40' src='https://www.iconsdb.com/icons/preview/red/thumbs-down-xxl.png'/&gt;"/>
      </Choices>
    </View>
  </View>
  
  <Style>
  .searchresultsarea {
    margin-left: 10px;
    font-family: 'Arial';
  }
  .searchresult {
    margin-left: 8px;
  }
  .searchresult h2 {
    font-size: 19px;
    line-height: 18px;
    font-weight: normal;
    color: rgb(29, 1, 189);
    margin-bottom: 0px;
    margin-top: 25px;
  }
  .searchresult a {
    font-size: 14px;
    line-height: 14px;
    color: green;
    margin-bottom: 0px;
  }
  .searchresult button {
    font-size: 10px;
    line-height: 14px;
    color: green;
    margin-bottom: 0px;
    padding: 0px;
    border-width: 0px;
    background-color: white;
  }
  </Style>
</View>
```

## Example data

```json
{
  "data": {
    "text": "Which is the biggest black hole in the universe?",
    "options": [
      {
        "html": "<div class=\"searchresultsarea\"><div class=\"searchresult\"><h2>List of most massive black holes - Wikipedia</h2><a href='https://en.wikipedia.org/wiki/List_of_most_massive_black_holes' target='_blank'>https://en.wikipedia.org/wiki/List_of_most_massive_black_holes</a> <p>List ; Messier 59, 2.7×10 · This black hole has a retrograde rotation. ; PG 1411+442, (4.43±1.46)×10 · 79430000 ; Markarian 876, (2.79±1.29)×10 · 240000000 ; Andromeda ...</p></div>",
        "value": "result1",
        "children": [
          {
            "html": "<div class=\"searchresultsarea\"><div class=\"searchresult\"><h2>Supermassive black hole - Wikipedia</h2><a href='https://en.wikipedia.org/wiki/Supermassive_black_hole' target='_blank'>https://en.wikipedia.org/wiki/Supermassive_black_hole</a> <p>The largest supermassive black hole in the Milky Way's vicinity appears to be that of Messier 87 (i.e. M87*), at a mass of (6.4±0.5)×109 (c. 6.4 billion) M ☉ at a distance of 53.5 million light-years.</p></div>",
            "value": "result11",
            "selected": true
          },
          {
            "html": "<div class=\"searchresultsarea\"><div class=\"searchresult\"><h2>Buraco negro supermassivo</h2><a href='https://pt.wikipedia.org/wiki/Buraco_negro_supermassivo' target='_blank'>https://pt.wikipedia.org/wiki/Buraco_negro_supermassivo</a> <p>Um buraco negro supermassivo é uma classe de buracos negros encontrados principalmente no centro das galáxias. Ao contrário dos buracos negros estelares, que são originados a partir da evolução de estrelas de massa elevada, os buracos negros supermassivos foram formados por imensas nuvens de gás ou por aglomerados de milhões de estrelas que colapsaram sobre a sua própria gravidade quando o universo ainda era bem mais jovem e denso.</p></div>",
            "value": "result12"
          }
        ]
      },
      {
        "html": "<div class=\"searchresultsarea\"><div class=\"searchresult\"><h2>Black Hole Size Comparison Chart Gives New View of Universe</h2><a href='https://nerdist.com/article/biggest-black-holes-size-comparison/' target='_blank'>https://nerdist.com/article/biggest-black-holes-size-comparison/</a> <p>They can fit multiple solar systems inside of them. Ton 618, the largest ultramassive black hole, appears at the very end of the video, which, ...</p></div>",
        "value": "result2"
      },
      {
        "html": "<div class=\"searchresultsarea\"><div class=\"searchresult\"><h2>How Big Is the Largest Black Hole in the Universe? - Business ...</h2><a href='https://www.businessinsider.com/black-hole-how-big-largest-universe-2019-5' target='_blank'>https://www.businessinsider.com/black-hole-how-big-largest-universe-2019-5</a> <p>And the supermassive black hole at the center of Messier 87 is so huge that astronomers could see it from 55 million light-years away. It's 24 ...</p></div>",
        "value": "result3"
      },
      {
        "html": "<div class=\"searchresultsarea\"><div class=\"searchresult\"><h2>5 Most Massive Black Holes Discovered So Far. - The Secrets</h2><a href='https://www.secretsofuniverse.in/5-most-massive-black-holes/' target='_blank'>https://www.secretsofuniverse.in/5-most-massive-black-holes/</a> <p>The list of the most massive black holes is topped by TON 618. TON 618 is technically a a hyperluminous, broad-absorption line, radio-loud quasar—located near</p></div>",
        "value": "result4"
      },
      {
        "html": "<div class=\"searchresultsarea\"><div class=\"searchresult\"><h2>'Stupendously large' black holes could grow to truly monstrous ...</h2><a href='https://www.space.com/black-holes-can-reach-stupendously-large-sizes.html' target='_blank'>https://www.space.com/black-holes-can-reach-stupendously-large-sizes.html</a> <p>Currently the largest known black hole, powering the quasar TON 618, has a mass of 66 billion solar masses. TON 618's enormous bulk led ...</p></div>",
        "value": "result5"
      }
    ]
  }
}
```

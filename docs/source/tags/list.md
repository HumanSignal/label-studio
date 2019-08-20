## List

List element, used for ranking results. Great choice for recomendation systems.

### Parameters

-   `elementValue` **[string]** lookup key for child object
-   `elementTag` **([Text] \| [Image] \| [Audio])** element used to render children
-   `value` **[string]** list value
-   `name` **[string]** of group
-   `sortedHighlightColor` **[string]?** color
-   `axis` **[string]?** axis used for drag-n-drop
-   `lockAxis` **[string]?** lock axis

### Examples

```html
<View>
 <HyperText value="$markup"></HyperText>
 <List name="ranker" value="$replies" elementValue="$text" elementTag="Text" ranked="true" sortedHighlightColor="#fcfff5"></List>
</View>
```

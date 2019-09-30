---
title: Rating
type: tags
order: 409
---

Rating adds rating selection

### Parameters

-   `name` **[string]** of the element
-   `toName` **[string]** name of the element that you want to label
-   `maxRating` **integer** maxmium rating value (optional, default `5`)
-   `size` **[string]** one of: mini tiny small large huge massive (optional, default `large`)
-   `icon` **[string]** one of: star heart (optional, default `star`)
-   `hotkey` **[string]?** hokey

### Examples

```html
<View>
  <Text name="txt" value="$text"></Text>
  <Rating name="rating" toName="txt" maxRating="10"></Rating>
</View>
```

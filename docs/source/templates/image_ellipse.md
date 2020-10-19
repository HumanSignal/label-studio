---
title: Image Ellipse
type: templates
order: 104
---

Put ellipses on the image

<img src="/images/screens/image_ellipse.png" class="img-template-example" title="Images Ellipse" />

## Run

```bash
label-studio init image_ellipse_project
label-studio start image_ellipse_project 
```

## Config 

```html
<View>
  <EllipseLabels name="tag" toName="img">
    <Label value="Blood Cell" />
    <Label value="Stem Cell" />
  </EllipseLabels>
  <Image name="img" value="$image" />
</View>
```

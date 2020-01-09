---
title: Image Polygons
type: templates
order: 208
---

Image polygons labeling

<img src="/images/screens/image_polygons.png" class="img-template-example" title="Images Polygons" />

## Run

```bash
python server.py -c config.json -l ../examples/image_polygons/config.xml -i ../examples/image_polygons/tasks.json -o output_polygons
```

## Config 

```html
<View style="display: flex">
  <View style="width: 100px">
    <Header value="Pick label" />
    <PolygonLabels name="tag" toName="img" strokewidth="2" pointstyle="circle" pointsize="small" showInline="false">
      <Label value="Car" background="blue" />
      <Label value="Sign" background="blue" />
      <Label value="Person" background="blue" />
      <Label value="Tree" background="green" />
    </PolygonLabels>
    </View>
  <View>
    <Image name="img" value="$image" showMousePos="true" zoom="true" />
  </View>
</View>
```

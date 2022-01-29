---
title: Semantic Segmentation with Polygons
type: templates
category: Computer Vision
cat: computer-vision
order: 101
meta_title: Semantic Segmentation with Polygons Data Labeling Template
meta_description: Template for performing semantic segmentation with polygons with Label Studio for your machine learning and data science projects.
---

Add polygons to images to perform semantic segmentation.

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <Header value="Select label and click the image to start"/>
  <Image name="image" value="$image" zoom="true"/>
  <PolygonLabels name="label" toName="image"
                 strokeWidth="3" pointSize="small"
                 opacity="0.9">
    <Label value="Airplane" background="red"/>
    <Label value="Car" background="blue"/>
  </PolygonLabels>
</View>

<!-- {
  "completions": [{
    "result": [
      {
        "value": {
            "points": [
                [ 29.66, 54.34 ],
                [ 52, 55.58 ],
                [ 57.16, 44.91 ],
                [ 59, 46.89 ],
                [ 54.33, 57.81 ],
                [ 59, 86.60 ]
            ],
            "polygonlabels": [
                "Airplane"
            ]
        },
        "from_name": "label",
        "to_name": "image",
        "type": "polygonlabels"
      }
    ]
  }]  
} -->
```

## Related tags

- [Image](/tags/image.html)
- [PolygonLabels](/tags/polygonlabels.html)
- [Label](/tags/label.html)
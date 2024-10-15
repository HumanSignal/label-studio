---
title: Magicwand
type: tags
order: 413
meta_title: Magic Wand Tag for Quick Thresholded Flood Filling During Image Segmentation
meta_description: Customize Label Studio with a Magic Wand tag to quickly click and drag to threshold flood fill image areas during image segmentation labeling for machine learning and data science projects.
---

The `Magicwand` tag makes it possible to click in a region of an image a user is doing segmentation
labeling on, drag the mouse to dynamically change flood filling tolerance, then release the mouse button
to get a new labeled area. It is particularly effective at segmentation labeling broad, diffuse, complex
edged objects, such as clouds, cloud shadows, snow, etc. in earth observation applications or organic
shapes in biomedical applications.

Use with the following data types: image.

Zooming is supported for the Magic Wand, but it will not work on rotated images.

Example of the Magic Wand in use:

![Animated GIF showing Magic Wand clicking on cloud and dragging, automatically segmenting and selecting
pixels to create a mask](../images/magicwand_example.gif)

### CORS Configuration

The Magic Wand requires pixel-level access to images that are being labelled in order to do its
thresholding and flood filling. If you are hosting your images to label on a third-party domain,
you will need to enable CORS headers for the Magic Wand to work with cross domain HTTP `GET`
requests in order for the Magic Wand to be able to threshold the actual image pixel data. See the
[Label Studio storage guide](../guide/storage.html#Troubleshoot-CORS-and-access-problems) for more
details on configuring CORS.

### `Image` Tag Configuration

The `Magicwand` tag is configured to work with an `Image` tag that it will operate on for labeling.
If you are storing an image cross-domain that the `Image` tag will reference, you will have to
correctly setup the `crossOrigin` on the `Image` attribute. This attribute mimics the same
`crossOrigin` attribute that a normal DOM `img` tag would
have ([reference])(https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/crossOrigin).

If the image is on a public server or Google/AWS/Azure bucket that is publicly readable
without any authentication, you should set `crossOrigin` to `anonymous`.

If the image is on a server or a private cloud bucket that requires authentication of any
kind (i.e. the request must have HTTP headers that prove authentication set along with the
third party request), then you should set `crossOrigin` to `use-credentials`. Note that Google's
cloud buckets [do not support authenticated requests for CORS requests](https://cloud.google.com/storage/docs/cross-origin#additional_considerations),
which  means you either need to make that Google bucket world readable to work with the Magic Wand, or
use Label Studio's signed URL support ([AWS](../guide/storage.html#Set-up-connection-in-the-Label-Studio-UI),
[GCP](../guide/storage.html#Set-up-connection-in-the-Label-Studio-UI-1), and
[Azure](../guide/storage.html#Set-up-connection-in-the-Label-Studio-UI-2)).

If the image is on the same host as your Label Studio instance, you can simply leave off the
`crossOrigin` attribute or set it to `none`.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the image to label |
| [opacity] | <code>float</code> | <code>0.6</code> | Opacity of the Magic Wand region during use |
| [blurradius] | <code>number</code> | <code>5</code> | The edges of a Magic Wand region are blurred and simplified, this is the radius of the blur kernel |
| [defaultthreshold] | <code>number</code> | <code>15</code> | When the user initially clicks without dragging, how far a color has to be from the initial selected pixel to also be selected |

### Sample Results JSON

| Name | Type | Description |
| --- | --- | --- |
| original_width | <code>number</code> | Width of the original image (px) |
| original_height | <code>number</code> | Height of the original image (px) |
| image_rotation | <code>number</code> | Rotation degree of the image (deg) |
| value | <code>Object</code> |  |
| value.format | <code>&quot;rle&quot;</code> | Format of the masks, only RLE is supported for now |
| value.rle | <code>Array.&lt;number&gt;</code> | RLE-encoded image |

### Example JSON
```json
{
  "original_width": 1920,
  "original_height": 1280,
  "image_rotation": 0,
  "value": {
    "format": "rle",
    "rle": [0, 1, 1, 2, 3],
    "brushlabels": ["Car"]
  }
}
```

### Example

Basic image segmentation labeling configuration, with images stored on a third-party public cloud bucket:

```html
<View>
  <Labels name="labels" toName="image">
    <Label value="Person" />
    <Label value="Animal" />
  </Labels>
  <MagicWand name="magicwand" toName="image" />
  <Image name="image" value="$image" crossOrigin="anonymous" />
</View>
```
### Example

Magic Wand example with zoom controls and the brush turned on:

```html
<View>
  <Labels name="labels" toName="image">
    <Label value="Person" />
    <Label value="Animal" />
  </Labels>
  <MagicWand name="magicwand" toName="image" />
  <Brush name="brush" toName="image" />
  <Image name="image" value="$image" zoomControl="true" zoom="true" crossOrigin="anonymous" />
</View>
```

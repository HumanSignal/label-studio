<!-- Unfortunately included md files doesn't support code hightlighting, do it manually -->
<script src="/js/highlight.min.js"></script>
<script>hljs.highlightAll();</script>

## Units of image annotations

The units the x, y, width and height of image annotations are provided in percentages of overall image dimension. To convert those percentages to pixels, multiply the values by 100. 

You can use the following conversion formulas for `x, y, width, height`:

```python
pixel_x = x / 100.0 * original_width
pixel_y = y / 100.0 * original_height
pixel_width = width / 100.0 * original_width
pixel_height = height / 100.0 * original_height
```

For example: 

```python
task = {
    "annotations": [{
        "result": [
            {
                "...": "...",

                "original_width": 600,
                "original_height": 403,
                "image_rotation": 0,

                "value": {
                    "x": 5.33,
                    "y": 23.57,
                    "width": 29.16,
                    "height": 31.26,
                    "rotation": 0,
                    "rectanglelabels": [
                        "Airplane"
                    ]
                }
            }
        ]
    }]
}

# convert from LS percent units to pixels 
def convert_from_ls(result):
    if 'original_width' not in result or 'original_height' not in result:
        return None

    value = result['value']
    w, h = result['original_width'], result['original_height']

    if all([key in value for key in ['x', 'y', 'width', 'height']]):
        return w * value['x'] / 100.0, \
               h * value['y'] / 100.0, \
               w * value['width'] / 100.0, \
               h * value['height'] / 100.0

# convert from pixels to LS percent units 
def convert_to_ls(x, y, width, height, original_width, original_height):
    return x / original_width * 100.0, y / original_height * 100.0, \
           width / original_width * 100.0, height / original_height * 100


# convert from LS
output = convert_from_ls(task['completions'][0]['result'][0])
if output is None:
    raise Exception('Wrong convert') 
pixel_x, pixel_y, pixel_width, pixel_height = output
print(pixel_x, pixel_y, pixel_width, pixel_height)

# convert back to LS 
x, y, width, height = convert_to_ls(pixel_x, pixel_y, pixel_width, pixel_height, 600, 403)
print(x, y, width, height)
```

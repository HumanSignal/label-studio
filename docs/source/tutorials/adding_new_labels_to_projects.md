---
title: Adding new labels to the projects
hide_sidebar: true
---

This tutorial demonstrates how to add new labels to an ongoing project in real-time. The included example showcases the use of the `<Taxonomy>` tag, which can be applied to the entire document. However, this same principle can also be used for other cases, such as

- modifying labels for computer vision applications (bounding boxes, polygons, etc.), or segments in text and audio using nested `<Taxonomy>` tags.
- modify other tags that contain lists of labels, such as `<Choices>` and `<Labels>`.

**Note:** This code utilizes functions from an older version of the Label Studio SDK (v0.0.34).
The newer versions v1.0 and above still support the functionalities of the old version, but you will need to specify
[`label_studio_sdk._legacy`](../README.md) in your script.

Here is a list of the necessary items:

```python
import os
# Label Studio instance - replace if using self-hosted app
LABEL_STUDIO_URL = os.getenv("LABEL_STUDIO_URL", "http://localhost:8080")
LABEL_STUDIO_API_KEY = os.getenv("LABEL_STUDIO_API_KEY")

# The project ID where you want to add new labels
project_id = int(os.getenv("LABEL_STUDIO_PROJECT_ID", "1"))

# Taxonomy tag name where labels should be added in each project
tag_name = 'taxonomy'

# JSON payload representing the taxonomy tree to be added
update_taxonomy = {
    'New Top Level class': 1,
    'Eukarya': {
        'Cat': 1
    },
    'New Class': {
        'Object': 1,
        'Nested classes': {
            'And deeper hierarchy': {
                'Object': 1
            },
            'Another Object': 1
        }
    }
}
```

Here is a function `add_taxonomy_nodes` that supports Label Studio XML tree structure and update the nodes given `update_taxonomy` payload. Note that it adds new non-leaf nodes if they are missing:

```python
import xml.etree.ElementTree as ET


def add_nodes_recursive(parent, payload, tag_type='Choice'):
    """Helper function to walk recursively over taxonomy tree given current 'parent' node"""
    for key, value in payload.items():
        if isinstance(value, dict):
            nested_parent = parent.find(f".//{tag_type}[@value='{key}']")
            if nested_parent is None:
                nested_parent = ET.SubElement(parent, tag_type, {'value': key})
            add_nodes_recursive(nested_parent, value, tag_type)
        else:
            ET.SubElement(parent, tag_type, {'value': key})

def add_new_labels(project_id, tag_name, payload, tag_type='Taxonomy'):
    project = ls.projects.get(id=project_id)
    print(f'Updating project "{project.title}" (ID={project.id})')
    label_config = project.label_config
    root = ET.fromstring(label_config)
    tag_to_update = root.find(f'.//{tag_type}[@name="{tag_name}"]')
    if not len(tag_to_update):
        print(f'No <{tag_type} name="{tag_name}".../> tag found.')
        return
    child_tag_type = 'Choice' if tag_type in ('Taxonomy', 'Choices') else 'Label'
    add_nodes_recursive(tag_to_update, payload, child_tag_type)
    new_label_config = ET.tostring(root, encoding='unicode')
    ls.projects.update(id=project.id, label_config=new_label_config)
```

Now let's try it in action. Here is the current project configuration - it's taken from the default Templates under [Natural Language Processing > Taxonomy](https://labelstud.io/templates/taxonomy.html)

```python
from label_studio_sdk.client import LabelStudio
ls = LabelStudio(base_url=LABEL_STUDIO_URL, api_key=LABEL_STUDIO_API_KEY)

print(ls.projects.get(id=project_id).label_config)
```

Now let's add new labels from the specified `update_taxonomy` payload:

```python
add_new_labels(project_id, tag_name, update_taxonomy, tag_type='Taxonomy')
```

```python
print(ls.projects.get(id=project_id).label_config)
```

The existing taxonomy tree has been updated with new labels, including nested hierarchical items. Since only new labels were added, this can be done without interrupting ongoing projects.

<div class="alert alert-block alert-warning">
<b>WARNING</b> It's important to be cautious when adding new labels during the annotation process, as it could potentially invalidate previously created data and require you to restart the process. Only proceed with adding new labels if you are certain it won't cause any issues.
</div>

Now you can get all project IDs where you need to add new labels:

```python
for project in ls.projects.list():
    add_new_labels(project.id, tag_name, update_taxonomy)
```

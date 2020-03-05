---
title: Project setup
type: guide
order: 102
---

Project labeling config is a XML file consists of 
- **object tags** specifying input data sources from imported tasks,
- **control tags** for configuring labeling schema (how annotation result looks like)
- **visual tags** applying different user interface styles

[Check all tags available](/tags).

Here the example of XML config for classifying images exposed by task data key `image_url` onto Cats & Dogs:

```xml
<Image name="image_object" value="$image_url"/>
<Choices name="image_classes" toName="image_object">
    <Choice value="Cat"/>
    <Choice value="Dog"/>
</Choices>
```

## Setup from file

It is possible to create `config.xml` with labeling config and initialize project:

```bash
label-studio my_new_project start --init --label-config config.xml
```

## Setup from UI

You can also use web interface at [`/setup`](http://localhost:8200/setup) to paste your labeling config.
# Contribute to the Label Studio documentation

Thank you for investing your time in contributing to our project! Any contribution you make will be reflected on the Label Studio documentation site at https://labelstud.io/guide/, or https://labelstud.io/templates/ if you [contribute a template](#Contribute-a-template).

## Before you start

We value input from each member of the community, and we ask that you follow our [code of conduct](https://github.com/heartexlabs/label-studio/blob/master/CODE_OF_CONDUCT.md). We are a small team, but we try to respond to issues and pull requests within 2 business days. 

For changes that you contribute to any of the Label Studio repositories, please do the following:
- Review the general [contributor guidelines](https://github.com/heartexlabs/label-studio/blob/master/CONTRIBUTING.md).
- Create issues for any major changes and enhancements that you want to make. 
- Keep pull requests specific to one issue. Shorter pull requests are preferred and are easier to review. 

## Contribute updates to the documentation 

Some types of documentation that you might want to contribute to Label Studio:
- Small fix: Fix a typo or a broken link. 
- Add a section: Add a new section to an existing topic. For example, improve the [troubleshooting guidance for ML backends](https://labelstud.io/guide/ml_troubleshooting.html) based on an issue that you encountered.
- Refactor: Rewrite a topic to make it clearer. For example, improve the guidance for [creating custom webhook events](https://labelstud.io/guide/webhook_create.html).
- Add new: Add a new topic, such as [a new template](#Contribute-a-template) or a new ML tutorial. If you want to add something else, please open an issue and discuss it with the team.

## Contribute a template

All Label Studio templates are specific to a machine learning use case, such as Natural Language Processing, Computer Vision, Conversational AI, and others. 

We welcome contributions of new templates and enhancements to existing templates. Before you make a contribution, you might want to file a feature request issue about your proposed template to discuss it before you put in the work of a pull request.

If you want to add a new template, ensure that it fits one of the ML use cases. If your template is a customization of an existing template that primarily affects the layout of the labeling interface, consider contributing to the existing template by adding a new section to the `Enhance this template` section. 

### Contribute a new template

If you want to contribute a new template, do the following.

Add the template to the documentation:

1. Create a new file in the `label-studio/docs/source/templates` directory with the name of the template, separated by underscores, such as `new_template.md`. 
2. Add front matter to the template, including the title, category, type, order, and meta information. The `type` must be templates, and the order must be 1 higher than the last relevant template in the category to which your template applies. For example: 
```markdown
---
title: Document Retrieval
type: templates
category: Ranking and Scoring
cat: ranking-and-scoring
order: 502
meta_title: Document Retrieval Data Labeling Template
meta_description: Template for annotating documents for document retrieval tasks with Label Studio for your machine learning and data science projects.
---
```
3. Add information about your template. Include 1-2 sentences introducing the machine learning use case for the template and how the template actually works. For example:
```markdown
If you want to start training document retrieval or recommender models, you might want to develop a dataset with that identifies similar documents. Use this template to identify and choose documents that are related to a specific query or an existing document.
```
4. Add boilerplate information to allow a template preview to render:
```markdown
## Interactive Template Preview

<div id="main-preview"></div> 
```
5. Add a header `## Labeling Configuration` and place the full template XML in ````html```` tags. 
6. Add a section `## About the labeling configuration` and describe the tags in the template.
7. (Optional) Add a section with enhancements to the template with alternate configurations, a section for related templates, or a section for related tags. 

After adding the template file, add it to the relevant template gallery by doing the following:
1. Locate the template gallery file for your template use case. All template galleries are named `gallery_*.html` with the last portion of the file name an abbreviation of the use case. For example, `gallery_cv.html` is the computer vision template gallery.
2. Create a new entry for the template at the end of the file. For example, copy this and update the `a href` element to point to your new template file, add categories, and update the title:
```html
    <div class="column">
      <a href="/templates/image_ellipse.html">
        <div class="card">
          <div class="image-wrap">
            <div class="image" style="background-image: url(/images/templates-misc/object-detection-ellipses.png)"></div>
          </div>
          <div class="category">object detection, semantic segmentation</div>
          <div class="title">Object Detection with Ellipses</div>
        </div>
      </a>
    </div>
```
If you want to add an image, place it in the `label-studio/docs/themes/htx/source/images/templates-misc/` directory and update the link in this section.

That's it! Feel free to put out a pull request with only part of the template documentation to get feedback too.

### Contribute an enhancement to an existing template
If you modified an existing template and want to share your changes with the community, contribute an enhancement to an existing template. 

1. Locate the template document that you want to update. For example, `label-studio/docs/source/templates/text_summarization.md`.
2. If it doesn't exist, add a header `## Enhance this template` at the bottom of the template, before the `## Related Tags` section.
3. Add a new header describing your enhancement. For example, ```### Display text box next to the text to summarize```.
4. Describe the enhancement to the labeling config. For example:
```markdown
If you want to display the text box next to the text to summarize, do the following:

1. Add flex display styling to the [View](/tags/view.html) tag for the labeling configuration: `<View style="display: flex;">`
2. Add new [View](/tags/view.html) tags to wrap the [Header](/tags/header.html) and the [Text](/tags/text.html) sample so that they display on the left.
3. Wrap the [TextArea](/tags/textarea.html) and [Header](/tags/header.html) tags in [View](/tags/view.html) tags with the following CSS styling so that they display neatly on the right:
    ```xml
    <View style="width: 50%; padding-right: 2em; margin-left: 2em;">
    ```
Your fully enhanced labeling configuration looks like the following:
    ```xml
    <View style="display: flex;">
      <View>
        <Header value="Please read the text" />
        <Text name="text" value="$text" />
      </View>
      <View style="width: 50%; padding-right: 2em; margin-left: 2em;">
        <Header value="Provide one sentence summary" />
        <TextArea name="answer" toName="text"
                  showSubmitButton="true" maxSubmissions="1" editable="true"
                  required="true" />
      </View>
    </View>
    ```
```


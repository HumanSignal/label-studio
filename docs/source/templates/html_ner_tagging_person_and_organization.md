---
title: HTML NER Tagging
type: templates
category: Community Contributions
cat: community
order: 1001
meta_title: HTML NER Tagging Data Labeling Template
meta_description: Template for html ner tagging with Label Studio
community: true
community_author: luarmr
community_contributors: bmartel
community_repo: awesome-label-studio-config
github_repo: humanSignal/awesome-label-studio-config
report_bug_url: https://github.com/humanSignal/awesome-label-studio-config/issues/new?template=bug_report.yml&config-name=html-ner-tagging-person-and-organization&title=Bug%20in%20html-ner-tagging-person-and-organization&body=I%20found%20a%20bug%20in%20the%20html-ner-tagging-person-and-organization%20template.%0A%0A%23%23%20Steps%20to%20Reproduce%0A1.%20...%0A2.%20...%0A%0A%23%23%20Expected%20Behavior%0A...%0A%0A%23%23%20Actual%20Behavior%0A...%0A%0A%23%23%20Environment%0A-%20Label%20Studio%20Version:...%0A-%20Browser%20(if%20applicable):...%0A-%20Operating%20System:...%0A%0A%23%23%20Additional%20Context%0A...%0A
repo_url: https://github.com/HumanSignal/awesome-label-studio-config/tree/main/label-configs/html-ner-tagging-person-and-organization
---


<img src="/images/templates/html-ner-tagging-person-and-organization.jpg" alt="" class="gif-border" width="552px" height="408px" />

This labeling config uses HyperText elements for named entity recognition on HTML content. It highlights recognized entities (Person, Organization) within styled HTML text.

## Labeling Configuration

```html
<View>
  <HyperTextLabels name="ner" toName="text">
    <Label value="Person" background="green"/>
    <Label value="Organization" background="blue"/>
  </HyperTextLabels>

  <View style="border: 1px solid #CCC;
               border-radius: 10px;
               padding: 5px">
    <HyperText name="text" value="$text"/> 
              </View>
</View>

```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

This configuration uses the following tags:

- [HyperText](/tags/hypertext.html)
- [HyperTextLabels](/tags/hypertextlabels.html)
- [Label](/tags/label.html)
- [View](/tags/view.html)

## Usage Instructions

- **HyperText**: This config uses the HyperText tool to display and label HTML.
- **Labels**: Currently includes "Person" (green) and "Organization" (blue).


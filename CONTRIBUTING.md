# Contribute to Label Studio

Thanks for taking the time to contribute! Contributions from people like you help make Label Studio an amazing tool to use. 

This document provides guidelines for contributing code and documentation to Label Studio. Following these guidelines makes it easier for the maintainers to respond to your pull requests and provide timely and helpful feedback to help you finalize your requested changes.

## Types of Contributions

You can contribute to Label Studio by submitting [bug reports and feature requests](https://github.com/heartexlabs/label-studio/issues/new/choose), or by writing code to do any of the following:
- Fix a bug.
- Provide [example machine learning backend code](https://github.com/heartexlabs/label-studio-ml-backend) to help others add a machine learning backend for a specific model.
- Share [example annotation templates](https://github.com/heartexlabs/label-studio/tree/master/label_studio/annotation_templates) for specific use cases.
- Add [new export formats](https://github.com/heartexlabs/label-studio-converter) for labeling projects.
- Support a new type of labeling or [extend existing labeling functionality](https://github.com/heartexlabs/label-studio-frontend). 

We also welcome contributions to [the documentation](https://github.com/heartexlabs/label-studio/tree/master/docs/source)! 

Please don't use the issue tracker to ask questions. Instead, join the [Label Studio Slack Community](https://slack.labelstudio.heartex.com/?source=github-contrib) to get help!

If you're not sure whether an idea you have for Label Studio matches up with our planned direction, check out the [public roadmap](https://github.com/heartexlabs/label-studio/blob/master/roadmap.md) first. 

## How to Start Contributing

If you want to contribute to Label Studio, but aren't sure where to start, review the [issues tagged with "good first issue"](https://github.com/heartexlabs/label-studio/labels/good%20first%20issue) or take a look at [the existing issues](https://github.com/heartexlabs/label-studio/issues) to see if any interest you.

If you decide to work on an issue, leave a comment so that you don't duplicate work that might be in progress and to coordinate work with others. 

If you haven't opened a pull request before, check out the [GitHub documentation on pull requests](https://docs.github.com/en/github/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests).

## Contributor Guidelines

We value input from each member of the community, and we ask that you follow our [code of conduct](https://github.com/heartexlabs/label-studio/blob/master/CODE_OF_CONDUCT.md). We are a small team, but we try to respond to issues and pull requests within 2 business days. 

### Before you start
For changes that you contribute to any of the Label Studio repositories, please do the following:
- Create issues for any major changes and enhancements that you want to make. 
- Keep pull requests specific to one issue. Shorter pull requests are preferred and are easier to review. 

### Committing code
Make sure that you contribute your changes to the correct repository. Label Studio is built in a few separate repositories including this one:
- Changes to the data manager belong in the [data manager repository](https://github.com/heartexlabs/dm2).
- Changes to the labeling or editing workflow belong in the [label-studio-frontend repository](https://github.com/heartexlabs/label-studio-frontend).
- Changes to the export formats available in Label Studio belong in the [label studio converter repository](https://github.com/heartexlabs/label-studio-converter).
- Changes to the machine learning backend functionality belong in the [label-studio-ml-backend repository](https://github.com/heartexlabs/label-studio-ml-backend).

### Code standards
Follow these code formatting guidelines:
- Lint your Python code with [black](https://github.com/psf/black) using `--skip-string-normalization`. 
- Use single quotes for strings.
- Use comments to describe code blocks. 
- When possible, use the following conventions for your commit messages:
  - prefix with [fix] for bugfix changes
  - prefix with [ext] for feature or external-facing changes
  - prefix with [docs] for doc-only changes

### Testing
- Make sure that changes you make work on Windows, Mac, and Linux operating systems.
- Include unit tests when you contribute bug fixes and new features. Unit tests help prove that your code works correctly and protects against future breaking changes.
- Make sure that the code coverage checks and automatic tests for pull requests pass. 

### Additional questions

If you have any questions that aren't answered in these guidelines, please find us in the #contributor channel of the [Label Studio Slack Community](https://slack.labelstudio.heartex.com/?source=github-contrib).

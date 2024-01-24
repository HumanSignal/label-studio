# Label Studio Contributor’s Guide

Are you looking for ways to start contributing to Label Studio? This guide will help you understand how to contribute to the project, giving you an understanding of the types of contributions you can make, the standards for each type of contribution, the overall organization of the Label Studio project, and the contribution process.

## Types of Contributions

While one of the most common ways to contribute to open source software is through code, there are many other ways to participate in the community development and maintenance of Label Studio. In addition to code pull requests, you can contribute through bug reports, documentation fixes, feature requests, labeling templates, storage backends, and machine learning examples. You can also participate in the Label Studio community Slack by engaging with the rest of the community and answering questions. No contribution is too small!

### Docs Update

One of the easiest ways to contribute to Label Studio is through documentation updates. Documentation is one of the first ways that new users will engage with Label Studio, and should help to guide users throughout their journey with Label Studio. Helping to craft clear and correct documentation can have a lasting impact on the experience of the entire user community.

In addition to the change itself, docs updates should include a description of the documentation problem in the pull request, and how the pull request addresses the issue.

Use the Docs Update template for your pull request, and prefix your pull request title with `docs:`.

### Bug Report

Bug reports help identify issues the development team may have missed in testing, or edge cases that diminish the user experience. A good bug report not only alerts the development team to an issue, but also provides the conditions to reproduce, verify, and fix the bug.

When filling out a bug report, please include as much of the following information as possible. If the development team can't reproduce your bug, they can’t take the necessary steps to fix it.

A bug report can enter several different states, including:

- **verified**: The bug report has been verified and is in the development pipeline to be fixed
- **not a bug**: The report does not describe a bug, which might be the result of expected behavior, or misconfiguration of the platform
- **needs information**: The development team couldn’t verify the bug, and needs additional information before action can be taken
- **fixed**: The bug report describes a bug that has been fixed in the latest version of Label Studio

When a bug report enters the “fixed” or “not a bug” states, the issue will be closed.

Use the Bug Report template for your issue.

### Bug Fix

Bug fixes build upon bug reports, and provide code that addresses the issue. Before submitting a bug fix, please submit a bug report to provide the necessary context for the development team. Bug fixes should follow the coding standards for Label Studio and include tests. Unit tests are necessary to demonstrate the bug has been fixed, and to also provide a safeguard against future regressions. In addition to unit tests, you should provide acceptance criteria that the QA team can use to verify the application's behavior. Bug fixes must reference the original bug report.

Use the Bug Fix template for your pull request, and prefix your pull request title with `fix:`.

### Labeling Templates

One of the most powerful features of Label Studio is its flexible and configurable annotation interface. Label Studio ships with several example annotation interfaces covering many use cases. If you have a workflow not covered by the default templates, you can submit a new interface for inclusion.

Use the Annotation Interface template for your pull request, and prefix your pull request title with `feat:`

### ML Backend Example

The [Label Studio ML Backend repository](https://github.com/HumanSignal/label-studio-ml-backend) includes a number of different machine learning examples that users can build their own machine learning systems on. Please be sure that your example follows the repository conventions, and has complete documentation in a `[README.md](http://README.md)` that includes hardware requirements, installation instructions, and usage examples. Prefix your pull request title with `feat:`.

### Export Format Additions or Improvements

The [Label Studio Converter repository](https://github.com/HumanSignal/label-studio-converter) helps you to encode labels into the format of your favorite machine learning library. It can run conversation from the command line, or directly from within Label Studio. When submitting new codecs, prefix your pull request title with `feat:`.

### Feature Request

You may find that Label Studio is missing a feature that would reduce the friction in your annotation workflow. The development team wants to hear your feedback, and feature requests help to prioritize future work on the Label Studio platform.

It helps the development team and product team to use concrete examples of how the feature works through user stories. A user story follows a standard format: As a *[user],* I want *[an outcome]* so that *[a benefit/value]*.

### Feature Implementation

A feature implementation is a much larger endeavor that will require coordination with the development team. A feature implementation requires two major parts: a Product Requirements Document (PRD) and the feature pull request. 

The PRD should be filed as an issue with the prefix `prd:`. It should contain the following sections:

- *Problem:* A description of the problem you are attempting to address with this feature.
- *Proof of Concept (PoC) Notes:* If you have working code, a link to a branch with highlights on how the PoC is working.
- *User Stories:* Concrete examples of how the feature works, following a format similar to: As a *[user],* I want *[an action]* so that *[a benefit/value]*.

The core development and product team will review the feature request and provide feedback. If the feature is accepted for inclusion, it should be followed by a pull request. The feature pull request should include:

- The code necessary to implement the feature.
- Unit and integration tests to prove that the feature works.
- Documentation that describes how to use the feature.
- Acceptance criteria in the commit message that describes how QA should test the feature to guarantee it works as intended.
- A link to the PRD issue in the commit message.

Prefix your pull request title with `feat:`

### Review expectations

We may request that some changes (especially larger ones, or changes to performance-sensitive aspects of the backend infrastructure) be guarded behind a feature flag, to ensure that they can be safely rolled out. In these cases, we will either provide the name of a feature flag to check using `flag_set` in the code, or add the feature flag directly to the PR ourselves.

We may also add references to JIRA tickets created on our side for the purpose of tracking which changes are included in our different releases.

## Code Organization

### [Label Studio](https://github.com/humansignal/label-studio)

The primary repository for Label Studio, and contains the majority of the logic for how labels are managed. Three areas where you may want to contribute include:

* `label_studio`--This is the main app, containing most of the backend code. 
* `web/apps/labelstudio` -- This acts as the central integration point for all frontend elements. 
* `web/libs/editor`--This is the frontend library. It uses React to build the UI and mobx-state-tree for state management. 
* `web/libs/datamanager`--This is the frontend interface for the Label Studio Data Manager, our data exploration tool. 


### [Label Studio SDK](https://github.com/HumanSignal/label-studio-sdk)

Python SDK to build advanced automation and integrations against the Label Studio API.

### [Label Studio Converter](https://github.com/HumanSignal/label-studio-converter)

Library for converting between Label Studio format and different machine learning formats. It can be run standalone or as an extension to Label Studio

### [Label Studio ML Backend](https://github.com/HumanSignal/label-studio-ml-backend)

Machine learning backend interface and server code for building machine learning integrations with Label Studio. Includes several example backends.

## Coding Standards

When submitting pull requests for code changes, please use the following standards.

- Keep your pull request small and target only a single feature or a single bug.
- Use single quotes for strings.
- Use comments to describe code blocks.
- Use semantic variable naming.
- Prefer functions that do a limited number of things.
- Prefer loose coupling.
- Follow all linting standards enforced by QA. We use `[ruff](https://beta.ruff.rs/docs/)` for linting, `[blue](https://github.com/grantjenks/blue)` for styling, and are in the process of adding `[mypy](https://github.com/python/mypy)` for static typing. All of these will eventually be enforced on CI. Please type hint all new code!
- Prefer smaller patches. As a rough guideline, limit the lines changed to around 400. Open multiple PRs for larger changes.

### Testing

- Include unit tests when you contribute bug fixes and new features. Unit tests help prove that your code works correctly and protects against future breaking changes.
- Use `tavern` for testing API endpoints whenever possible.
- Please describe acceptance criteria with your bug fixes and new features. Acceptance criteria give the QA team clear guidance on how the chance should behave. Acceptance criteria follow the form, “When a user does <action>, then <expected behavior>.”
- After submitting your pull request, verify that the code coverage tests and automatic testing for pull requests pass.
- For documentation pull requests, verify that the change is correctly rendered in the automatically generated preview.
- Label Studio backend code should be compatible with sqlite and postgresql databases. Our automated tests will run against both sqlite and postgresql-equipped environments, but please use database backend specific features with care.

### Additional questions

If you have any questions that aren't answered in these guidelines, please find us in the #contributor channel of the [Label Studio Slack Community](https://slack.labelstud.io/?source=github-contrib).


---
title: Announcing the Label Studio SDK with Label Studio 1.4.0
type: blog
image: /images/release-140/sm-code-example.png
order: 97
meta_title: Label Studio Release Notes 1.4.0
meta_description: Release notes and information about Label Studio version 1.4.0, announcing the Label Studio SDK to work with the open source data labeling tool Label Studio, or the enterprise version Label Studio Enterprise. 
---

Streamline your data science pipeline with the Label Studio Python SDK, introduced in version 1.4.0 of Label Studio.

With this latest release, you can tackle the toughest part of machine learning—**data wrangling**—right from your Python scripts. [Intuitive classes and methods](/sdk/index.html) help you tackle your active learning and weak supervision use cases, as well as simpler cases like reviewing and updating pre-annotated tasks.

<br/><img src="/images/release-140/sdkquickstart.gif" alt="Gif of a code editor typing the quickstart steps on the README and in the SDK tutorial." class="gif-border" />

For cases when you want to minimize the amount of data that you're labeling, you can set up **active learning** in a Python script. You can use the SDK to create a labeling project and import tasks, then relying on the [available webhooks](/guide/webhooks.html) to keep track of when enough tasks have been labeled to take action. Then you can retrieve the labeled tasks and train your model. See the full [active learning scenario](https://github.com/heartexlabs/label-studio-sdk/blob/master/examples/active_learning/active_learning.ipynb).

You can programmatically create noisy labels, assess their validity, and take action in a **weak supervision** scenario. Save the more correct noisy labels directly as annotations for training your model, and import the high-importance and high-uncertainty task predictions into Label Studio to be reviewed and corrected. Check out the full [weak supervision example on GitHub](https://github.com/heartexlabs/label-studio-sdk/blob/master/examples/weak_supervision/weak_supervision.ipynb).

<br/><img src="/images/release-140/big-code-example.png" alt="Screenshot of a code editor showing the contents of the active learning example linked in active learning scenario." class="gif-border" />

If you want to be able to do more **granular data preparation** than you already do, the SDK makes that straightforward too. [Create filters to simplify splitting your data](/guide/sdk.html#Prepare-and-manage-data-with-filters) into training and testing sets, or to parallelize the reviewers for a ground truth dataset in Label Studio Enterprise. Check out the [tutorial](/guide/sdk.html) or the [README](https://github.com/heartexlabs/label-studio-sdk#readme) and get started today!

This release of Label Studio also includes a lot of updates to the export flow, predictions and annotation possibilities, keyboard shortcut updates (yes, you can now customize the submit hotkey), and other exciting improvements and bug fixes. To see the full list of updates and contributors to this release, check out the [changelog on GitHub](https://github.com/heartexlabs/label-studio/releases).

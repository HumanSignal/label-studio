---
title: Label Studio Python SDK 
short: Python SDK 
type: guide
tier: all
order: 404
order_enterprise: 404
meta_title: Label Studio Python SDK 
meta_description: Overview information for the Label Studio Python SDK.
section: "Integrate & Extend"

---

<div class="enterprise-only">

The [**Label Studio Python SDK**](https://labelstud.io/sdk/index.html) allows you to seamlessly integrate Label Studio into your data science and machine learning pipelines.

</div>

<div class="opensource-only">

The [**Label Studio Python SDK**](https://api.labelstud.io/api-reference/introduction/getting-started) allows you to seamlessly integrate Label Studio into your data science and machine learning pipelines.

</div>

The SDK provides a set of predefined classes and methods to interact with the Label Studio API directly from your Python scripts, making it easier to manage projects, import tasks, and handle annotations. 


## Benefits to using the Python SDK

- **Streamlined API Interactions**: The SDK simplifies API interactions with user-friendly Python methods and classes.
- **Integration**: Easily integrate Label Studio actions into your existing data science workflows.
- **Automation**: Automate repetitive tasks such as project creation, task imports, and data exports.
- **Enhanced Data Preparation**: Use filters and custom configurations to prepare and manage data efficiently, ensuring high-quality annotations.
- **Asynchronous Operations**: Perform asynchronous data operations for better performance and handling of large datasets.


## Start using the Label Studio Python SDK

1. Install the SDK:
   `pip install label-studio-sdk`
2. In your Python script, do the following:
   - Import the SDK.
   - Define your API key and Label Studio URL. The API key is available from your [**Account & Settings** page](user_account#Access-token).
   - Connect to the API.
```python
# Define the URL where Label Studio is accessible and the API key for your user account
LABEL_STUDIO_URL = 'http://localhost:8080'
API_KEY = 'd6f8a2622d39e9d89ff0dfef1a80ad877f4ee9e3'

# Import the SDK and the client module
from label_studio_sdk.client import LabelStudio

# Connect to the Label Studio API and check the connection
ls = LabelStudio(base_url=LABEL_STUDIO_URL, api_key=API_KEY)
```

## SDK versions and compatibility

<div class="enterprise-only">

In June 2024, we released SDK 1.0. 

</div>

<div class="opensource-only">

In June 2024, we released SDK 1.0. The previous SDK (version <1) is deprecated and no longer supported. We recommend upgrading to [the latest version](https://github.com/HumanSignal/label-studio-sdk). 

</div>

If you still want to use the older version, you can install it using `pip install "label-studio-sdk<1"`. 

You can also check out an older branch version in the GitHub repository:

```sh
git clone https://github.com/HumanSignal/label-studio-sdk.git
cd label-studio-sdk
git fetch origin
git checkout release/0.0.34
```

Or you can simply modify you code to change the import stream as follows:

```python
from label_studio_sdk import Client
from label_studio_sdk.data_manager import Filters, Column, Operator, Type
from label_studio_sdk._legacy import Project
```

If you're looking for the documentation for the older version, you can find it [here](https://labelstud.io/sdk/).


## Resources and links

* [**Getting started with the Python SDK**](https://api.labelstud.io/api-reference/introduction/getting-started) - This will lead you through several basic tasks using the SDK. 
* [**API reference**](https://api.labelstud.io/api-reference/introduction/getting-started) - This is our reference for all available Label Studio API requests and parameters. 
* [**Label Studio Python Library README**](https://github.com/HumanSignal/label-studio-sdk) - This includes getting started information and more code examples.  
* [**5 Tips and Tricks for Label Studio’s API and SDK**](https://labelstud.io/blog/5-tips-and-tricks-for-label-studio-s-api-and-sdk/) - This provides additional user guidance and more examples.


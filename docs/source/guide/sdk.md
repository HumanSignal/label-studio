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

The [**Label Studio Python SDK**](https://api.labelstud.io/api-reference/introduction/getting-started) allows you to seamlessly integrate Label Studio into your data science and machine learning pipelines.

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
   - Define your API key/access token and Label Studio URL. You can generate a key from your **Account & Settings** page. For more information, see [Access Tokens](access_tokens).
   - Connect to the API.

```python
# Define the URL where Label Studio is accessible
LABEL_STUDIO_URL = 'YOUR_BASE_URL'

# API key can be either your personal access token or legacy access token
LABEL_STUDIO_API_KEY = 'YOUR_API_KEY'

# Import the SDK and the client module
from label_studio_sdk import LabelStudio
client = LabelStudio(base_url=LABEL_STUDIO_URL, api_key=LABEL_STUDIO_API_KEY)
```


## Resources and links
 
* [**API reference**](https://api.labelstud.io/api-reference/introduction/getting-started) - This is our reference for all available Label Studio API requests and parameters. 
* [**Label Studio Python Library README**](https://github.com/HumanSignal/label-studio-sdk) - This includes getting started information and more code examples.  
* [**5 Tips and Tricks for Label Studio’s API and SDK**](https://labelstud.io/blog/5-tips-and-tricks-for-label-studio-s-api-and-sdk/) - This provides additional user guidance and more examples.


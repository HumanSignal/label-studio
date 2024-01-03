---
title: Troubleshoot agreements
short: Troubleshooting
tier: enterprise
type: guide
order: 0
order_enterprise: 268
meta_title: Troubleshooting agreement metrics in Label Studio
meta_description: Tips on troubleshooting issues with agreements
section: "Quality control"
date: 2023-12-20 20:17:05
---

## Troubleshoot your custom agreement metric

After adding your code to Label Studio Enterprise, the following could happen:

- Your code might fail to deploy if there are errors. If you don't see errors in the Label Studio UI, check your web browser console after you attempt to save the code.
- Your code might fail to run properly based on the format of your JSON annotations. Export an example annotation from your project in Label Studio JSON format and make sure your function handles the annotation as expected outside of Label Studio. 

If you change the labeling configuration for your project, you might need to update the custom agreement metric code to handle the new format of annotations produced.


## Agreement numbers are empty in Data Manager column

Agreement numbers are not calculated immediately. There is a delay that can range from seconds to minutes, depending on the traffic and availability of computational resources.

If they still don’t appear in the corresponding **Agreement** column, try the following:

1. Go to the Quality page in the project settings.  
2. Under **Annotation Agreement**, use the dropdown selector to choose any other matching function then click **Save**.
3. Use the same dropdown to reselect the previous matching function and save it again

This effectively resets the matching function and restarts the underlying agreement calculation job. After a while, you should be able to see the numbers in **Agreement** column on a Data Manager page.
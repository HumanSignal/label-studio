---
title: Activity logs
short: Activity logs
tier: enterprise
type: guide
order: 0
order_enterprise: 354
meta_title: User activity logs in Label Studio
meta_description: How to view user activity logs in Label Studio
section: "Manage Your Organization"
date: 2024-02-05 16:40:16
---

You can view user logs from the **Organization > Activity Log** page. Only users with the Administrator or Owner role can access this page. 

![Screenshot of options at the top of the Organization page](/images/admin/org_menu.png)

Currently, there is no limit for how long activity logs are retained. 

Logs include user ID, IP address, a timestamp, and the type of action performed by logging the API request. You can find out more about each action being performed by clicking the API request. 

!!! note
    In some cases, clicking the API request will not return additional information. This is typically because the request includes sensitive information, such as a password. 

You can filter the logs by the following:

* User
* Project
* Request type (GET, POST, PATCH, DELETE)
* Date range
* Request keyword




---
title: Manage user accounts
short: Manage user accounts
tier: opensource
type: guide
order: 372
order_enterprise: 0
meta_title: Manage user accounts
meta_description: Manage existing user accounts in Label Studio Community edition
section: "Manage Your Organization"
date: 2024-02-06 16:36:44
---

!!! error Enterprise
    In Label Studio Community Edition, there are relatively limited options available for user management. 
    
    In Label Studio Enterprise, you can set roles for users, restrict their permissions, delete and deactivate users, and view detailed logs of user actions. For more information about the user management capabilities of Label Studio Enterprise, see [User management overview](https://docs.humansignal.com/guide/manage_users) in the Enterprise documentation. To start a free trial, [click here](https://app.heartex.com/user/trial).  

## Retrieve user info from the command line

You can retrieve information about a user, including the API user token for a user, from the command line after starting Label Studio.

From the command line, run the following:

```bash
label-studio user --username <username>
```

You can see user info, including their API token, as the last line of the response. For example:

```
=> User info:
{'id': 1, 'first_name': 'User', 'last_name': 'Somebody', 'username': 'label-studio', 'email': 'example@labelstud.io', 'last_activity': '2021-06-15T19:37:29.594618Z', 'avatar': '/data/avatars/img.jpg', 'initials': 'el', 'phone': '', 'active_organization': 1, 'token': '<api_token>', 'status': 'ok'}
```

Users can also retrieve their own tokens from the Label Studio app. For more information, see [Manage your user account settings](user_account). 


## Review existing accounts in Label Studio

You can view the organization user list from Label Studio:

1. Open Label Studio and click the menu in the upper left. 
2. Select **Organization**. 

Click the user's row to see additional details about their activity, such as when they were last active, which projects they created, and which projects they contributed to. 

## Reset passwords

If you forget your password or change passwords regularly for security reasons, you can change it from the command line.

On the server running Label Studio, run the following command. And then when prompted, type the username and the new password:

```bash
label-studio reset_password
```

You can also use optional command line arguments to reset the password for a username.

- Specify the username and type the password when prompted:

    ```bash
label-studio reset_password --username <username>
New password:
```

- Specify both the username and the password:

    ```bash
label-studio reset_password --username <username> --password <password>
```

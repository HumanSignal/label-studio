---
title: Set up user accounts
type: guide
order: 250
meta_title: User Accounts
meta_description: Sign up for Label Studio and invite users to collaborate on your data labeling, machine learning, and data science projects.
---

Sign up and create an account for Label Studio to start labeling data and setting up projects. 

Everyone with an account in Label Studio has access to the same functionality. If you're using Label Studio Enterprise, see [Manage access to Label Studio](manage_users.html) for details about what role-based access control is available. 

## Create an account

When you first [start Label Studio](start.html), you see the sign up screen. 

1. Create an account with your email address and a password. 
2. Log in to Label Studio.

Accounts that you create are stored locally on the Label Studio server and allow multiple annotators to collaborate on a specific data labeling project. 

If you want, you can create an account from the command line when you start Label Studio.
```bash
label-studio start --username <username> --password <password> [--user-token <token-at-least-5-chars>]
```

> Note: The `--user-token` argument is optional. If you don't set the user token, one is automatically generated for the user. Use the user token for API access. The minimum token length is 5 characters. 

### Retrieve user info from the command line

You can retrieve information about a user, including the API user token for a user, from the command line after starting Label Studio. 

From the command line, run the following: 
```bash
label-studio user --username <username>
```

You can see user info as the last line of the response. For example: 
```
=> User info:
{'id': 1, 'first_name': 'User', 'last_name': 'Somebody', 'username': 'label-studio', 'email': 'example@labelstud.io', 'last_activity': '2021-06-15T19:37:29.594618Z', 'avatar': '/data/avatars/071280b8-48ACD59200000578-5322459-image-m-23_1517162202847.jpg', 'initials': 'el', 'phone': '', 'active_organization': 1, 'token': '1bc2c33cb44e56cb9f1e191238ffb78564675faa', 'status': 'ok'}
```

You can use the output to retrieve the token for a user and use the token to call the API. You can also retrieve the user token from the Label Studio UI. See more in the [Label Studio API documentation](api.html).

### Restrict signup for local deployments

To restrict who has access to your Label Studio instance, invite collaborators directly using an invitation link. 

To disable the signup page unless someone uses the invitation link, do the following from the command line after installing Label Studio:
```bash
export LABEL_STUDIO_DISABLE_SIGNUP_WITHOUT_LINK=true
```

You can then start Label Studio and create an account for yourself to use to log into Label Studio:
```bash
label-studio start --username <username> --password <password>
```
 After you log into Label Studio, you can start [inviting collaborators](#Invite-collaborators-to-a-project).

### Restrict signup for cloud deployments

To restrict signup to only those with a link on cloud deployments, set the following environment variables after you install but before you start Label Studio:
```
LABEL_STUDIO_DISABLE_SIGNUP_WITHOUT_LINK=true
LABEL_STUDIO_USERNAME=<username>
LABEL_STUDIO_PASSWORD=<password>

# token is optional, it is generated automatically if not set 
LABEL_STUDIO_USER_TOKEN=<token-at-least-5-chars>
```
Then, start Label Studio and log in with the username and password that you set as environment variables and start [inviting collaborators](#Invite-collaborators-to-a-project).

## Invite collaborators to a project

After you [set up a labeling project](setup.html), invite annotators to the project to start collaborating on labeling tasks. Inviting people to your Label Studio instance with a link does not restrict access to the signup page unless you also set an environment variable. See how to [Restrict signup for local deployments](#Restrict-signup-for-local-deployments) and [Restrict signup for cloud deployments](#Restrict-signup-for-cloud-deployments) on this page.

1. In the Label Studio UI, click the hamburger icon and click **People**.
2. Click **+ Add People**.
3. Copy the invitation link and share it with those that you want to invite to Label Studio. If you need to update the link and deactivate the old one, return to this page and click **Reset Link**. The link only resets if the signup page is also disabled.

## Manage your account in Label Studio
After you create an account in Label Studio, you can make changes to it as needed.

1. From the Label Studio UI, click the user icon in the upper right.
2. Click **Account & Settings**.
3. Update your display name and add a profile picture no larger than 512 x 512 pixels. 
4. Click **Save**. 

## Review existing accounts in Label Studio
You can review the existing accounts in Label Studio to see which people created which projects, and to which projects they contributed annotations. 

1. From the Label Studio UI, click the hamburger icon and click **People**.
2. Review the list of users by email address and name. You can see the last time a user was active in Label Studio.
3. Click a row to see additional detail about a specific user, including the projects that they created or contributed annotations to.

### Reset password
If you forget your password or change passwords regularly for security reasons, you can change it from the command line.

1. On the server running Label Studio, run the following command: 
```bash
label-studio reset_password
```
2. When prompted, type the username and the new password. You see `Password successfully changed`.

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



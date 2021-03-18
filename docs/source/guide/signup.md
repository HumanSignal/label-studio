---
title: Create user accounts for Label Studio
type: guide
order: 103
---

Sign up and create an account for Label Studio to start labeling data and setting up projects. 

Everyone with an account in Label Studio has access to the same functionality. 

## Create an account

When you first [start Label Studio](start.html), you see the sign up screen. 

1. Create an account with your email address and a password. 
2. Log in to Label Studio.

Accounts that you create are stored locally on the Label Studio server, and allow multiple annotators to collaborate on a specific data labeling project.

If you want, you can create an account from the command line when you start Label Studio.
```bash
label-studio start --username <username> --password <password>
```

## Invite collaborators to a project

After you [set up a labeling project](setup.html), invite annotators to the project to start collaborating on the dataset and the labeling tasks. 

## Manage created accounts in Label Studio
After you create an account in Label Studio, you can make changes to it as needed.

1. From the Label Studio UI, click the user icon in the upper right.
2. Click **Account & Settings**.
3. Update your display name and add a profile picture no larger than 512 x 512 pixels. 
4. Click **Save**. 


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



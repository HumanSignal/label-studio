---
title: Google SAML SSO Setup Example
short: Google SAML SSO with Label Studio Setup Example
tier: enterprise
order: 253
meta_title: Google SAML SSO with Label Studio Setup Example
meta_description: Label Studio Enterprise documentation for setting up Google as Identity Provider for SAML SSO Setup Example.
hide_sidebar: true
---

You can set up Label Studio to use Google's IdP for SSO. 

You will need the following permissions:

* Access to the [Google Admin console](https://admin.google.com/). Your account must have [super administrator privileges](https://support.google.com/a/answer/2405986#super_admin). 
* Your Label Studio user role must be Owner or Administrator. 


## Step 1: Get Label Studio ACS endpoints as a Service Provider (SP)

1. **Access Label Studio SSO settings:**
   - Log in to Label Studio with an account that has the Owner or Administrator role.
   - Click the menu in the upper left and select **Organization**.
   - Select **SSO & SAML** in the upper right.

2. **Copy SAML configuration**
   - From the **Details for Identity Provider** section, copy the following URLs: 
        - **Assertion Consumer Service (ACS) URL**
        - **Login URL**
        - **Logout URL**

    <img src="/images/google-saml/4-lse-saml.png" class="gif-border">

## Step 2: Configure Google Groups and Users

1. **Access Google Admin Console:**
   - Log in to the [Google Admin console](https://admin.google.com/).
   - Go to **Directory** > **Groups**.
 
    <img src="/images/google-saml/9-add-group.png" class="gif-border">

2. **Add a new group:**
   - Click **Create group** and follow the steps to create and save a new group. In this example, the group is named "TestGroup." 
 
    <img src="/images/google-saml/10-add-group-2.png" class="gif-border">

3. **Assign users to the new group:**
   - Go to **Directory** > **Users**.
   - Select the users you want to add to your new group.
   - Select **More options > Add selected users to groups**. 
 
    <img src="/images/google-saml/11-add-group-3.png" class="gif-border">


## Step 3: Configure Google as an Identity Provider (IdP)

1. **Access Google Admin console:**
   - Log in to the [Google Admin console](https://admin.google.com/).
   - Go to **Apps** > **Web and mobile apps**.

    <img src="/images/google-saml/1-web-apps.png" class="gif-border">


2. **Add a new SAML app:**
   - Select **Add App > Add custom SAML app**.
   - Enter a name for the app (e.g. "Label Studio") and click **Continue**.

    <img src="/images/google-saml/2-add-app.png" class="gif-border">

3. **Download IdP metadata:**
   - When given the option, download the IdP metadata file for your new app. This file contains all the necessary information to configure Label Studio.

    <img src="/images/google-saml/3-metadata.png" class="gif-border">
   
4. **Configure SAML settings:**
   - In the **Service Provider Details** section, enter the following:
     - **ACS URL**: Paste the ACS URL copied from Label Studio.
     - **Entity ID**: Use the same URL as the ACS URL.
     - **Start URL**: (Optional) You can leave this blank or use the **Login URL** from Label Studio.
     - **Signed Response**: Leave this unchecked.
   - Click **Continue**.
 
    <img src="/images/google-saml/5-acs-setup.png" class="gif-border">

5. **Map attributes:**
   - In the **Attribute Mapping** section, map the following attributes:
     - **Primary Email**: `Email`
     - **First Name**: `FirstName`
     - **Last Name**: `LastName`
   - Click **Finish**.

    <img src="/images/google-saml/6-atrributes-setup.png" class="gif-border">

## Step 4: Complete configuration in Label Studio

1. **Upload IdP Metadata:**
   - Return to the Label Studio SSO & SAML settings page.
   - Scroll to **Add metadata from Identity Provider**.
   - Upload the IdP metadata file you downloaded from Google Admin console.

    <img src="/images/google-saml/4-lse-saml-add-metadata.png" class="gif-border">

2. **Map Groups and Roles:**
   - Set up group mappings to roles and workspaces as needed. Ensure the group names match those sent by Google in the SAML response.

    <img src="/images/google-saml/14-lse-saml-role-group.png" class="gif-border">

3. **Save Configuration:**
   - Click **Save** to apply the SSO configuration.

## Step 5: Complete configuration in the Google Admin console

1. **Return to the Google Admin console**:
   - From the Google Admin console, go to **Apps** > **Web and mobile apps**.
   - Select the Label Studio app.

    <img src="/images/google-saml/12-assign-group-1.png" class="gif-border">

2. **Assign the Label Studio application to the group:**
    - Click the **User access** card. 
    - Search for and then assign the group to the app. 
    - Enable the **Service status** toggle. 

    <img src="/images/google-saml/13-assign-group-2.png" class="gif-border">
    

## Step 6: Test the configuration

**Log in using SSO:**
   - Navigate to the Label Studio login page.
   - Click the **SSO Login** button and enter your company domain if prompted.
   - You should be redirected to the Google SSO login page. After successful authentication, you will be redirected back to Label Studio.

<img src="/images/google-saml/15-lse-sso-login.png" class="gif-border">

## Additional notes

- If you encounter any issues, verify that the SAML attributes and URLs are correctly configured in both Label Studio and Google Admin Console.

For more detailed information, you can refer to the
- [Label Studio SSO setup guide](auth_setup)
- [Official Google Docs about SAML](https://support.google.com/a/answer/6087519?hl=en#zippy=%2Cstep-add-the-custom-saml-app)
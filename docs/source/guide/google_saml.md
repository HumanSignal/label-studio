---
title: Google SAML SSO Setup Example
short: Google SAML SSO with Label Studio Setup Example
tier: enterprise
order: 253
meta_title: Google SAML SSO with Label Studio Setup Example
meta_description: Label Studio Enterprise documentation for setting up Google as Identity Provider for SAML SSO Setup Example.
hide_sidebar: true
---

## Google Configuration

To configure Google SAML SSO with Label Studio, you need access to the [Google Admin Console](https://admin.google.com/) 
and you should be an owner of the Label Studio organization. 


### Step 1: Get Label Studio ACS endpoints as a Service Provider (SP)

1. **Access Label Studio SSO Settings:**
   - Log in to Label Studio with an account that has the Owner role.
   - Click the menu in the upper left and select **Organization**.
   - Select **SSO & SAML** in the upper right.

2. **Copy SAML Configuration URLs from "Deitals for Identity Provider" section:**
   - Copy the **Assertion Consumer Service (ACS) URL**, **Login URL**, and **Logout URL** from the Label Studio SSO & SAML settings page.

<img src="/images/google-saml/4-lse-saml.png" class="gif-border">

### Step 2: Configure Google Group and User

1. **Access Google Admin Console:**
   - Go to the [Google Admin Console](https://admin.google.com/).
   - Then to the **Directory** > **Groups**.
 
<img src="/images/google-saml/9-add-group.png" class="gif-border">

2. **Add a new group "TestGroup":**
   - Follow instructions and save the new group.
 
<img src="/images/google-saml/10-add-group-2.png" class="gif-border">

2. **Assign users to the new group:**
   - Go to **Directory** > **Users**.
   - Add the group to a user. 
 
<img src="/images/google-saml/11-add-group-3.png" class="gif-border">


### Step 3: Configure Google as an Identity Provider (IdP)

1. **Access Google Admin Console:**
   - Go to the [Google Admin Console](https://admin.google.com/).
   - Navigate to **Apps** > **Web and mobile apps**.

<img src="/images/google-saml/1-web-apps.png" class="gif-border">


2. **Add a New SAML App:**
   - Click the **Add App** button and select **Add custom SAML app**.
   - Enter a name for the app (e.g., "Label Studio") and click **Continue**.

<img src="/images/google-saml/2-add-app.png" class="gif-border">

3. **Download IdP Metadata:**
   - Download the IdP metadata file from Google Admin Console. This file contains the necessary information to configure Label Studio.

<img src="/images/google-saml/3-metadata.png" class="gif-border">
   
4. **Configure SAML Settings:**
   - In the **Service Provider Details** section, enter the following:
     - **ACS URL**: Paste the ACS URL copied from Label Studio.
     - **Entity ID**: Use the same URL as the ACS URL.
     - **Start URL**: (Optional) You can leave this blank or use the Login URL from Label Studio.
     - **Signed Response**: Leave this unchecked.
   - Click **Continue**.
 
<img src="/images/google-saml/5-acs-setup.png" class="gif-border">

5. **Map Attributes:**
   - In the **Attribute Mapping** section, map the following attributes:
     - **Primary Email**: `Email`
     - **First Name**: `FirstName`
     - **Last Name**: `LastName`
   - Click **Finish**.

<img src="/images/google-saml/6-atrributes-setup.png" class="gif-border">

### Step 4: Complete Configuration in Label Studio

1. **Upload IdP Metadata:**
   - Return to the Label Studio SSO & SAML settings page.
   - Scroll to the **Add metadata from Identity Provider**
   - Upload the IdP metadata file downloaded from Google Admin Console.

<img src="/images/google-saml/4-lse-saml-add-metadata.png" class="gif-border">

2. **Map Groups and Roles:**
   - Set up group mappings to roles and workspaces as needed. Ensure the group names match those sent by Google in the SAML response.

<img src="/images/google-saml/14-lse-saml-role-group.png" class="gif-border">

3. **Save Configuration:**
   - Click **Save** to apply the SSO configuration.

4. **Assign Label Studio application to the group:**
   - Go to **Apps** > **Web and mobile apps**.
   - Click on the Label Studio app.
    <img src="/images/google-saml/12-assign-group-1.png" class="gif-border">

    - Click on the "User access" card and assign the group to the app, turn on the "Service status" toggle. 
    <img src="/images/google-saml/13-assign-group-2.png" class="gif-border">
    

### Step 5: Test the Configuration

**Log In Using SSO:**
   - Navigate to the Label Studio login page.
   - Click the **SSO Login** button and enter your company domain if prompted.
   - You should be redirected to the Google SSO login page. After successful authentication, you will be redirected back to Label Studio.

<img src="/images/google-saml/15-lse-sso-login.png" class="gif-border">

### Additional Notes

- If you encounter any issues, verify that the SAML attributes and URLs are correctly configured in both Label Studio and Google Admin Console.

For more detailed information, you can refer to the
- [Label Studio SSO setup guide](https://labelstud.io/guide/auth_setup.html),
- [Official Google Docs about SAML](https://support.google.com/a/answer/6087519?hl=en#zippy=%2Cstep-add-the-custom-saml-app).
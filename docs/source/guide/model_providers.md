---
title: Model provider API keys for organizations
short: Model providers
tier: enterprise
type: guide
hide_menu: false
order: 0
order_enterprise: 361
meta_title: Model providers
meta_description: How to set up model providers for AI features in Label Studio. 
section: "Manage Your Organization"
parent_enterprise: "admin_settings"
date: 2025-02-18 12:03:59
---

To use certain AI features across your organization, you must first set up a model provider. You can set up model providers from **Organization > Settings**.

For example, if you want to interact with an LLM when using the [`<Chat>` tag](/tags/chat.html), you will first need to configure access to the model.


!!! note
    These models are not used with the Label Studio [AI Assistant](ask_ai). 

## About adding model providers

### User access 

Once added, these model providers can be used by anyone in your organization who is also using an AI-powered workflow. 
    
However, only users with access to the organization settings (Owner and Admins) can add and configure models. 

### Whitelisting network access

If you are restricting network access to your resource, you may need to whitelist HumanSignal IP addresses ([IP ranges on SaaS](saas#Outbound-Connections-IP-Addresses)) when configuring network security.

### Approaches

There are two approaches to adding a model provider API key. 

* In one scenario, you get one provider connection per organization, and this provides access to a set of whitelisted models. Examples include:

    * OpenAI
    * Vertex AI
    * Gemini
    * Anthropic

* In the second scenario, you add a separate API key per model. Examples include:

    * Azure OpenAI
    * Azure AI Foundry
    * Custom

{% insertmd includes/base_models.md %}

## Add a model provider

!!! note
    If you have already configured model providers to use with [Prompts](prompts_overview), those will automatically be added to your organization-level providers. 

{% insertmd includes/model_keys.md %}

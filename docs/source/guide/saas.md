---
title: Configuration details of SaaS
short: SaaS configuration
type: guide
tier: enterprise
order: 0
order_enterprise: 96
meta_title: app.humansignal.com Settings
meta_description: This page contains information about the settings that are used on app.humansignal.com, available to HumanSignal SaaS customers.
section: "Install & Setup"
---

This document describes the IP configuration, hostnames, and usage limits that govern the interactions with app.humansignal.com (app.heartex.com).

## Mail configuration

app.humansignal.com (app.heartex.com) sends emails from the `heartex.com` domain by using [SendGrid](https://sendgrid.com/), and has its own dedicated IP addresses:

- `208.117.59.219`

## IP range

app.humansignal.com (app.heartex.com) utilizes the following IP addresses to handle the traffic:

- `34.199.69.93`
- `52.22.82.31`
- `3.233.209.176`

In addition, all outbound connections from our SaaS platform are issued from the following IP addresses (Import/Export, MLBackends):

- `3.219.3.197`
- `34.237.73.3`
- `44.216.17.242`

## Hostname list

For setting up allow-lists in local HTTP(S) proxies, or other web-blocking software on user-end computers, add the following hostnames:

- `app.humansignal.com`

Please note that our documentation and company pages, served via https://app.humansignal.com/docs/api and https://humansignal.com/ respectively, load certain page content directly from commonly used public CDN hostnames.

## Usage Limits

Label Studio imposes rate limits on a per-Access Token basis. If a request exceeds the rate limit, a response with a 429 status code is returned. Clients are advised to pause and retry after a short delay in such instances.

| Path                     | Rate limit                                             |
|--------------------------|--------------------------------------------------------|
| `/api/projects/*/import` | `1 request / 1 second`                                 |
| `/api`                   | `10 requests / 1 second`<br/>`500 requests / 1 minute` |

## Other Operational Limits

| Setting                  | Default Limit |
|--------------------------|---------------|
| Maximum import file size | 200 MB        |
| Timeout for page load    | 90 seconds    |


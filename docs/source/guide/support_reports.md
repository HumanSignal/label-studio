---
title: Support reports
short: Support reports
type: guide
tier: enterprise
order: 0
order_enterprise: 360
meta_title: Support reports
meta_description: Generate anonymized support reports so the HumanSignal team can diagnose issues, tune performance, and suggest better workflows for your Label Studio deployment.
section: "Manage Your Organization"
parent_enterprise: "admin_settings"
---

Support reports give you a **safe, low-friction way to tell us what’s really happening inside your Label Studio Enterprise deployment**—without sharing raw data or project configuration by hand.

They bundle together anonymized operational metrics and environment details that our support and product teams use to:

- Understand where you’re struggling
- Spot bottlenecks and misconfigurations
- Recommend concrete workflow and performance optimizations
- Prioritize features that matter most to you

You stay in control: you can **generate, download, inspect, and optionally share** the report with HumanSignal support.

## What’s inside a support report?

Support reports are designed to be **useful for debugging and planning** while remaining **safe to share**:

- **No raw task data or annotations**  
  Reports never include label text, documents, images, audio, or annotation payloads.

- **Operational metrics and usage patterns**  
  For example (exact sections may evolve over time):
  - Active users and seats over time
  - Project and task volumes
  - Queue sizes and processing rates
  - Common labeling operations and feature usage

- **Environment profile**  
  High-level information about:
  - Deployment type (cloud / on‑prem)
  - Versions of Label Studio and Label Studio Enterprise
  - Connected services (databases, storage backends) at the level of types and configuration flags, not credentials

- **Integrity safeguards**  
  The JSON payload includes an **encrypted checksum embedded in `metadata["id"]`**.  
  This helps us verify that a report hasn’t been accidentally or intentionally modified after it was generated.

Because the report is just a **ZIP file with a JSON document inside**, you can open it locally, feed it to your internal tooling, or attach it directly to a ticket.

## Why use support reports?

Support reports are built to answer a simple question:

> “How can we help you **get more value** from Label Studio with **less guesswork**?”

Some concrete benefits:

- **Faster, more precise support**  
  Instead of long back-and-forth threads (“How many tasks?”, “Which queues?”, “What version?”), we can often see the picture immediately and go straight to recommendations or fixes.

- **Workflow tuning and best practices**  
  Reports show patterns like:
  - Overloaded projects or queues
  - Underused features that could simplify your setup
  - Imbalanced reviewer/annotator ratios
  
  This lets us suggest **structure changes** (projects, roles, review flows) that reduce friction for your team.

- **Performance and capacity planning**  
  Signals like task volume, throughput, and concurrency help us:
  - Identify bottlenecks in your current deployment
  - Recommend scaling strategies and configuration tweaks
  - Validate whether your infrastructure matches your growth plans

- **Product feedback with real context**  
  When you request a new feature, support reports give our product team anonymized context about:
  - How you’re using current features
  - Which parts of the platform are central to your workflows
  - Where the rough edges are likely to show up at scale

The result: **better answers today, and a better product tomorrow.**

## Where to find support reports

You can access support reports from the organization settings:

1. Go to **Organization → Settings**.
2. Open the **Support reports** tab (visible for Owners, and in some deployments Admins).

From here you can:

- See a **history of previously generated reports**
- Create a **new report on demand**
- Download an existing report as a ZIP file
- Trigger manual **HTTP** or **email** delivery (if configured)

## How to generate a support report

To generate a new support report:

1. Navigate to **Organization → Settings → Support reports**.
2. Click **Generate support report**.
3. Wait for the report status to move from `pending` → `running` → `completed`.  
   - For large installations this might take a few minutes.
4. Once completed, you can:
   - Download the ZIP directly.
   - Trigger delivery via email or HTTP, if those options are enabled.

Behind the scenes:

- A background job collects data from multiple sections.
- A JSON payload is assembled with metadata and section results.
- An encrypted checksum is embedded in the JSON.
- The payload is zipped and stored via Django’s default storage backend.

## Privacy and security

Support reports are intentionally conservative:

- **No PII or content:**  
  No label text, images, audio, or user names. Only aggregated and anonymized statistics.

- **Configuration without secrets:**  
  Environment details focus on **what** is enabled and **how** the system is configured, not on credentials, keys, or proprietary URLs.

- **You control what is shared:**  
  - Reports are generated inside your deployment.
  - You can download and inspect the JSON yourself.
  - You decide whether and how to share the ZIP with HumanSignal.

- **Integrity protection:**  
  The embedded checksum helps us confirm that the report we receive matches exactly what was generated from your instance.

If you need even stricter controls (for example, internal review and approval workflows before anything is shared), support reports are easy to plug into those processes because they are:

- Plain JSON + ZIP files
- Generated on demand
- Fully inspectable by your security and compliance teams

## When should you generate a support report?

We recommend generating a support report when:

- You open a **support ticket** about:
  - Performance (slow queues, timeouts, sluggish UI)
  - Errors that are hard to reproduce
  - Unclear behavior in complex projects or workflows
- You’re planning a **scale-up or migration** and want guidance:
  - Moving to larger datasets
  - Adding new teams or projects
  - Tightening SLAs for labeling turnaround time
- You want a **health check** on your deployment:
  - Are we using Label Studio efficiently?
  - Do our workflows align with best practices?

In many cases, attaching a fresh support report to your initial ticket lets us skip several diagnostic steps and go straight to **suggested fixes and improvements**.

## Next steps

- Turn on the **Support reports** feature for your organization if it’s not already enabled.
- Generate a report and **review the JSON** with your team to see what’s being captured.
- The next time you reach out to HumanSignal support, consider including a fresh support report—  
  it’s one of the fastest ways for us to **understand your world and help you improve it.**



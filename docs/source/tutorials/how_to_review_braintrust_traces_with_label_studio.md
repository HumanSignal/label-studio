---
title: How to Review Braintrust Traces with Label Studio
hide_sidebar: true
order: 1006
open_in_collab: true
tutorial: true
community_author: nass600
ipynb_repo_path: tutorials/how-to-review-braintrust-traces-with-label-studio/how_to_review_braintrust_traces_with_label_studio.ipynb
repo_url: https://github.com/HumanSignal/awesome-label-studio-tutorials/tree/main/tutorials/how-to-review-braintrust-traces-with-label-studio
report_bug_url: https://github.com/HumanSignal/awesome-label-studio-tutorials/issues/new
thumbnail: /images/tutorials/tutorials-review-braintrust-traces.png
meta_title: How to Review Braintrust Traces with Label Studio
meta_description: Learn how to pull Braintrust LLM traces into Label Studio Enterprise and annotate them with a custom ReactCode UI.
is_enterprise: true
badges: SDK, Braintrust, LLM Observability, Eval, Agents, Colab
duration: 10-15 mins
---

## 0. Label Studio Requirements

This tutorial uses **ReactCode templates**, a feature available in **Label Studio Enterprise only**. ReactCode allows you to build fully custom React-based annotation interfaces — in this case, a 3-panel trace review UI. We recommend [connecting with our team](https://humansignal.com/contact-sales/) to request a trial or to enable them in your account.

After section 2, you will need a running Label Studio Enterprise instance and an API key from your account settings.


## 1. Installation & Setup

First, install the required dependencies:

```python
!pip -q install requests label-studio-sdk python-dotenv braintrust braintrust-api braintrust-langchain langchain langchain-anthropic anthropic langgraph
```

### Environment Configuration

Create a `.env` file in the repository root (or the same directory as this notebook) with the following variables:

```bash
# Label Studio Enterprise
LABEL_STUDIO_HOST=http://localhost:8080       # or your LS Enterprise instance URL
LABEL_STUDIO_API_KEY=your_label_studio_api_key

# Braintrust
BRAINTRUST_API_KEY=your_braintrust_api_key
BRAINTRUST_PROJECT=your_project_name          # project name for tracing and fetching

# Anthropic (only needed for Section 3a sample trace generation)
ANTHROPIC_API_KEY=your_anthropic_api_key
```

**Braintrust Setup**: Visit [Braintrust Documentation](https://www.braintrustdata.com/docs) to create an account, get your API key, and set up a project for tracing.

**Label Studio Setup**: Visit [Label Studio Documentation](https://labelstud.io/guide/access_tokens) for installation instructions and how to generate an API token from your account settings.


```python
import os
from dotenv import load_dotenv

# Load .env from current directory or repository root
load_dotenv(override=True)
load_dotenv(os.path.join(os.path.dirname(os.getcwd()), '.env'), override=True)

# Label Studio Enterprise
LABEL_STUDIO_HOST = os.getenv('LABEL_STUDIO_HOST', 'http://localhost:8080')
LABEL_STUDIO_API_KEY = os.getenv('LABEL_STUDIO_API_KEY', '')

# Braintrust
BRAINTRUST_API_KEY = os.getenv('BRAINTRUST_API_KEY', '')
BRAINTRUST_PROJECT = os.getenv('BRAINTRUST_PROJECT', '')

# Anthropic (only needed for sample trace generation in Section 3a)
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')

print('LABEL_STUDIO_HOST:', LABEL_STUDIO_HOST)
print('BRAINTRUST_PROJECT:', BRAINTRUST_PROJECT or '(not set)')
print('Has LABEL_STUDIO_API_KEY?', bool(LABEL_STUDIO_API_KEY))
print('Has BRAINTRUST_API_KEY?', bool(BRAINTRUST_API_KEY))
print('Has ANTHROPIC_API_KEY?', bool(ANTHROPIC_API_KEY))
```
## Setup: The Evaluation Pipeline

This tutorial connects Braintrust's engineering-centric observability tooling with Label Studio's expert evaluation interface:

**Step 1: Trace Collection in Braintrust**
- Braintrust captures detailed LLM traces including inputs, outputs, tool calls, and timing
- Engineer-centric interface for technical debugging and iteration
- BTQL-powered queries let you filter and inspect any subset of traces

**Step 2: Expert Evaluation in Label Studio**
- Import traces from Braintrust into Label Studio as structured annotation tasks
- Domain experts evaluate each turn using the custom ReactCode UI
- Collaborative workflow: multiple SMEs can annotate the same traces
- Structured output feeds directly into quality reports, prompt improvements, and LLM-as-a-judge pipelines


## 2. Label Studio ReactCode Config

> **Skip the setup — clone the project directly**
>
> The pre-configured project below includes the full 3-panel ReactCode annotation interface ready to use. Click the button to clone it into your Label Studio Enterprise account and jump straight to importing your Braintrust traces in Section 4.
>
> <a href="https://app.humansignal.com/b/MTY1Mw==?p=e"
>   target="_blank" rel="noopener" aria-label="Open in Label Studio" style="all:unset;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;border:1px solid rgb(109,135,241);padding:8px 12px;background:rgb(87 108 193);color:white;font-weight:500;font-family:sans-serif;gap:6px;transition:background 0.2s ease;" onmouseover="this.style.background='rgb(97 122 218)'" onmouseout="this.style.background='rgb(87 108 193)'">
>   <svg style="width:20px;height:20px" viewBox="0 0 26 26" fill="none"><path fill="#FFBAAA" d="M3.5 4.5h19v18h-19z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M25.7 7.503h-7.087V5.147H7.588V2.792h11.025V.436H25.7v7.067Zm-18.112 0H5.225v10.994H2.863V7.503H.5V.436h7.088v7.067Zm0 18.061v-7.067H.5v7.067h7.088ZM25.7 18.497v7.067h-7.088v-2.356H7.588v-2.355h11.025v-2.356H25.7Zm-2.363 0V7.503h-2.363v10.994h2.363Z" fill="#FF7557"/></svg>
>   <span style="font-size:14px">Open in Label Studio</span>
>   <svg style="width:16px;height:16px" viewBox="0 0 24 24"><path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" fill="white"/></svg>
> </a>
>
> If you prefer to configure the project programmatically, follow the rest of this section.

This tutorial uses a **ReactCode** label configuration — a Label Studio Enterprise feature that lets you embed a custom React component as your annotation interface.

The UI has three panels:

| Panel | Purpose |
|---|---|
| **Turns** (left) | Scrollable list of all turns. Filter by role, search by content. Each card shows role, tool badges, latency, and verdict once annotated. |
| **Turn Details** (center) | Full content, tool call inputs/outputs, token usage, latency, and Claude's extended thinking (when present). |
| **Annotation** (right) | Structured form for evaluating each turn — see annotation model below. |

**Annotation model — what you capture per turn:**
- **Verdict** — Pass or Fail
- **Issue tags** — taxonomy across 5 categories: Accuracy & Faithfulness, Tool & Retrieval, Reasoning & Planning, Response Quality, Safety & Compliance
- **Severity** — Critical / Major / Minor / Suggestion
- **Expected behavior** — free text: what should the agent have done instead?
- **Comments** — any additional notes

A **trace-level verdict** (Pass / Fail / Mixed) in the bottom bar captures overall conversation quality, independent of individual turn verdicts.

<div style="text-align: center; margin: 20px 0;">
  <img src="https://hs-sandbox-pub.s3.us-east-1.amazonaws.com/blogs-draft/tutorial-llm-reactcode-braintrust.png" alt="ReactCode 3-panel trace review UI for Braintrust" style="max-width: 1000px; width: 100%; height: auto; border: 1px solid #ddd; border-radius: 8px;">
</div>


```python
# ReactCode 3-panel trace annotation config (self-contained — no external files needed)
# The full ~40KB React component is inlined as _TEMPLATE_JS (see notebook for complete code).

_TEMPLATE_JS = r"""function TraceAnnotator({ React, addRegion, regions, data }) {
  // 736-line React component defining the 3-panel trace review UI.
  // Panels: Turns list (left) | Turn details (center) | Annotation form (right)
  // Bottom bar: turn statistics + trace-level verdict (Pass / Fail / Mixed)
  // ... see notebook for the full implementation ...
}"""

LABEL_CONFIG_XML = (
    '<View>\n'
    '  <ReactCode style="height: 95vh" name="trace" toName="trace"'
    ' outputs=\'{"trace_id":"string","turn_id":"string","turn_role":"string",'
    '"verdict":"string","failure_modes":"array","severity":"string",'
    '"expected_behavior":"string","comments":"string"}\'>\n'
    '    <![CDATA[\n    '
) + _TEMPLATE_JS + (
    '\n    ]]>\n'
    '  </ReactCode>\n'
    '</View>'
)
print(LABEL_CONFIG_XML[:300] + '\n...')
```
## 3. Generate Sample Traces (Optional)

If you already have traces in Braintrust, **skip this section** — set `GENERATE_TRACES = False` and go directly to Section 4.

Otherwise, this cell creates a ReAct agent with multiple tools and runs 4 multi-turn conversations using **Claude with extended thinking** to produce realistic traces in your Braintrust project. Requires `ANTHROPIC_API_KEY`.

Extended thinking lets Claude reason through complex, ambiguous problems step-by-step before responding. The thinking content is captured in the trace and visible in the Label Studio UI.


```python
GENERATE_TRACES = True  # Set to False if you already have traces in Braintrust

if GENERATE_TRACES:
    import braintrust
    from braintrust_langchain import BraintrustCallbackHandler, set_global_handler
    from langchain_core.tools import tool
    from langchain_core.messages import HumanMessage
    from langchain_anthropic import ChatAnthropic
    from langchain.agents import create_agent

    if not ANTHROPIC_API_KEY:
        raise RuntimeError('ANTHROPIC_API_KEY is required. Set it in your .env or set GENERATE_TRACES=False.')
    if not BRAINTRUST_PROJECT:
        raise RuntimeError('BRAINTRUST_PROJECT is required. Set it in your .env file.')

    # Initialize Braintrust logger + LangChain callback handler
    braintrust.init_logger(project=BRAINTRUST_PROJECT, api_key=BRAINTRUST_API_KEY)
    handler = BraintrustCallbackHandler()
    set_global_handler(handler)

    @tool
    def calculator(expression: str) -> str:
        """Evaluate a math expression."""
        try:
            return str(eval(expression))
        except Exception as e:
            return f"Error: {e}"

    @tool
    def search_knowledge_base(query: str) -> str:
        """Search an internal knowledge base for company policies, products, or procedures."""
        kb = {
            "refund": "Refund policy: Full refund within 30 days. After 30 days, store credit only. Damaged items: full refund at any time with photo evidence.",
            "shipping": "Standard (5-7 days, free over $50), Express (2-3 days, $12.99), Overnight ($24.99).",
            "warranty": "1-year limited warranty. 2-year extended warranty available for $29.99.",
            "pricing": "Base $99/mo (10 users), Pro $249/mo (50 users), Enterprise custom. Annual billing saves 20%.",
        }
        results = [v for k, v in kb.items() if k in query.lower()]
        return results[0] if results else f"No results found for: {query}"

    @tool
    def get_weather(city: str) -> str:
        """Get current weather for a city."""
        weather_data = {
            "new york": "New York: 72°F, Partly Cloudy, Humidity 65%, Wind 8 mph SW",
            "london": "London: 58°F, Overcast, Humidity 80%, Wind 12 mph W",
            "tokyo": "Tokyo: 82°F, Clear, Humidity 55%, Wind 5 mph NE",
            "paris": "Paris: 63°F, Light Rain, Humidity 75%, Wind 10 mph NW",
        }
        return weather_data.get(city.lower(), f"Weather data not available for {city}")

    # Claude with extended thinking — produces richer traces that surface the model's reasoning
    llm = ChatAnthropic(
        model='claude-sonnet-4-5-20250929',
        max_tokens=16000,
        thinking={'type': 'enabled', 'budget_tokens': 5000},
    )
    agent = create_agent(llm, [calculator, search_knowledge_base, get_weather])

    # 4 multi-turn conversations designed to elicit extended thinking:
    # conflicting policies, ambiguous constraints, and multi-step reasoning
    conversations = [
        ["I bought a product 37 days ago with a manufacturing defect and an extended warranty. What are all my options?",
         "The item costs $289. Can I use store credit toward a new extended warranty while keeping the original warranty claim open?"],
        ["We have 60 employees — 40 need full access, 20 need read-only. How do we minimize cost?",
         "If we commit to annual billing and add 15 more full-access users next quarter, what's our 12-month total?"],
        ["I'm planning a 20-person client retreat. Compare Tokyo, London, and New York on weather and logistics.",
         "12 attendees are in New York, 8 in London. Re-evaluate the three options for minimal travel disruption."],
        ["I ordered 3 items for $180 with express shipping. One arrived damaged — I need a replacement urgently.",
         "If I return the damaged item and pay for express shipping on the replacement, what's my net out-of-pocket?"],
    ]

    for i, conv_messages in enumerate(conversations, 1):
        print(f"\n--- Conversation {i} ---")

        @braintrust.traced(name=f"conversation_{i}")
        def run_conversation(messages):
            chat_history = []
            for msg_text in messages:
                print(f"  User: {msg_text[:80]}...")
                chat_history.append(HumanMessage(content=msg_text))
                result = agent.invoke({'messages': chat_history})
                chat_history = result['messages']
                reply = result['messages'][-1].content
                if isinstance(reply, list):
                    reply = ' '.join(b.get('text', '') for b in reply if isinstance(b, dict) and b.get('type') == 'text')
                print(f"  Assistant: {str(reply)[:100]}...")
            return reply

        run_conversation(conv_messages)

    braintrust.flush()
    print(f'\n✓ Generated {len(conversations)} traces. Proceed to Section 4.')
else:
    print('Skipped trace generation. Proceed to Section 4.')
```
## 4. Braintrust API Client

Fetches traces (spans) from Braintrust using the REST API with BTQL queries. Spans are grouped by `root_span_id` into traces.


```python
import requests
from braintrust_api import Braintrust
from typing import Any, Dict, List, Optional


class BraintrustClient:
    """Fetches traces from Braintrust via the REST API + BTQL."""

    API_URL = 'https://api.braintrust.dev'

    def __init__(self, api_key: str, project_name: str):
        self.api_key = api_key
        self.project_name = project_name
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }
        self.project_id = self._resolve_project_id()

    def _resolve_project_id(self) -> str:
        """Look up the project ID by name."""
        client = Braintrust(api_key=self.api_key)
        for project in client.projects.list():
            if project.name == self.project_name:
                return project.id
        raise ValueError(f'Project "{self.project_name}" not found in Braintrust.')

    def _btql(self, query: str) -> List[Dict[str, Any]]:
        """Execute a BTQL query and return results."""
        r = requests.post(
            f'{self.API_URL}/btql',
            headers=self.headers,
            json={'query': query, 'fmt': 'json'},
            timeout=60,
        )
        r.raise_for_status()
        return r.json().get('data', [])

    def list_traces(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Fetch recent traces (top-level spans) from the project."""
        query = f"""SELECT id, span_id, root_span_id, input, output, metadata, metrics,
                            scores, created, span_attributes, error
                     FROM project_logs('{self.project_id}')
                     WHERE span_id = root_span_id
                     ORDER BY created DESC
                     LIMIT {limit}"""
        return self._btql(query)

    def get_trace_spans(self, root_span_id: str) -> List[Dict[str, Any]]:
        """Fetch all spans belonging to a trace (by root_span_id)."""
        query = f"""SELECT id, span_id, root_span_id, span_parents, input, output,
                            metadata, metrics, scores, created, span_attributes, error
                     FROM project_logs('{self.project_id}')
                     WHERE root_span_id = '{root_span_id}'
                     ORDER BY created ASC
                     LIMIT 200"""
        return self._btql(query)


if not BRAINTRUST_API_KEY:
    raise RuntimeError('Missing BRAINTRUST_API_KEY — set it in your .env file.')

bt = BraintrustClient(BRAINTRUST_API_KEY, BRAINTRUST_PROJECT)
print(f'Braintrust client ready — project: {BRAINTRUST_PROJECT} (ID: {bt.project_id})')
```
## 5. Normalize Braintrust Traces → Unified Schema

Braintrust stores traces as a flat list of spans with typed `span_attributes` (`llm`, `tool`, `task`, `function`). This cell extracts the relevant spans and maps them into a flat sequence of turns — the same schema used by all three platform integrations — so the ReactCode UI doesn't need to know which platform the trace came from.

Each turn carries: `role`, `content`, `tool_name`, `tool_input`, `tool_calls`, `model`, `usage` (token counts), `duration_ms`, and `thinking` (Claude extended thinking blocks, when present).


```python
import json as _json


def _to_str(x):
    if x is None: return ''
    if isinstance(x, str): return x
    try: return _json.dumps(x, indent=2, default=str)
    except: return str(x)


def _extract_content(obj):
    if obj is None: return ''
    if isinstance(obj, str): return obj
    if isinstance(obj, dict):
        for key in ('content', 'text', 'input', 'output', 'result'):
            if isinstance(obj.get(key), str) and obj[key].strip():
                return obj[key]
        return _to_str(obj)
    if isinstance(obj, list):
        parts = [_extract_content(item) for item in obj if _extract_content(item).strip()]
        return '\n'.join(parts) if parts else _to_str(obj)
    return str(obj)


def _duration_ms_from_metrics(metrics):
    """Compute duration from Braintrust metrics.start / metrics.end (Unix seconds)."""
    if not isinstance(metrics, dict): return None
    start, end = metrics.get('start'), metrics.get('end')
    if start is not None and end is not None:
        try: return int((float(end) - float(start)) * 1000)
        except: pass
    return None


def _split_thinking(content):
    """Split Anthropic extended-thinking content blocks into (text, thinking)."""
    if isinstance(content, str): return content, None
    if isinstance(content, list):
        text_parts, thinking_parts = [], []
        for block in content:
            if isinstance(block, dict):
                if block.get('type') == 'thinking': thinking_parts.append(block.get('thinking', ''))
                elif block.get('type') == 'text': text_parts.append(block.get('text', ''))
            elif isinstance(block, str): text_parts.append(block)
        return '\n\n'.join(text_parts), '\n\n'.join(thinking_parts) or None
    return str(content) if content else '', None


def normalize_braintrust_trace(root_span, all_spans):
    """Convert Braintrust spans into the unified trace schema.

    Span types:
      - type=llm  → extract user messages from input + assistant response from output
      - type=tool → extract tool execution as a tool turn
      - type=task, type=function → skip (structural wrappers)
    """
    trace_id = root_span.get('span_id') or root_span.get('id', '')
    spans_sorted = sorted(all_spans, key=lambda s: s.get('created') or '')
    turns = []
    turn_counter = 0
    seen_user_messages = set()

    def add_turn(role, content, **kwargs):
        nonlocal turn_counter
        if not content or not content.strip(): return
        turn = {'turn_id': f'turn_{turn_counter}', 'role': role, 'content': content.strip(),
                'timestamp': kwargs.get('timestamp', '')}
        for k in ('model', 'usage', 'tool_calls', 'tool_name', 'tool_input', 'duration_ms', 'thinking'):
            if kwargs.get(k) is not None: turn[k] = kwargs[k]
        turns.append(turn)
        turn_counter += 1

    for span in spans_sorted:
        attrs = span.get('span_attributes') or {}
        stype = (attrs.get('type') or '').lower()
        ts = span.get('created') or ''
        duration = _duration_ms_from_metrics(span.get('metrics'))
        inp, out = span.get('input'), span.get('output')
        span_metrics = span.get('metrics') or {}

        if stype == 'llm':
            messages = inp
            if isinstance(messages, list) and messages and isinstance(messages[0], list):
                messages = messages[0]
            if isinstance(messages, list):
                for msg in messages:
                    if isinstance(msg, dict) and msg.get('role') in ('user', 'human'):
                        content = msg.get('content', '')
                        if isinstance(content, list):
                            content = ' '.join(p.get('text', '') if isinstance(p, dict) else str(p) for p in content)
                        if content and content.strip():
                            msg_key = content[:200]
                            if msg_key not in seen_user_messages:
                                seen_user_messages.add(msg_key)
                                add_turn('user', content, timestamp=ts)

            raw_content, tool_calls = '', []
            if isinstance(out, dict):
                gens = out.get('generations')
                if isinstance(gens, list) and gens and isinstance(gens[0], list) and gens[0]:
                    gen = gens[0][0]
                    if isinstance(gen, dict):
                        message = gen.get('message') or gen
                        raw_content = message.get('content', '') or ''
                        for tc in (message.get('additional_kwargs') or {}).get('tool_calls') or []:
                            if isinstance(tc, dict):
                                func = tc.get('function') or {}
                                tool_calls.append({'tool_name': func.get('name') or 'unknown',
                                                   'input': _to_str(func.get('arguments') or ''),
                                                   'call_id': tc.get('id', '')})

            assistant_content, thinking = _split_thinking(raw_content)
            usage = None
            if span_metrics.get('prompt_tokens') or span_metrics.get('completion_tokens'):
                usage = {'input_tokens': span_metrics.get('prompt_tokens', 0),
                         'output_tokens': span_metrics.get('completion_tokens', 0)}

            if assistant_content and assistant_content.strip():
                add_turn('assistant', assistant_content, timestamp=ts,
                         model=attrs.get('name') or '', usage=usage,
                         tool_calls=tool_calls if tool_calls else None,
                         duration_ms=duration, thinking=thinking)

        elif stype == 'tool':
            tool_name = attrs.get('name') or 'unknown'
            tool_output = (out.get('content', '') or _extract_content(out)) if isinstance(out, dict) else _extract_content(out)
            if tool_output:
                add_turn('tool', tool_output, timestamp=ts, tool_name=tool_name,
                         tool_input=_to_str(inp) if inp else '', duration_ms=duration)

    if not turns:
        if root_input := _extract_content(root_span.get('input')):
            add_turn('user', root_input, timestamp=root_span.get('created', ''))
        if root_output := _extract_content(root_span.get('output')):
            add_turn('assistant', root_output, timestamp=root_span.get('created', ''))

    return {
        'trace_id': str(trace_id),
        'session_id': str(trace_id),
        'metadata': {
            'name': (root_span.get('span_attributes') or {}).get('name') or root_span.get('id', ''),
            'source': 'braintrust',
            'tags': root_span.get('tags') or [],
            'start_time': root_span.get('created') or '',
            'scores': root_span.get('scores') or {},
        },
        'turns': turns,
    }


print('✓ Normalization functions defined')
```
## 6. Fetch, Normalize, and Import into Label Studio

Fetches traces from Braintrust, normalizes them, creates a Label Studio project with the ReactCode config, and imports the tasks.


```python
from label_studio_sdk import LabelStudio
from label_studio_sdk.core.request_options import RequestOptions
from typing import Any, Dict, List

_REQUEST_OPTS = RequestOptions(timeout_in_seconds=120)


def create_project(ls_host: str, api_key: str, title: str, label_config: str) -> int:
    client = LabelStudio(base_url=ls_host, api_key=api_key)
    project = client.projects.create(title=title, label_config=label_config, request_options=_REQUEST_OPTS)
    return int(project.id)


def import_tasks(ls_host: str, api_key: str, project_id: int, tasks: List[Dict[str, Any]]) -> Any:
    client = LabelStudio(base_url=ls_host, api_key=api_key)
    return client.projects.import_tasks(id=project_id, request=tasks, return_task_ids=True)


if not LABEL_STUDIO_API_KEY:
    raise RuntimeError('Missing LABEL_STUDIO_API_KEY — set it in your .env file.')

# 1) Fetch traces from Braintrust
root_spans = bt.list_traces(limit=20)

if not root_spans:
    raise RuntimeError('No traces returned. Run Section 3 to generate sample traces.')

print(f'Fetched {len(root_spans)} root spans from Braintrust')

# 2) Normalize — only include traces with child spans
tasks: List[Dict[str, Any]] = []
skipped = 0
for root in root_spans:
    root_span_id = root.get('span_id') or root.get('root_span_id')
    if not root_span_id:
        continue
    all_spans = bt.get_trace_spans(root_span_id)
    if len(all_spans) <= 1:
        skipped += 1
        continue
    normalized = normalize_braintrust_trace(root, all_spans)
    if normalized['turns']:
        tasks.append({'data': normalized})
        print(f"  + Trace {root_span_id[:12]}... -> {len(normalized['turns'])} turns "
              f"({sum(1 for t in normalized['turns'] if t['role']=='user')} user, "
              f"{sum(1 for t in normalized['turns'] if t['role']=='assistant')} assistant, "
              f"{sum(1 for t in normalized['turns'] if t['role']=='tool')} tool)")

if skipped:
    print(f'  (skipped {skipped} traces without child spans)')
print(f'\nPrepared {len(tasks)} tasks for import')

# 3) Create project and import
project_id = create_project(
    ls_host=LABEL_STUDIO_HOST,
    api_key=LABEL_STUDIO_API_KEY,
    title=f'Braintrust Trace Review ({BRAINTRUST_PROJECT})',
    label_config=LABEL_CONFIG_XML,
)
print(f'Created project: {project_id}')

resp = import_tasks(LABEL_STUDIO_HOST, LABEL_STUDIO_API_KEY, project_id, tasks)
print(f'Imported {len(tasks)} tasks')
print(f'\nDone! Open your project: {LABEL_STUDIO_HOST.rstrip("/")}/projects/{project_id}')
```
## What's Next

- **Start annotating**: Open the project link above and click through traces in the ReactCode UI
- **Share with SMEs**: Invite domain experts to your Label Studio project for collaborative evaluation
- **Incremental sync**: Re-run sections 4–6 periodically to pull new traces
- **Export annotations**: Use the Label Studio SDK or REST API to pull structured annotations for downstream analysis or fine-tuning
- **Custom taxonomy**: Edit the `_TEMPLATE_JS` variable in the label config cell to add failure modes specific to your domain
- **LangSmith / Langfuse**: See companion tutorials for other observability platforms


## Summary

This tutorial demonstrated the complete workflow from Braintrust traces to expert evaluation:

1. ✓ Set up environment with Braintrust and Label Studio Enterprise
2. ✓ Defined a ReactCode-based 3-panel annotation UI (Enterprise feature)
3. ✓ Ran a multi-tool ReAct agent with Claude extended thinking to generate realistic traces
4. ✓ Fetched traces from Braintrust via REST API + BTQL
5. ✓ Normalized Braintrust spans into a unified trace schema
6. ✓ Created a Label Studio project and imported traces as annotation tasks

### Key Takeaway

Braintrust excels at trace storage and BTQL-powered querying during development. Label Studio Enterprise provides the collaborative, expert-driven evaluation framework — with the ReactCode interface giving domain experts an intuitive turn-by-turn review experience. The two tools complement each other throughout the AI development lifecycle.


## References

- [Braintrust](https://www.braintrustdata.com/docs)
- [Label Studio](https://docs.humansignal.com/guide/)
- [Label Studio ReactCode Templates](https://docs.humansignal.com/guide/react_code)
- [Label Studio SDK](https://labelstud.io/sdk/)
- [Companion tutorials: LangSmith](how_to_review_langsmith_traces_with_label_studio.html) | [Langfuse](how_to_review_langfuse_traces_with_label_studio.html)

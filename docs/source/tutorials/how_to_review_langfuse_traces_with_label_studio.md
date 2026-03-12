---
title: How to Review Langfuse Traces with Label Studio
hide_sidebar: true
order: 1008
open_in_collab: true
tutorial: true
community_author: nass600
ipynb_repo_path: tutorials/how-to-review-langfuse-traces-with-label-studio/how_to_review_langfuse_traces_with_label_studio.ipynb
repo_url: https://github.com/HumanSignal/awesome-label-studio-tutorials/tree/main/tutorials/how-to-review-langfuse-traces-with-label-studio
report_bug_url: https://github.com/HumanSignal/awesome-label-studio-tutorials/issues/new
thumbnail: /images/tutorials/tutorials-review-langfuse-traces.png
meta_title: How to Review Langfuse Traces with Label Studio
meta_description: Learn how to pull Langfuse LLM traces into Label Studio Enterprise and annotate them with a custom ReactCode UI.
is_enterprise: true
badges: SDK, Langfuse, LLM Observability, Eval, Agents, Colab
duration: 10-15 mins
---

## 0. Label Studio Requirements

This tutorial uses **ReactCode templates**, a feature available in **Label Studio Enterprise only**. ReactCode allows you to build fully custom React-based annotation interfaces — in this case, a 3-panel trace review UI. We recommend [connecting with our team](https://humansignal.com/contact-sales/) to request a trial or to enable them in your account.

After section 2, you will need a running Label Studio Enterprise instance and an API key from your account settings.


## 1. Installation & Setup

First, install the required dependencies:

```python
!pip -q install requests label-studio-sdk python-dotenv langfuse langchain langchain-anthropic anthropic langgraph
```

### Environment Configuration

Create a `.env` file in the repository root (or the same directory as this notebook) with the following variables:

```bash
# Label Studio Enterprise
LABEL_STUDIO_HOST=http://localhost:8080       # or your LS Enterprise instance URL
LABEL_STUDIO_API_KEY=your_label_studio_api_key

# Langfuse
LANGFUSE_BASE_URL=https://cloud.langfuse.com  # or your self-hosted Langfuse URL
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
LANGFUSE_SECRET_KEY=your_langfuse_secret_key
LANGFUSE_PROJECT=your_project_name            # project name (for display in Label Studio)

# Anthropic (only needed for Section 3a sample trace generation)
ANTHROPIC_API_KEY=your_anthropic_api_key
```

> **Note:** Langfuse API keys (public + secret key pair) are already scoped to a specific project, so `LANGFUSE_PROJECT` is used as a display name only — no project ID resolution needed.

**Langfuse Setup**: Visit [Langfuse Documentation](https://langfuse.com/docs) to create an account, generate an API key pair, and note your project's base URL.

**Label Studio Setup**: Visit [Label Studio Documentation](https://labelstud.io/guide/access_tokens) for installation instructions and how to generate an API token from your account settings.


```python
import os
from dotenv import load_dotenv

load_dotenv(override=True)
load_dotenv(os.path.join(os.path.dirname(os.getcwd()), '.env'), override=True)

# Label Studio Enterprise
LABEL_STUDIO_HOST = os.getenv('LABEL_STUDIO_HOST', 'http://localhost:8080')
LABEL_STUDIO_API_KEY = os.getenv('LABEL_STUDIO_API_KEY', '')

# Langfuse
LANGFUSE_BASE_URL = os.getenv('LANGFUSE_BASE_URL', 'https://cloud.langfuse.com')
LANGFUSE_PUBLIC_KEY = os.getenv('LANGFUSE_PUBLIC_KEY', '')
LANGFUSE_SECRET_KEY = os.getenv('LANGFUSE_SECRET_KEY', '')
LANGFUSE_PROJECT = os.getenv('LANGFUSE_PROJECT', '')

# Anthropic (only needed for sample trace generation in Section 3a)
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')

print('LABEL_STUDIO_HOST:', LABEL_STUDIO_HOST)
print('LANGFUSE_BASE_URL:', LANGFUSE_BASE_URL)
print('LANGFUSE_PROJECT:', LANGFUSE_PROJECT or '(not set — will fetch all traces)')
print('Has LABEL_STUDIO_API_KEY?', bool(LABEL_STUDIO_API_KEY))
print('Has LANGFUSE keys?', bool(LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY))
print('Has ANTHROPIC_API_KEY?', bool(ANTHROPIC_API_KEY))
```
## Setup: The Evaluation Pipeline

This tutorial connects Langfuse's engineering-centric observability tooling with Label Studio's expert evaluation interface:

**Step 1: Trace Collection in Langfuse**
- Langfuse captures LLM traces as typed observations (`GENERATION`, `TOOL`, `SPAN`, `CHAIN`)
- Engineer-centric interface for debugging, scoring, and iteration
- Project-scoped API keys make authentication straightforward — no project ID lookup needed

**Step 2: Expert Evaluation in Label Studio**
- Import traces from Langfuse into Label Studio as structured annotation tasks
- Domain experts evaluate each turn using the custom ReactCode UI
- Collaborative workflow: multiple SMEs can annotate the same traces
- Structured output feeds directly into quality reports, prompt improvements, and LLM-as-a-judge pipelines


## 2. Label Studio ReactCode Config

> **Skip the setup — clone the project directly**
>
> The pre-configured project below includes the full 3-panel ReactCode annotation interface ready to use. Click the button to clone it into your Label Studio Enterprise account and jump straight to importing your Langfuse traces in Section 4.
>
> <a href="https://app.humansignal.com/b/MTY1MQ==?p=e"
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
  <img src="https://hs-sandbox-pub.s3.us-east-1.amazonaws.com/blogs-draft/tutorial-llm-reactcode-langfuse.png" alt="ReactCode 3-panel trace review UI for Langfuse" style="max-width: 1000px; width: 100%; height: auto; border: 1px solid #ddd; border-radius: 8px;">
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

If you already have traces in Langfuse, **skip this section** — set `GENERATE_TRACES = False` and go directly to Section 4.

Otherwise, this cell creates a ReAct agent with multiple tools and runs 4 multi-turn conversations using **Claude with extended thinking** to produce realistic traces in your Langfuse project. Requires `ANTHROPIC_API_KEY`.

Extended thinking lets Claude reason through complex, ambiguous problems step-by-step before responding. The thinking content is captured in the trace and visible in the Label Studio UI.


```python
GENERATE_TRACES = True  # Set to False if you already have traces in Langfuse

if GENERATE_TRACES:
    from langchain_core.tools import tool
    from langchain_core.messages import HumanMessage
    from langchain_anthropic import ChatAnthropic
    from langchain.agents import create_agent
    from langfuse.langchain import CallbackHandler
    from langfuse import get_client

    if not ANTHROPIC_API_KEY:
        raise RuntimeError('ANTHROPIC_API_KEY is required. Set it in your .env or set GENERATE_TRACES=False.')

    langfuse = get_client()

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

    # 4 multi-turn conversations designed to elicit extended thinking
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

    # Langfuse instruments each conversation via a CallbackHandler passed to the agent
    for i, conv_messages in enumerate(conversations, 1):
        print(f"\n--- Conversation {i} ---")
        handler = CallbackHandler()
        chat_history = []
        for msg_text in conv_messages:
            print(f"  User: {msg_text[:80]}...")
            chat_history.append(HumanMessage(content=msg_text))
            result = agent.invoke({'messages': chat_history}, config={'callbacks': [handler]})
            chat_history = result['messages']
            reply = result['messages'][-1].content
            if isinstance(reply, list):
                reply = ' '.join(b.get('text', '') for b in reply if isinstance(b, dict) and b.get('type') == 'text')
            print(f"  Assistant: {str(reply)[:100]}...")
        langfuse.flush()

    print(f'\n✓ Generated {len(conversations)} traces. Proceed to Section 4.')
else:
    print('Skipped trace generation. Proceed to Section 4.')
```
## 4. Langfuse API Client

Fetches traces and observations from the Langfuse REST API. Your API keys are already scoped to a specific Langfuse project, so all traces returned belong to that project.


```python
import base64
from typing import Any, Dict, List, Optional
import requests


def _basic_auth(public_key: str, secret_key: str) -> str:
    token = base64.b64encode(f'{public_key}:{secret_key}'.encode('utf-8')).decode('utf-8')
    return f'Basic {token}'


class LangfuseClient:
    def __init__(self, base_url: str, public_key: str, secret_key: str):
        self.base_url = base_url.rstrip('/')
        self.s = requests.Session()
        self.s.headers.update({
            'Authorization': _basic_auth(public_key, secret_key),
            'Content-Type': 'application/json'
        })

    def list_traces(self, limit: int = 20, page: int = 1,
                    from_ts: Optional[str] = None, to_ts: Optional[str] = None) -> Dict[str, Any]:
        url = f'{self.base_url}/api/public/traces'
        params: Dict[str, Any] = {'limit': limit, 'page': page, 'fields': 'core'}
        if from_ts: params['fromTimestamp'] = from_ts
        if to_ts: params['toTimestamp'] = to_ts
        r = self.s.get(url, params=params, timeout=60)
        r.raise_for_status()
        return r.json()

    def get_trace(self, trace_id: str) -> Dict[str, Any]:
        r = self.s.get(f'{self.base_url}/api/public/traces/{trace_id}', timeout=60)
        r.raise_for_status()
        return r.json()

    def list_observations_v2(self, trace_id: str, limit: int = 200) -> List[Dict[str, Any]]:
        """Fetch observations for a trace via v1 API (avoids v2 parseIoAsJson 400)."""
        url = f'{self.base_url}/api/public/observations'
        out: List[Dict[str, Any]] = []
        page, page_size = 1, min(max(limit, 1), 100)
        while True:
            r = self.s.get(url, params={'traceId': trace_id, 'page': page, 'limit': page_size}, timeout=60)
            r.raise_for_status()
            data = r.json().get('data') or []
            out.extend(data)
            if len(data) < page_size: break
            page += 1
        return out


lf = LangfuseClient(LANGFUSE_BASE_URL, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY)
print('Langfuse client ready')
```
## 5. Normalize Langfuse Traces → Unified Schema

Langfuse stores traces as typed observations (`GENERATION`, `TOOL`, `SPAN`, `CHAIN`). This cell extracts the relevant observation types and maps them into a flat sequence of turns — the same schema used by all three platform integrations — so the ReactCode UI doesn't need to know which platform the trace came from.

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


def _normalize_usage(obs):
    """Extract token usage from a Langfuse observation."""
    raw = obs.get('usageDetails') or obs.get('usage')
    if not isinstance(raw, dict): return None
    return {
        'input_tokens': raw.get('inputTokens') or raw.get('input_tokens') or raw.get('input') or 0,
        'output_tokens': raw.get('outputTokens') or raw.get('output_tokens') or raw.get('output') or 0,
    }


def _duration_ms(start_str, end_str):
    if not start_str or not end_str: return None
    try:
        from datetime import datetime
        def _parse(s): return datetime.fromisoformat(str(s).replace('Z', '+00:00'))
        return int((_parse(end_str) - _parse(start_str)).total_seconds() * 1000)
    except: return None


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


def normalize_langfuse_trace(trace, observations):
    """Convert a Langfuse trace + observations into the unified schema.

    Observation types:
      - GENERATION → extract user messages from input + assistant response from output
      - TOOL       → extract tool execution as a tool turn
      - CHAIN, SPAN, AGENT → skip (structural wrappers)
    """
    trace_id = trace.get('id') or trace.get('traceId')
    obs_sorted = sorted(observations, key=lambda o: o.get('startTime') or o.get('createdAt') or '')
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

    for obs in obs_sorted:
        otype = (obs.get('type') or '').upper()
        ts = obs.get('startTime') or obs.get('createdAt') or ''
        duration = _duration_ms(obs.get('startTime') or obs.get('createdAt'), obs.get('endTime'))
        inp, out = obs.get('input'), obs.get('output')

        if otype == 'GENERATION':
            if isinstance(inp, list):
                for msg in inp:
                    if isinstance(msg, dict) and msg.get('role') == 'user':
                        content = msg.get('content', '')
                        if isinstance(content, list):
                            content = ' '.join(p.get('text', '') if isinstance(p, dict) else str(p) for p in content)
                        if content and content.strip():
                            msg_key = content[:200]
                            if msg_key not in seen_user_messages:
                                seen_user_messages.add(msg_key)
                                add_turn('user', content, timestamp=ts)

            if isinstance(out, dict):
                raw_content = out.get('content', '')
                tool_calls = []
                for tc in out.get('tool_calls', []):
                    if isinstance(tc, dict):
                        tool_calls.append({'tool_name': tc.get('name', 'unknown'),
                                           'input': _to_str(tc.get('args', tc.get('input', ''))),
                                           'call_id': tc.get('id', '')})

                assistant_content, thinking = _split_thinking(raw_content)
                if assistant_content and assistant_content.strip():
                    add_turn('assistant', assistant_content, timestamp=ts,
                             model=obs.get('model') or obs.get('providedModelName'),
                             usage=_normalize_usage(obs),
                             tool_calls=tool_calls if tool_calls else None,
                             duration_ms=duration, thinking=thinking)

        elif otype == 'TOOL':
            tool_name = obs.get('name') or 'unknown'
            tool_output = _extract_content(out) if out else ''
            if tool_output:
                add_turn('tool', tool_output, timestamp=ts, tool_name=tool_name,
                         tool_input=_to_str(inp) if inp else '', duration_ms=duration)

    if not turns:
        if trace_input := _extract_content(trace.get('input')):
            add_turn('user', trace_input, timestamp=trace.get('timestamp') or '')
        if trace_output := _extract_content(trace.get('output')):
            add_turn('assistant', trace_output, timestamp=trace.get('timestamp') or '')

    return {
        'trace_id': str(trace_id),
        'session_id': str(trace.get('sessionId') or trace_id),
        'metadata': {
            'name': trace.get('name'),
            'source': 'langfuse',
            'tags': trace.get('tags') or [],
            'start_time': trace.get('timestamp') or trace.get('createdAt') or '',
        },
        'turns': turns,
    }


print('✓ Normalization functions defined')
```
## 6. Fetch, Normalize, and Import into Label Studio

Fetches traces from Langfuse, normalizes them, creates a Label Studio project with the ReactCode config, and imports the tasks.


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

# 1) Fetch traces from Langfuse
traces_payload = lf.list_traces(limit=20, page=1)
traces_list = traces_payload.get('data') or traces_payload.get('traces') or []

if not traces_list:
    raise RuntimeError('No traces returned. Run Section 3 to generate sample traces.')

print(f'Fetched {len(traces_list)} traces from Langfuse')

# 2) Normalize each trace
tasks: List[Dict[str, Any]] = []
for t in traces_list:
    tid = t.get('id') or t.get('traceId')
    if not tid:
        continue
    full_trace = lf.get_trace(str(tid))
    obs = lf.list_observations_v2(str(tid))
    normalized = normalize_langfuse_trace(full_trace, obs)
    if normalized['turns']:
        tasks.append({'data': normalized})
        print(f"  + Trace {tid[:12]}... -> {len(normalized['turns'])} turns "
              f"({sum(1 for t in normalized['turns'] if t['role']=='user')} user, "
              f"{sum(1 for t in normalized['turns'] if t['role']=='assistant')} assistant, "
              f"{sum(1 for t in normalized['turns'] if t['role']=='tool')} tool)")

print(f'\nPrepared {len(tasks)} tasks for import')

# 3) Create project and import
project_id = create_project(
    ls_host=LABEL_STUDIO_HOST,
    api_key=LABEL_STUDIO_API_KEY,
    title=f'Langfuse Trace Review ({LANGFUSE_PROJECT})',
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
- **Braintrust / LangSmith**: See companion tutorials for other observability platforms


## Summary

This tutorial demonstrated the complete workflow from Langfuse traces to expert evaluation:

1. ✓ Set up environment with Langfuse and Label Studio Enterprise
2. ✓ Defined a ReactCode-based 3-panel annotation UI (Enterprise feature)
3. ✓ Ran a multi-tool ReAct agent with Claude extended thinking — Langfuse captured traces via `CallbackHandler`
4. ✓ Fetched traces from Langfuse using the REST API with Basic Auth
5. ✓ Normalized typed observations (`GENERATION`, `TOOL`) into a unified trace schema
6. ✓ Created a Label Studio project and imported traces as annotation tasks

### Key Takeaway

Langfuse excels at typed observation storage and project-scoped API access during development. Label Studio Enterprise provides the collaborative, expert-driven evaluation framework — with the ReactCode interface giving domain experts an intuitive turn-by-turn review experience. The two tools complement each other throughout the AI development lifecycle.


## References

- [Langfuse](https://langfuse.com/docs)
- [Label Studio](https://docs.humansignal.com/guide/)
- [Label Studio ReactCode Templates](https://docs.humansignal.com/guide/react_code)
- [Label Studio SDK](https://labelstud.io/sdk/)
- [Companion tutorials: Braintrust](how_to_review_braintrust_traces_with_label_studio.html) | [LangSmith](how_to_review_langsmith_traces_with_label_studio.html)

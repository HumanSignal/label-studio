---
title: How to Embed Evaluation Workflows in Your Research Stack with Label Studio
hide_sidebar: true
order: 999
open_in_collab: true
tutorial: true
community_author: bmartel
ipynb_repo_path: tutorials/how-to-embed-evaluation-workflows-in-your-research-stack-with-label-studio/how_to_embed_evaluation_workflows_in_your_research_stack_with_Label_Studio.ipynb
repo_url: https://github.com/HumanSignal/awesome-label-studio-tutorials/tree/main/tutorials/how-to-embed-evaluation-workflows-in-your-research-stack-with-label-studio
report_bug_url: https://github.com/HumanSignal/awesome-label-studio-tutorials/issues/new
thumbnail: /images/tutorials/tutorials-eval-flows-research-stack.png
meta_title: How to Embed Evaluation Workflows in Your Research Stack with Label Studio
meta_description: Learn how to build an embedded evaluation workflow directly into your jupyer notebook with Label Studio.
is_enterprise: true
badges: SDK, Embed, Colab
duration: 10-15 mins
---
## Label Studio Requirements

This tutorial showcases one or more features available only in Label Studio Enterprise. We recommend [connecting with our team](https://humansignal.com/contact-sales/) to request a trial or to enable them in your account.

## The Context-Switching Tax

You're deep in a Jupyter notebook, fine-tuning a medical LLM. Results look promising, but you need human evaluation before shipping.

The usual drill: export outputs to CSV, upload to evaluation platform, assign tasks, wait for results, download CSV, merge back with your data, re-import to notebook for analysis. By then, you've lost your flow state.

**What if evaluation lived in your notebook?** No exports. No context switches. Just evaluate, analyze, iterate.

## What We're Building

Over the next 15-20 minutes, you'll build an embedded evaluation workflow that:

1. **Loads real medical Q&A data** from Hugging Face (100 tasks)
2. **Creates a structured evaluation interface** with custom criteria
3. **Embeds Label Studio directly in this notebook** for zero-context-switch evaluation
4. **Exports to pandas** for instant analysis and visualization
5. **Generates insights** about model performance across medical specialties

**Real-world scenario**: You're evaluating GPT-5's responses to patient medical questions. You need domain experts to rate accuracy, safety, completeness, and helpfulness—then immediately analyze patterns to inform the next training iteration.

By the end, you'll have a template you can adapt for any evaluation workflow: content moderation, prompt testing, data quality checks, or model comparison studies.

---

## ⚠️ Requirements & Roles

This tutorial has two parts:

### 👤 **Part 1: Admin Setup (One-Time, ~5 minutes)**
Your Label Studio **Owner/Admin** needs to:
- Enable embedding for your organization ([request access](https://humansignal.com/contact-sales/))
- Run Part 1 to generate keys and configure organization
- **Share the private key** with ML engineers (via secure channel)

**Credentials needed:**
- `LABEL_STUDIO_API_KEY` - Admin/Owner API token
- `LABEL_STUDIO_URL` - Your LSE instance URL

### 🔬 **Part 2: ML Engineer Workflow (~15 minutes)**
Any team member can run Part 2 repeatedly with:
- `LABEL_STUDIO_API_KEY` - Your personal API token (any role)
- `LABEL_STUDIO_URL` - Your LSE instance URL  
- `EMBED_PRIVATE_KEY` - Private key shared by admin (from Part 1)

**If you're an admin**: Run both parts end-to-end.  
**If you're an ML engineer**: Get the private key from your admin, set all three env vars, then skip to Part 2.

**How to set credentials:**
- **Colab**: Click 🔑 → Add secrets → Toggle "Notebook access" ON
- **Local Jupyter**: `export LABEL_STUDIO_API_KEY="..." EMBED_PRIVATE_KEY="..."`

Let's get started.

# 🛠️ Setup (Required for Everyone)

Whether you're an admin or ML engineer, run these cells first to install dependencies and configure credentials.



```python
# Install what we need
%pip install -q label-studio-sdk pandas matplotlib seaborn cryptography PyJWT datasets requests python-dotenv

# Import everything
import os, json, pandas as pd, matplotlib.pyplot as plt, seaborn as sns
from datetime import datetime, timedelta
import jwt, base64, time
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from IPython.display import HTML, display, Markdown
from label_studio_sdk.client import LabelStudio
from datasets import load_dataset
import warnings; warnings.filterwarnings('ignore')

# Set style for better visualizations
sns.set_theme(style="whitegrid", palette="husl")
plt.rcParams['figure.figsize'] = (12, 6)

```

## 🔐 Configure Credentials

Set your environment variables based on your role:

**👤 Admins (running Part 1 + 2):**
```bash
export LABEL_STUDIO_API_KEY="your_admin_token"
export LABEL_STUDIO_URL="https://app.humansignal.com"
```

**🔬 ML Engineers (running Part 2 only):**
```bash
export LABEL_STUDIO_API_KEY="your_personal_token"
export LABEL_STUDIO_URL="https://app.humansignal.com"
export EMBED_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

**Using Google Colab?**  
Click the 🔑 icon in the sidebar → Add secrets → Toggle "Notebook access" ON for each



```python
%pip install python-dotenv

# Load configuration with Google Colab Secrets support + fallback
IS_GOOGLE_COLAB = False

# Load from .env file if available (for local development)
try:
    from dotenv import load_dotenv
    load_dotenv()
except:
    pass  # dotenv not installed, will use system env vars

def get_credential(key, default=None):
    global IS_GOOGLE_COLAB
    """Get credential from Colab Secrets first, then environment variables"""
    try:
        # Try Google Colab Secrets first (most secure)
        from google.colab import userdata
        IS_GOOGLE_COLAB = True
        return userdata.get(key)
    except:
        from os import environ
        IS_GOOGLE_COLAB = False
        # Fallback to environment variables (for local Jupyter)
        return environ.get(key, default)
```


```python
LABEL_STUDIO_URL = get_credential('LABEL_STUDIO_URL', 'https://app.humansignal.com')
API_KEY = get_credential('LABEL_STUDIO_API_KEY')

# Validate required credentials
missing_vars = []
if not API_KEY:
    missing_vars.append('LABEL_STUDIO_API_KEY')

if missing_vars:
    display(HTML(f"""
    <div style="padding: 15px; background: #f8d7da; color: #856404; border: 1px solid #f5c6cb; border-radius: 5px;">
        <strong>❌ Missing Credentials</strong><br>
        Please set your credentials using one of these methods:<br><br>

        <strong>🔒 Google Colab (Recommended):</strong><br>
        1. Click the 🔑 key icon in the left sidebar<br>
        2. Add secret: <code>LABEL_STUDIO_API_KEY</code><br>
        3. Toggle "Notebook access" ON for the secret<br><br>

        <strong>💻 Local Jupyter:</strong><br>
        <code>
        export LABEL_STUDIO_API_KEY="your_admin_api_key_here"
        </code><br><br>

        <strong>Missing:</strong> {', '.join(missing_vars)}<br>
        <small><strong>Why Colab Secrets?</strong> More secure than environment variables, encrypted storage, no code exposure</small>
    </div>
    """))
else:
    # Determine which method was used
    method = "Google Colab Secrets" if IS_GOOGLE_COLAB else "Environment Variables"

    display(HTML(f"""
    <div style="padding: 15px; background: #d4edda; color: #155724; border: 1px solid #c3e6cb; border-radius: 5px;">
        <strong>✅ Credentials Loaded</strong><br>
        • Method: {method}<br>
        • URL: {LABEL_STUDIO_URL}<br>
        • API Key: {'*' * (len(API_KEY) - 4) + API_KEY[-4:] if len(API_KEY) > 4 else '****'}
    </div>
    """))

```

---

# 👤 Part 1: Admin Setup (One-Time Configuration)

**👋 ML Engineers**: If your admin already configured embedding, **skip to Part 2** below.

**👋 Admins**: This 5-minute setup enables your entire team to embed Label Studio in notebooks.

**👤 ADMIN ONLY - Run Once**: Generate keys and configure your organization for embedding.

After running this cell:
1. **Copy the private key** using the button below
2. **Store it securely** (password manager, secrets vault, etc.)
3. **Share with your team** so they can set `EMBED_PRIVATE_KEY` in their environment

**🔬 ML ENGINEERS**: If you already have the `EMBED_PRIVATE_KEY` from your admin, skip to **Part 2** below.



```python
def generate_rsa_key_pair():
    """Generate a new RSA key pair for JWT signing"""
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return private_pem, public_pem, base64.b64encode(public_pem).decode('utf-8')

def configure_embed_settings(ls_client, public_key_b64, organization_id):
    """Configure organization embedding settings (requires Owner role)"""
    try:
        embed_settings = {
            "public_verify_key": public_key_b64,
            "public_verify_alg": ["RS256"]
        }

        embed_domains = [
            {"domain": "colab.research.google.com"},
            {"domain": "localhost"},
            {"domain": "127.0.0.1"},
        ]

        ls_client.organizations.update(
            id=organization_id,
            embed_settings=embed_settings,
            embed_domains=embed_domains
        )

        return True, "Embedding configured successfully"

    except Exception as e:
        return False, f"Configuration failed: {str(e)}"

# ADMIN ONLY: Generate new key pair and configure organization
# This creates a NEW private key - only do this once!
private_key_pem, public_key_pem, public_key_b64 = generate_rsa_key_pair()

display(HTML("""
<div style="padding: 15px; background: #e7f3ff; color: #004085; border: 1px solid #b8daff; border-radius: 5px; margin: 10px 0;">
    <strong>🔑 Generating secure keys...</strong>
</div>
"""))

# Get current user and organization info
try:
    from label_studio_sdk.client import LabelStudio
    ls = LabelStudio(base_url=LABEL_STUDIO_URL, api_key=API_KEY)
    current_user = ls.users.whoami()
    user_email = current_user.email
    organization_id = current_user.active_organization

    # Configure organization with the public key
    success, message = configure_embed_settings(ls, public_key_b64, organization_id)

    if success:
        # Display success with copy-to-clipboard button for private key
        private_key_str = private_key_pem.decode('utf-8')

        display(HTML(f"""
        <div style="padding: 15px; background: #d4edda; color: #155724; border: 1px solid #c3e6cb; border-radius: 5px;">
            <strong>✅ Organization configured for embedding!</strong><br><br>

            <strong>📋 ADMIN: Save this private key for your team</strong><br>
            <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0; font-family: monospace; font-size: 11px; max-height: 150px; overflow-y: auto; white-space: pre-wrap; word-break: break-all;">
{private_key_str}</div>

            <button onclick="navigator.clipboard.writeText(`{private_key_str}`).then(() => {{
                this.textContent = '✅ Copied!';
                setTimeout(() => this.textContent = '📋 Copy Private Key', 2000);
            }})" style="padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; margin: 5px 0;">
                📋 Copy Private Key
            </button>

            <br><br>
            <strong>⚠️ Next steps for your team:</strong><br>
            1. Store this private key securely (password manager, secrets vault)<br>
            2. Share it with ML engineers who will use embedding<br>
            3. They should set: <code>export EMBED_PRIVATE_KEY="&lt;key_above&gt;"</code><br>
            4. Configuration applied to organization: {organization_id}
        </div>
        """))
    else:
        display(HTML(f"""
        <div style="padding: 15px; background: #f8d7da; color: #856404; border: 1px solid #f5c6cb; border-radius: 5px;">
            <strong>❌ Configuration failed</strong><br>
            {message}<br><br>
            This usually means you need Owner role permissions.<br>
            Contact your Label Studio admin to configure embedding.
        </div>
        """))

except Exception as e:
    display(HTML(f"""
    <div style="padding: 15px; background: #f8d7da; color: #856404; border: 1px solid #f5c6cb; border-radius: 5px;">
        <strong>❌ Error:</strong> {str(e)}
    </div>
    """))
```

---

# 🔬 Part 2: ML Engineer Workflow

**This is the main workflow.** Once your admin has configured embedding (Part 1), you can run this section repeatedly for any evaluation project.

**What you need:**
- Your personal Label Studio API token (not admin required)
- Access to your Label Studio Enterprise instance
- This takes ~15 minutes first time, ~5 minutes for subsequent projects

## Connect to Label Studio

Set your credentials and connect:


**🔬 ML ENGINEERS START HERE**: This cell generates your embed token using the private key.

Make sure you have `EMBED_PRIVATE_KEY` set (get it from your admin who ran Part 1).


```python
# ML ENGINEERS: Generate embed token using private key from environment
# This works whether you're an admin running the full notebook OR an ML engineer with the shared key

def generate_embed_token(user_email, organization_id, private_key_pem, expires_in_hours=24):
    """Generate JWT token for embedding authentication"""
    payload = {
        'user_email': user_email,
        'organization_id': str(organization_id),
        'embed_context': 'app',  # For notebook usage (VSCode/Cursor/Colab)
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=expires_in_hours)
    }
    return jwt.encode(payload, private_key_pem, algorithm='RS256')

# Check if we have a private key (either from Part 1 or from environment)
EMBED_PRIVATE_KEY = get_credential('EMBED_PRIVATE_KEY')

if not EMBED_PRIVATE_KEY:
    # If no private key in environment, check if we just generated one in Part 1
    try:
        # If admin ran Part 1, private_key_pem will exist from that cell
        if 'private_key_pem' not in locals():
            raise NameError("private_key_pem not found")
        EMBED_PRIVATE_KEY = private_key_pem.decode('utf-8') if isinstance(private_key_pem, bytes) else private_key_pem
    except NameError:
        display(HTML(f"""
        <div style="padding: 15px; background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; border-radius: 5px;">
            <strong>⚠️ Private key not found</strong><br><br>

            <strong>Option 1 - ML Engineers (recommended):</strong><br>
            Get the private key from your admin and set:<br>
            <code>export EMBED_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----"</code><br><br>

            <strong>Option 2 - Admins:</strong><br>
            Run <strong>Part 1</strong> above to generate keys and configure your organization.<br><br>

            Then re-run this cell.
        </div>
        """))
        raise Exception("EMBED_PRIVATE_KEY not found. Please set it or run Part 1 first.")

# Convert string key to bytes if needed
if isinstance(EMBED_PRIVATE_KEY, str):
    private_key_bytes = EMBED_PRIVATE_KEY.encode('utf-8')
else:
    private_key_bytes = EMBED_PRIVATE_KEY

# Connect to Label Studio and generate embed token
try:
    from label_studio_sdk.client import LabelStudio
    ls = LabelStudio(base_url=LABEL_STUDIO_URL, api_key=API_KEY)

    # Get current user information
    current_user = ls.users.whoami()
    user_email = current_user.email
    organization_id = current_user.active_organization

    if not organization_id:
        raise Exception("Could not determine organization ID. Please ensure you're a member of an organization.")
    if not user_email:
        raise Exception("Could not determine user email. Please check your API key permissions.")

    # Generate embed token for this user
    embed_token = generate_embed_token(user_email, organization_id, private_key_bytes)

    display(HTML(f"""
    <div style="padding: 15px; background: #d4edda; color: #155724; border: 1px solid #c3e6cb; border-radius: 5px;">
        <strong>✅ Ready to embed!</strong><br>
        • Connected as: {user_email}<br>
        • Organization: {organization_id}<br>
        • Embed token: Generated (valid for 24 hours)<br>
        • You can now create projects and embed evaluation interfaces
    </div>
    """))

except Exception as e:
    display(HTML(f"""
    <div style="padding: 15px; background: #f8d7da; color: #856404; border: 1px solid #f5c6cb; border-radius: 5px;">
        <strong>❌ Connection failed</strong><br>
        {str(e)}<br><br>
        <strong>Common issues:</strong><br>
        • Check your API key is valid<br>
        • Verify environment variables are set correctly<br>
        • Ensure you have access to your organization
    </div>
    """))

```

# 🏗️ Load Dataset

We'll use the **MedQuAD** dataset - a collection of medical questions and answers from trusted sources like NIH and CDC. This simulates the evaluation scenario of assessing an LLM's ability to answer patient health questions.



```python
# Load medical Q&A dataset from HuggingFace
display(HTML("""
<div style="padding: 15px; background: #e7f3ff; color: #004085; border: 1px solid #b8daff; border-radius: 5px;">
    <strong>📥 Loading medical Q&A dataset...</strong>
</div>
"""))

dataset = load_dataset("medalpaca/medical_meadow_medqa", split="train")
sample_size = 100

tasks = []
for i, item in enumerate(dataset.select(range(sample_size))):
    question = item.get("input", "")
    reference_answer = item.get("output", "")
    instruction = item.get("instruction", "")

    # Use the reference answer as our "model response" for this tutorial
    # In production, you'd replace this with your actual LLM's output
    model_response = reference_answer

    # Extract or infer medical specialty
    # The instruction field often contains specialty context
    specialty = "General Medicine"  # default

    if instruction:
        # Check if instruction contains specialty keywords
        instruction_lower = instruction.lower()
        if any(word in instruction_lower for word in ['cardio', 'heart']):
            specialty = "Cardiology"
        elif any(word in instruction_lower for word in ['ortho', 'bone', 'joint']):
            specialty = "Orthopedics"
        elif any(word in instruction_lower for word in ['derm', 'skin']):
            specialty = "Dermatology"
        elif any(word in instruction_lower for word in ['psych', 'mental']):
            specialty = "Psychiatry"
        elif any(word in instruction_lower for word in ['ped', 'child']):
            specialty = "Pediatrics"
        elif any(word in instruction_lower for word in ['neuro', 'brain']):
            specialty = "Neurology"

    tasks.append({
        "id": i + 1,
        "question": question,
        "reference_answer": reference_answer,
        "model_response": model_response,
        "medical_specialty": specialty
    })

display(HTML(f"""
<div style="padding: 15px; background: #d4edda; color: #155724; border: 1px solid #c3e6cb; border-radius: 5px;">
    <strong>✅ Dataset loaded: {len(tasks)} medical Q&A pairs</strong><br>
    • Source: Medical Meadow MedQA (medalpaca)<br>
    • Questions: Real patient medical questions<br>
    • Reference Answers: Expert medical responses<br>
    • Ready for evaluation
</div>
"""))


```

# 🏷️ Create Project

We will create a Label Studio Enterprise project with a labelling config that will allow us to evaluate the responses.


```python
labeling_config = """
<View>
  <Style>
    .lsf-main-content {
      padding: var(--spacing-800);
      max-width: 100%;
    }
    .section {
      background: var(--color-neutral-surface);
      padding: var(--spacing-800);
      border-radius: var(--corner-radius-medium);
      margin: var(--spacing-800) 0;
      border: 1px solid var(--color-neutral-border);
      box-shadow: 0 2px 4px rgba(var(--color-neutral-shadow-raw) / 0.1);
    }
    .specialty-badge {
      background: linear-gradient(135deg, var(--color-accent-grape-bold), var(--color-primary-surface));
      color: var(--color-primary-surface-content);
      padding: var(--spacing-200) var(--spacing-800);
      border-radius: 25px;
      display: inline-block;
      font-weight: var(--font-weight-semibold);
      margin-bottom: var(--spacing-1000);
      font-size: var(--font-size-body-small);
      box-shadow: 0 4px 6px rgba(var(--color-neutral-shadow-raw) / 0.2);
    }
    .question-section {
      background: var(--color-warning-background);
      padding: var(--spacing-800);
      border-radius: var(--corner-radius-medium);
      border-left: 5px solid var(--color-warning-border);
      margin: var(--spacing-600) 0;
    }
    .response-section {
      background: var(--color-primary-background);
      padding: var(--spacing-800);
      border-radius: var(--corner-radius-medium);
      border-left: 5px solid var(--color-primary-border);
      margin: var(--spacing-600) 0;
    }
    .reference-section {
      background: var(--color-positive-background);
      padding: var(--spacing-800);
      border-radius: var(--corner-radius-medium);
      border-left: 5px solid var(--color-positive-border);
      margin: var(--spacing-600) 0;
    }
    .rating-item {
      background: var(--color-neutral-surface);
      padding: var(--spacing-800);
      border-radius: var(--corner-radius-medium);
      margin: var(--spacing-600) 0;
      border: 1px solid var(--color-neutral-border);
    }
    .decision-section {
      background: var(--color-neutral-surface);
      padding: var(--spacing-1000);
      border-radius: var(--corner-radius-medium);
      margin: var(--spacing-800) 0;
      border: 2px solid var(--color-primary-border-subtler);
    }
    .section-title {
      color: var(--color-neutral-content);
      margin-bottom: var(--spacing-600);
    }
    .section-subtitle {
      color: var(--color-neutral-content-subtle);
      font-size: var(--font-size-body-smaller);
      margin-bottom: var(--spacing-400);
    }
    .helper-text {
      color: var(--color-neutral-content-subtler);
      font-style: italic;
      margin-bottom: var(--spacing-800);
    }
  </Style>

  <Header value="🏥 Medical LLM Response Evaluation" size="2" style="text-align: center; margin-bottom: var(--spacing-1000); font-weight: var(--font-weight-bold);"/>

  <!-- Medical Specialty Badge -->
  <View className="specialty-badge">
    <Text name="specialty_display" value="🔬 $medical_specialty" />
  </View>

  <!-- Question Section -->
  <View className="section">
    <Header value="❓ Patient Question" size="3" className="section-title"/>
    <View className="question-section">
      <Text name="question_display" value="$question" style="font-size: var(--font-size-body-small); line-height: 1.6;"/>
    </View>
  </View>

  <!-- Model Response Section -->
  <View className="section">
    <Header value="🤖 Model Response (Evaluate This)" size="3" className="section-title"/>
    <View className="response-section">
      <Text name="model_response_display" value="$model_response" style="font-size: var(--font-size-body-small); line-height: 1.6;"/>
    </View>
  </View>

  <!-- Reference Answer Section -->
  <View className="section">
    <Header value="✅ Reference Answer (Gold Standard)" size="3" className="section-title"/>
    <View className="reference-section">
      <Text name="reference_display" value="$reference_answer" style="font-size: var(--font-size-body-small); line-height: 1.6;"/>
    </View>
  </View>

  <!-- Evaluation Criteria -->
  <View className="section">
    <Header value="📊 Evaluation Criteria" size="3" className="section-title"/>
    <Text name="helper_text_display" value="Rate each dimension on a scale of 1-5 stars" className="helper-text"/>

    <View className="rating-item">
      <Header value="🎯 Medical Accuracy" size="4" className="section-title"/>
      <Text name="accuracy_help" value="Is the medical information factually correct and evidence-based?" className="section-subtitle"/>
      <Rating name="medical_accuracy" toName="model_response_display" maxRating="5" icon="star" size="large" perRegion="false" required="true"/>
    </View>

    <View className="rating-item">
      <Header value="🛡️ Safety" size="4" className="section-title"/>
      <Text name="safety_help" value="Is the advice safe? Could following this response cause harm to the patient?" className="section-subtitle"/>
      <Rating name="safety" toName="model_response_display" maxRating="5" icon="star" size="large" perRegion="false" required="true"/>
    </View>

    <View className="rating-item">
      <Header value="✔️ Completeness" size="4" className="section-title"/>
      <Text name="completeness_help" value="Does it fully address all parts of the patient's question?" className="section-subtitle"/>
      <Rating name="completeness" toName="model_response_display" maxRating="5" icon="star" size="large" perRegion="false" required="true"/>
    </View>

    <View className="rating-item">
      <Header value="💡 Helpfulness" size="4" className="section-title"/>
      <Text name="helpfulness_help" value="Would this response actually help the patient understand and take appropriate action?" className="section-subtitle"/>
      <Rating name="helpfulness" toName="model_response_display" maxRating="5" icon="star" size="large" perRegion="false" required="true"/>
    </View>
  </View>

  <!-- Overall Decision -->
  <View className="decision-section">
    <Header value="🎯 Final Decision" size="3" className="section-title"/>
    <Text name="decision_help" value="Based on your evaluation, what should happen with this response?" className="section-subtitle"/>

    <Choices name="recommendation" toName="model_response_display" choice="single" showInline="false" required="true" layout="vertical">
      <Choice value="approve" hint="Medically accurate, safe, complete, and helpful"/>
      <Choice value="approve_with_minor_edits" hint="Good overall but needs small improvements"/>
      <Choice value="needs_major_revision" hint="Significant issues that must be addressed"/>
      <Choice value="reject" hint="Contains serious errors, unsafe advice, or is unhelpful"/>
    </Choices>
  </View>

  <!-- Issues Identification (Conditional) -->
  <View className="section" visibleWhen="choice-selected">
    <Header value="🔍 Specific Issues (Select all that apply)" size="4" className="section-title"/>

    <Choices name="issues" toName="model_response_display" choice="multiple" showInline="false" layout="vertical">
      <Choice value="factually_incorrect" hint="Contains medically inaccurate information"/>
      <Choice value="incomplete_answer" hint="Missing critical information"/>
      <Choice value="potentially_harmful" hint="Could lead to harmful actions"/>
      <Choice value="off_topic" hint="Doesn't address the actual question"/>
      <Choice value="unclear_confusing" hint="Difficult to understand or ambiguous"/>
      <Choice value="outdated_guidance" hint="Based on outdated medical knowledge"/>
      <Choice value="inappropriate_scope" hint="Goes beyond appropriate scope (e.g., diagnoses when shouldn't)"/>
    </Choices>
  </View>

  <!-- Evaluator Notes -->
  <View className="section">
    <Header value="📝 Additional Notes (Optional)" size="4" className="section-title"/>
    <Text name="notes_help" value="Share specific concerns, corrections needed, or suggestions for improvement" className="section-subtitle"/>
    <TextArea name="evaluator_notes"
              toName="model_response_display"
              placeholder="Example: 'The dosage recommendation is incorrect - should be 500mg, not 1000mg' or 'Missing important warning about drug interactions'"
              rows="5" maxSubmissions="1" editable="true"/>
  </View>
</View>
"""
try:
    project = ls.projects.create(
        title="Medical LLM Evaluation - Tutorial",
        label_config=labeling_config,
        sampling="Sequential sampling"  # Tasks presented in order
    )

    # Configure project for manual task assignment (required for the tutorial workflow)
    # This allows us to fetch and load tasks programmatically via the SDK
    try:
        updated_project = ls.projects.update(
            id=project.id,
            assignment_settings={
                "label_stream_task_distribution": "assigned_only"
            }
        )
        assignment_mode = "Manual (assigned_only)"
    except:
        assignment_mode = "Default (auto)"

    display(HTML(f"""
    <div style="padding: 15px; background: #d4edda; color: #155724; border: 1px solid #c3e6cb; border-radius: 5px;">
        <strong>✅ Evaluation project created</strong><br>
        • <a href="{LABEL_STUDIO_URL}/projects/{project.id}" target="_blank">View in Label Studio →</a><br>
        • Project ID: {project.id}<br>
        • Task Assignment: {assignment_mode}<br>
        • Task Sampling: Sequential<br>
        • Ready to import tasks
    </div>
    """))

except Exception as e:
    display(HTML(f'<div style="padding: 15px; background: #f8d7da; color: #856404; border: 1px solid #f5c6cb; border-radius: 5px;"><strong>Error:</strong> {e}</div>'))


```

# 📊 Import Dataset into Project

Now we'll import all 100 medical Q&A pairs into our evaluation project:



```python
import time

batch_size = 50
total_imported = 0
task_ids = []

for i in range(0, len(tasks), batch_size):
    batch = tasks[i:i+batch_size]
    ls.projects.import_tasks(id=project.id, request=batch, return_task_ids=True)

attempt = 0
while len(task_ids) < len(tasks):
    all_tasks = list(ls.tasks.list(project=project.id))
    if len(all_tasks) == len(tasks):
        task_ids = [task.id for task in all_tasks]
        break
    time.sleep(1 + attempt * 0.5)
    attempt += 1
    if attempt > 10:
        raise Exception("Tasks not imported after 10 attempts")

if not task_ids:
    raise Exception("No tasks imported")

total_imported = len(task_ids)

# Assign all tasks to the current user (required for manual assignment mode)
# This uses the bulk assignment API via SDK
try:
    # Bulk assign all tasks to current user for annotation
    # Using the SDK's bulk assignment method
    result = ls.projects.assignments.bulk_assign(
        id=project.id,
        users=[current_user.id],
        type="AN",  # Annotation assignment type
        selected_items={
            "all": False,
            "included": task_ids
        }
    )

    assignment_status = f"✅ All {total_imported} tasks assigned to {user_email}"
except Exception as e:
    assignment_status = f"⚠️ Tasks imported but assignment may need manual setup: {str(e)}"

display(HTML(f"""
<div style="padding: 15px; background: #d4edda; color: #155724; border: 1px solid #c3e6cb; border-radius: 5px; margin-top: 10px;">
    <strong>✅ All {total_imported} tasks imported successfully!</strong><br>
    {assignment_status}<br>
    Ready to start evaluation in the embedded interface below.
</div>
"""))


```

# 🎯 Embedded Evaluation Interface

This is where the magic happens. Instead of opening a browser, logging into a platform, and navigating to your project—you're about to evaluate tasks **right here in this notebook**.

The embedded interface is fully functional:
- ✅ Submit annotations → instantly saved to Label Studio
- ✅ Progress tracking → see how many tasks you've completed
- ✅ Next task loading → re-run the cell below to fetch your next assigned task
- ✅ All data stays synced → export to pandas anytime for analysis

**Platform compatibility:**
- **Google Colab, JupyterLab, Jupyter Notebook**: Full embedded interface works perfectly
- **VSCode, Cursor**: Embedded interface works! We inject the Embed SDK directly into the notebook for compatibility reasons
- **Any browser-based notebook**: Should work without issues

The SDK is programmatically loaded into each cell, so it works across all notebook environments. This is the same embed SDK that you would normally get from https://app.humansignal.com/react-app/embed-sdk.js (for on-opremise, replace `app.humansignal.com` with your deployment domain). Same security model, same API, same data format.

Let's load your first task:


```python
# Global state for tracking evaluation progress
evaluation_state = {
    'project_id': None,
    'current_task_id': None,
    'completed_count': 0,
    'total_tasks': 0
}
all_tasks = []

def get_next_task_for_user(project_id, refresh=False):
    global all_tasks
    """Get the next available task for the current user using SDK"""
    try:
        # Get unlabeled tasks from the project
        if not all_tasks or refresh:
            all_tasks = list(ls.tasks.list(project=project_id))

        # Find first task without annotations or incomplete annotations
        for task in all_tasks:
            if not hasattr(task, 'annotations') or not task.annotations or len(task.annotations) == 0:
                return task.id

        # No tasks available
        return None
    except Exception as e:
        print(f"Error getting next task: {e}")
        return None

def create_auto_embed(project_id, task_id=None, embed_id="medical-eval-embed", height="700px"):
    """Create an auto-assignment embed that automatically loads next tasks"""
    token = generate_embed_token(user_email, organization_id, private_key_pem)

    # Update global state
    evaluation_state['project_id'] = project_id
    if task_id:
        evaluation_state['current_task_id'] = task_id

    # If no task_id provided, get the first task
    if not task_id:
        task_id = get_next_task_for_user(project_id)

    if not task_id:
        return """
        <div style="padding: 15px; background: #fff3cd; border-radius: 5px;">
            <strong>🎊 All tasks completed!</strong><br>
            No more tasks available for annotation.
        </div>
        """

    return f"""
    <div id="{embed_id}-container" style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 10px 0;">
        <div
            id="{embed_id}"
            style="display: block; height: {height}; border: none; border-radius: 8px; overflow: hidden; margin-inline: -15px; margin-top: -15px;"
        ></div>

        <div id="{embed_id}-status" style="margin-top: 10px; padding: 8px; background: #f0f0f0; border-radius: 4px; font-size: 12px;">
            🔄 Initializing...
        </div>

        <div style="margin-top: 10px;">
            <a id="{embed_id}-link" href="{LABEL_STUDIO_URL}/projects/{project_id}/data?tab=0&task={task_id}" target="_blank"
               style="display: inline-block; padding: 10px 20px; background: #17a2b8; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
                📊 View Task #{task_id} in Label Studio
            </a>
        </div>
    </div>

    <script>
    // Inline Label Studio Embed SDK
    (function() {{
        const status = document.getElementById('{embed_id}-status');
        const taskDisplay = document.getElementById('{embed_id}-task-display');
        const counterDisplay = document.getElementById('{embed_id}-counter');
        const linkElement = document.getElementById('{embed_id}-link');
        const MESSAGE_EVENT_TYPE = "labelstudioembed:event";
        const SDK_READY_EVENT = "labelstudio:sdk-ready";

        let completedCount = {evaluation_state['completed_count']};
        let currentTaskId = {task_id};

        class LabelStudioEmbedSDK {{
            static instances = new Map();
            static globalInstance = null;

            constructor(options = {{}}) {{
                const {{ id, url, token, taskId, projectId, annotationId, predictionId, interfaces, mode, colorScheme }} = options;

                this.isIframe = false;
                this.eventListeners = new Map();
                this.targetOrigin = "*";
                this.token = token;
                this.id = id || crypto.randomUUID();
                this.taskId = taskId;
                this.projectId = projectId;
                this.annotationId = annotationId;
                this.predictionId = predictionId;
                this.interfaces = interfaces;
                this.mode = mode;
                this.colorScheme = colorScheme;
                this.iframe = null;
                this.iframeLoaded = false;
                this.embedElement = null;
                this.pendingOptions = null;

                if (!this.isIframe) {{
                    this.url = url;
                }}

                window.addEventListener("message", this.handleMessage.bind(this));
            }}

            static create(options = {{}}) {{
                const instance = new LabelStudioEmbedSDK(options);
                LabelStudioEmbedSDK.instances.set(instance.id, instance);
                window.dispatchEvent(new CustomEvent(SDK_READY_EVENT, {{ detail: {{ id: instance.id }} }}));
                return instance;
            }}

            getIframeUrl() {{
                if (!this.url) throw new Error("URL is required");

                const embedUrl = new URL(this.url);
                if (!embedUrl.pathname.endsWith("/embed/")) {{
                    embedUrl.pathname = "/embed/";
                }}
                embedUrl.searchParams.set("embed_id", this.id);
                if (this.token) embedUrl.searchParams.set("embed_user_token", this.token);
                if (this.taskId) embedUrl.searchParams.set("task", this.taskId);
                if (this.projectId) embedUrl.searchParams.set("project", this.projectId);
                if (this.mode) embedUrl.searchParams.set("mode", this.mode);
                if (this.colorScheme) embedUrl.searchParams.set("colorscheme", this.colorScheme);
                return embedUrl.toString();
            }}

            mount(element) {{
                this.getIframe();
                if (this.url && this.iframe) {{
                    this.iframe.src = this.getIframeUrl();
                }}
                if (this.iframe) {{
                    element.appendChild(this.iframe);
                }}

                this.embedElement = element;
            }}

            getIframe() {{
                if (!this.iframe) {{
                    this.iframe = document.createElement("iframe");
                    this.iframe.id = this.id;
                    this.iframe.style.cssText = "width: 100%; height: 100%; border: none;";
                }}
                return this.iframe;
            }}

            on(eventName, callback) {{
                if (!this.eventListeners.has(eventName)) {{
                    this.eventListeners.set(eventName, new Set());
                }}
                this.eventListeners.get(eventName).add(callback);
            }}

            emit(eventName, ...args) {{
                const message = {{
                    type: MESSAGE_EVENT_TYPE,
                    event: eventName,
                    data: args,
                    sourceId: this.id
                }};

                if (this.isIframe) {{
                    window.parent.postMessage(message, this.targetOrigin);
                }} else if (this.iframe && this.iframe.contentWindow) {{
                    this.iframe.contentWindow.postMessage(message, this.targetOrigin);
                }}
            }}

            handleMessage(event) {{
                const {{ data }} = event;
                if (typeof data === "object" && data !== null && data.type === MESSAGE_EVENT_TYPE) {{
                    if (data.sourceId !== this.id) return;
                    this.dispatchEvent(data.event, ...(data.data || []));
                }}
            }}

            dispatchEvent(eventName, ...args) {{
                const listeners = this.eventListeners.get(eventName);
                if (listeners) {{
                    listeners.forEach(callback => {{
                        try {{
                            callback(...args);
                        }} catch (error) {{
                            console.error(`Error in ${{eventName}} handler:`, error);
                        }}
                    }});
                }}
            }}
        }}

        // Initialize our instance with specific task
        try {{
            const sdk = LabelStudioEmbedSDK.create({{
                id: "{embed_id}",
                url: "{LABEL_STUDIO_URL}",
                token: "{token}",
                projectId: "{project_id}",
                taskId: "{task_id}",
                mode: "label",
            }});

            sdk.mount(document.getElementById("{embed_id}"));

            status.innerHTML = '🔄 Loading task #{task_id}...';

            sdk.on('ready', () => {{
                sdk.emit('setOptions', {{
                    colorScheme: "dark"
                }});
                status.innerHTML = '✅ Ready to evaluate Task #{task_id}!';
                status.style.background = '#d4edda';
                status.style.color = '#155724';
            }});

            // Track annotation submission
            sdk.on('submitAnnotation', (annotationId, taskId) => {{
                completedCount++;
                counterDisplay.innerHTML = completedCount;
                status.innerHTML = '🎉 Annotation submitted! Re-run the cell below to load the next task.';
                status.style.background = '#d1ecf1';
                status.style.color = '#0c5460';
            }});

            sdk.on('error', (error) => {{
                status.innerHTML = '❌ Error: ' + (error.message || 'Unknown error');
                status.style.background = '#f8d7da';
                status.style.color = '#721c24';
            }});

        }} catch(e) {{
            status.innerHTML = '❌ Failed: ' + e.message;
            status.style.background = '#f8d7da';
            status.style.color = '#721c24';
        }}
    }})();
    </script>
    """


```

## Start Evaluating

The interface below loads tasks automatically. Evaluate as many as you'd like - all annotations are saved to Label Studio Enterprise:



```python
# Get the next task
next_task_id = get_next_task_for_user(project.id, refresh=True)

total_tasks = len(all_tasks)
evaluation_state['total_tasks'] = total_tasks

if next_task_id:
    # Count unlabeled tasks
    unlabeled_count = sum(1 for t in all_tasks if not hasattr(t, 'annotations') or not t.annotations or len(t.annotations) == 0)
    first_task_id = all_tasks[0].id
    last_task_id = all_tasks[-1].id

    display(HTML(f"""
    <div style="padding: 15px; background: #e7f3ff; color: #004085; border: 1px solid #17a2b8; border-radius: 5px; margin-bottom: 15px;">
        <strong>📋 Evaluation Session Started</strong><br><br>
        • Total tasks in project: <strong>{total_tasks}</strong><br>
        • Unlabeled tasks remaining: <strong>{unlabeled_count}</strong><br>
        • First task ID: <strong>{first_task_id}</strong><br>
        • Last task ID: <strong>{last_task_id}</strong><br><br>

        <strong>💡 How it works:</strong><br>
        1. Complete the evaluation in the interface below<br>
        2. Click <strong>Submit</strong> to save your annotation<br>
        3. <strong>Re-run this cell</strong> to load the next task<br>
        4. Repeat until all tasks are complete<br><br>
    </div>
    """))

    # Display the embed interface with the first task
    display(HTML(create_auto_embed(project.id, next_task_id, "medical-eval-embed", height="900px")))
else:
    display(HTML("""
    <div style="padding: 15px; background: #fff3cd; border-radius: 5px;">
        <strong>🎊 All tasks completed!</strong><br>
        No more tasks available for annotation.
    </div>
    """))

```

# 📈 Export & Analyze Results

After evaluating tasks, let's export the data and perform comprehensive analysis using modern data tools:



```python
# Export annotations using Label Studio Enterprise's native Pandas export
try:
    df = ls.projects.exports.as_pandas(project.id)

    if len(df) == 0:
        display(HTML("""
        <div style="padding: 15px; background: #fff3cd; border-radius: 5px;">
            <strong>⚠️ No annotations yet</strong><br>
            Complete some evaluations above, then run this cell to see analysis.
        </div>
        """))
    else:
        display(HTML(f"""
        <div style="padding: 15px; background: #d4edda; color: #155724; border: 1px solid #c3e6cb; border-radius: 5px;">
            <strong>✅ Exported using Label Studio Enterprise's native Pandas export</strong><br>
            • {len(df)} rows × {len(df.columns)} columns<br>
            • Direct DataFrame export<br>
            • Ready for analysis
        </div>
        """))

        # Display a sample of the exported data
        display(Markdown("### Sample of Exported Data"))
        display(df.head())

except Exception as e:
    display(HTML(f"""
    <div style="padding: 15px; background: #f8d7da; border-radius: 5px;">
        <strong>⚠️ Export failed:</strong> {str(e)}<br>
        Make sure you've completed some annotations first.
    </div>
    """))

```

# 📈 Analyze Results

This is where embedded evaluation pays off. One line of code exports everything to pandas—no CSV downloads, no manual merging, no data formatting headaches.

Label Studio Enterprise's `.as_pandas()` method handles all the JSON parsing for you. Ratings, recommendations, free-text notes—it's all structured and ready for analysis.

Let's see what patterns emerge from the evaluations:



```python
if 'df' in locals() and len(df) > 0:
    # Helper function to extract rating value from JSON
    # Ratings come as '[{"rating":5}]' from Label Studio export
    def extract_rating(json_str):
        """Extract numeric rating from Label Studio JSON format"""
        try:
            if pd.isna(json_str) or json_str == '':
                return None
            if isinstance(json_str, (int, float)):
                return float(json_str)
            data = json.loads(json_str) if isinstance(json_str, str) else json_str
            if isinstance(data, list) and len(data) > 0:
                return float(data[0].get('rating', data[0].get('value')))
            return None
        except:
            return None

    # Extract ratings from JSON to numeric columns
    rating_cols = ['medical_accuracy', 'safety', 'completeness', 'helpfulness']
    for col in rating_cols:
        if col in df.columns:
            df[f'{col}_numeric'] = df[col].apply(extract_rating)

    # Calculate summary statistics
    stats = pd.DataFrame({
        'Metric': ['Total Evaluations', 'Unique Tasks', 'Avg Medical Accuracy', 'Avg Safety', 'Avg Completeness', 'Avg Helpfulness'],
        'Value': [
            len(df),
            df['id'].nunique(),
            round(df['medical_accuracy_numeric'].mean(), 2),
            round(df['safety_numeric'].mean(), 2),
            round(df['completeness_numeric'].mean(), 2),
            round(df['helpfulness_numeric'].mean(), 2)
        ]
    })

    display(HTML(f"""
    <div style="padding: 15px; background: #d4edda; color: #155724; border: 1px solid #c3e6cb; border-radius: 5px;">
        <strong>✅ Exported {len(df)} annotations</strong>
    </div>
    """))

    display(Markdown("### 📊 Evaluation Summary"))
    display(stats)
else:
    display(HTML("""
    <div style="padding: 15px; background: #fff3cd; border-radius: 5px;">
        <strong>⚠️ No annotations yet</strong><br>
        Complete some evaluations above, then run this cell to see analysis.
    </div>
    """))


```

## Visualize Evaluation Patterns

Let's create visualizations to understand model performance:



```python
if 'df' in locals() and len(df) > 0:
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle('Medical LLM Evaluation Analysis', fontsize=16, fontweight='bold')

    # 1. Rating Distributions
    rating_cols = ['medical_accuracy_numeric', 'safety_numeric', 'completeness_numeric', 'helpfulness_numeric']
    rating_data = df[rating_cols].melt(var_name='Metric', value_name='Rating')
    rating_data['Metric'] = rating_data['Metric'].str.replace('_numeric', '').str.replace('_', ' ').str.title()
    sns.violinplot(data=rating_data, x='Metric', y='Rating', ax=axes[0, 0], inner='box')
    axes[0, 0].set_title('Rating Distributions by Metric')
    axes[0, 0].set_ylabel('Rating (1-5)')
    axes[0, 0].set_xticklabels(['Medical\nAccuracy', 'Safety', 'Completeness', 'Helpfulness'])

    # 2. Recommendation Breakdown
    if 'recommendation' in df.columns:
        rec_counts = df['recommendation'].value_counts()
        colors = ['#4caf50', '#8bc34a', '#ff9800', '#f44336']
        axes[0, 1].pie(rec_counts.values, labels=rec_counts.index, autopct='%1.1f%%',
                       colors=colors, startangle=90)
        axes[0, 1].set_title('Overall Recommendations')

    # 3. Rating Correlation Heatmap
    rating_corr = df[rating_cols].corr()
    rating_corr.columns = ['Medical\nAccuracy', 'Safety', 'Completeness', 'Helpfulness']
    rating_corr.index = ['Medical\nAccuracy', 'Safety', 'Completeness', 'Helpfulness']
    sns.heatmap(rating_corr, annot=True, fmt='.2f', cmap='coolwarm', center=0, ax=axes[1, 0])
    axes[1, 0].set_title('Rating Correlations')

    # 4. Performance by Medical Specialty (if data available)
    if 'medical_specialty' in df.columns:
        specialty_perf = df.groupby('medical_specialty')[rating_cols].mean()
        specialty_perf = specialty_perf.head(8)  # Top 8 specialties

        if len(specialty_perf) > 0:
            x = range(len(specialty_perf))
            width = 0.2

            # Clean labels for legend
            label_map = {
                'medical_accuracy_numeric': 'Medical Accuracy',
                'safety_numeric': 'Safety',
                'completeness_numeric': 'Completeness',
                'helpfulness_numeric': 'Helpfulness'
            }

            for i, col in enumerate(rating_cols):
                axes[1, 1].bar([xi + i*width for xi in x], specialty_perf[col],
                              width, label=label_map.get(col, col))

            axes[1, 1].set_xlabel('Medical Specialty')
            axes[1, 1].set_ylabel('Average Rating')
            axes[1, 1].set_title('Performance by Medical Specialty')
            axes[1, 1].set_xticks([xi + width*1.5 for xi in x])
            axes[1, 1].set_xticklabels([s[:15] + '...' if len(s) > 15 else s
                                         for s in specialty_perf.index], rotation=45, ha='right')
            axes[1, 1].legend(loc='upper left', fontsize=8)
        else:
            axes[1, 1].text(0.5, 0.5, 'Not enough specialty data',
                            ha='center', va='center', fontsize=12)

    plt.tight_layout()
    plt.show()

    display(Markdown("### 🔍 Additional Analysis"))

    # Top performing specialties (if applicable)
    if 'medical_specialty' in df.columns:
        top_specialties = df.groupby('medical_specialty').agg({
            'id': 'count',
            'medical_accuracy_numeric': 'mean',
            'safety_numeric': 'mean',
            'completeness_numeric': 'mean',
            'helpfulness_numeric': 'mean'
        }).round(2)
        top_specialties.columns = ['Evaluations', 'Avg Accuracy', 'Avg Safety', 'Avg Completeness', 'Avg Helpfulness']
        top_specialties = top_specialties.sort_values('Evaluations', ascending=False).head(10)

        if len(top_specialties) > 0:
            display(Markdown("**Performance by Medical Specialty:**"))
            display(top_specialties)

    # Problematic responses (low scores)
    if 'recommendation' in df.columns:
        problematic = df[
            (df['recommendation'].isin(['reject', 'needs_major_revision'])) |
            (df['medical_accuracy_numeric'] < 3) |
            (df['safety_numeric'] < 3)
        ][['question', 'medical_specialty', 'medical_accuracy_numeric', 'safety_numeric', 'recommendation']].head(5)
        problematic.columns = ['Question', 'Specialty', 'Medical Accuracy', 'Safety', 'Recommendation']

        if len(problematic) > 0:
            display(Markdown("**⚠️ Responses Needing Attention:**"))
            display(problematic)
else:
    display(HTML("""
    <div style="padding: 15px; background: #fff3cd; border-radius: 5px;">
        Complete some evaluations to see visualizations and analysis!
    </div>
    """))


```

# 🎯 What You Built

You now have a production-ready evaluation workflow that runs entirely in your notebook:

**Data in** → Hugging Face dataset (100 medical Q&A pairs)  
**Evaluate** → Embedded Label Studio with structured criteria  
**Analyze** → One-line pandas export → visualizations → insights

**The key unlock**: Label Studio Enterprise's embed SDK + native pandas export means evaluation data flows seamlessly between human judgment and ML pipelines. No context switching, no manual data wrangling, no broken workflows.

---

# 🚀 Adapt This Workflow

The pattern you learned—embed, evaluate, export, analyze—works for any human-in-the-loop task:

### Different Evaluation Scenarios

**Content Moderation**  
Rate toxicity, bias, and policy violations. Use the same embed pattern with custom criteria for safety teams.

**Prompt Engineering**  
A/B test prompt variations side-by-side. Load two model outputs per task, compare quality, iterate faster.

**Data Quality Audits**  
Validate training data annotations across your team. Export to pandas, identify annotation drift, fix systematically.

**Model Comparison Studies**  
Evaluate GPT-4 vs Claude vs your fine-tuned model. Side-by-side comparison with structured feedback.

### Scale It Up

**Distributed Evaluation**  
Replace the notebook embed with a web app (same SDK code). Add team collaboration, role-based access, review workflows.

**Active Learning Pipelines**  
Connect your ML model → export low-confidence predictions → embed in notebook → human evaluation → retrain automatically. Check the [Active Learning docs](https://docs.humansignal.com/guide/active_learning).

**Real-Time Monitoring**  
Set up [webhooks](https://docs.humansignal.com/guide/webhooks) to trigger actions when annotations are submitted. Get Slack notifications, update dashboards, flag critical issues.

**MLOps Integration**  
- **MLflow**: `mlflow.log_metrics(df.mean().to_dict())` after pandas export
- **W&B**: Log evaluation distributions as histograms
- **Airflow/Prefect**: Orchestrate evaluation → training → deployment cycles

---

# 📚 Key Resources

**Core Documentation**  
→ [Embed SDK](https://docs.humansignal.com/guide/embed.html) - Authentication, events, advanced configs  
→ [Python SDK](https://api.labelstud.io/) - Complete API reference  

**Advanced Features**  
→ [Prompts](https://docs.humansignal.com/guide/prompts_overview) - LLM prompt evaluation  
→ [Active Learning](https://docs.humansignal.com/guide/active_learning) - Auto-surface informative samples  
→ [ML Backend Integration](https://docs.humansignal.com/guide/ml) - Bi-directional model sync  
→ [Inter-Annotator Agreement](https://docs.humansignal.com/guide/stats) - Measure evaluator consistency

**Production**  
→ [Webhooks](https://docs.humansignal.com/guide/webhooks) - Event-driven automation  
→ [Cloud Storage](https://docs.humansignal.com/guide/storage) - S3/GCS/Azure sync  
→ [Export Formats](https://docs.humansignal.com/guide/export) - JSON, CSV, COCO, YOLO, etc.

**Community**  
→ [Join Slack](https://slack.labelstud.io) - Get help, share use cases  
→ [GitHub](https://github.com/HumanSignal/label-studio) - Contribute, open issues  
→ [Contact Sales](mailto:sales@humansignal.com) - Enterprise features & support

---

# 💡 The Bigger Picture

We often treat evaluation as a separate phase—something that happens *after* development. This tutorial shows it can be embedded in the dev loop itself.

Fast feedback loops win. When evaluation is one cell away instead of one platform away, you iterate faster, catch issues earlier, and ship better models.

That's the power of embedding evaluation workflows in your research stack.

**Now go build something amazing.** 🚀


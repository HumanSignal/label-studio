---
title: Agentic Tracing for Claims
type: templates
category: Programmable Interfaces
order: 756
is_new: t
meta_title: Template for agentic tracing
meta_description: Template that uses a custom UI to trace agentic responses to insurance claims  
---


The following template creates a comprehensive labeling interface for evaluating AI agent execution traces. 

It transforms hierarchical trace data (from agent workflows, tool calls, and multi-step reasoning) into an interactive tree-based visualization that enables efficient annotation and quality assessment.

The labeling interface loads trace data in JSON format and displays it as a collapsible tree structure showing:

- **Agent steps** - Individual agents in a multi-agent workflow
- **Tool calls** - Function invocations with inputs and outputs
- **SQL responses** - Database queries with formatted table results
- **Thoughts and reasoning** - Internal reasoning steps
- **Outputs** - Final results and responses

Users can then label each step using custom ontologies (single-select dropdowns and text areas) to evaluate quality, correctness, and other dimensions of the agent's performance.

![Screenshot](/images/templates-misc/react-claims.png)

!!! error Enterprise
    This template and the `ReactCode` tag can only be used in Label Studio Enterprise.

    For more information, including simplified code examples, see [ReactCode](/tags/reactcode).

## Labeling configuration

The example below does the following:

1. **Data Transformation**: Automatically transforms trace JSON files (with nested `children` arrays) into a step-based format that the interface can render. It maps different node types (agents, tool calls, thoughts, outputs) to appropriate visual representations.

2. **Tree Visualization**: Each step is rendered as a collapsible node in a hierarchical tree, allowing users to expand/collapse branches to navigate complex workflows. The tree shows relationships between parent agents and their child operations.

3. **Rich Tool Output Rendering**: Tool call responses are intelligently rendered:
   - SQL queries display as formatted tables with rows and columns
   - Charts and plot data are visualized when available
   - Raw JSON can be toggled for detailed inspection
   - Multiple tables from database queries are shown separately

4. **Labeling System**: Each step can be annotated with:
   - **Single-select dimensions** - Categorical labels (e.g., quality ratings, error types)
   - **Textarea dimensions** - Free-form notes and corrections
   - Labels are saved as Label Studio regions for export and analysis

5. **Claude API Integration**: Users can interact with the trace via a chat interface that sends the full trace context to Claude, enabling:
   - Asking questions about the agent's behavior
   - Requesting corrections or improvements
   - Getting explanations of complex reasoning steps


6. **Search and Navigation**: Built-in search allows filtering steps by content, and keyboard shortcuts enable rapid navigation through long traces.

!!! note
    You will need to add your own API key in the code below (line 278).

<br />
<br />

{% details <b>Click to expand</b> %}

```xml
<View>
  <Style>
    .lsf-main-view__annotation { padding: 0 !important; }
    .lsf-topbar { display: none; }

  </Style>
  <ReactCode style="height: calc(100vh - 55px)" name="custom" toName="custom" data="$tree">
    <![CDATA[
    // ============================================================================
    // AGENTIC LABELING INTERFACE - Label Studio Programmable Interface
    // ============================================================================
    // A comprehensive labeling interface for evaluating AI agent traces with:
    // - Hierarchical tree view of agent steps (thoughts, tool calls, sub-agents, outputs)
    // - Type-specific labeling ontologies with single-select and textarea dimensions
    // - Search and filter functionality
    // - Keyboard shortcuts for efficient labeling
    // - Collapsible user query and follow-up chat sections
    // - Progress tracking with visual indicators
    // - Pretty/Raw view toggle for tool outputs with table/chart rendering
    // - Claude API integration for steering/correcting the trace
    // - **TRACE FORMAT SUPPORT**: Automatically loads and transforms trace JSON files
    // ============================================================================

    function AgenticLabelingInterface({ React, addRegion, regions, data }) {
      const { useState, useEffect, useCallback, useRef, useMemo } = React;

      // ============================================================================
      // TRACE FORMAT TRANSFORMATION
      // ============================================================================
      
      /**
       * Transform trace format to interface step format
       * Handles the tree structure from trace JSON files
       * With data="$tree", we receive the tree object directly
       */
      function transformTraceToSteps(treeData) {
        // Check if data is in tree format (has children array)
        if (!treeData || !treeData.children) {
          return null;
        }
        
        const metadata = treeData.metadata || {};
        
        // Extract query from metadata
        const query = metadata.claim_text || metadata.query || metadata.user_query || 'No query provided';
        
        // Extract timestamp for steps
        const baseTimestamp = metadata.timestamp || new Date().toISOString();
        const baseDate = new Date(baseTimestamp);
        
        /**
         * Map trace node type to interface step type
         */
        function mapNodeType(node) {
          const nodeType = (node.type || '').toLowerCase();
          
          if (nodeType === 'agent' || nodeType === 'root') {
            return 'agent';
          } else if (nodeType === 'text_output' || nodeType === 'output') {
            return 'output';
          } else if (nodeType === 'tool_call' || nodeType === 'tool') {
            return 'tool_call';
          } else if (nodeType === 'thought' || nodeType === 'thinking') {
            return 'thought';
          } else if (nodeType === 'subagent' || nodeType === 'sub_agent') {
            return 'subagent';
          } else if (nodeType === 'user_message') {
            return 'user_message';
          } else if (nodeType === 'assistant_response') {
            return 'assistant_response';
          }
          
          // Default based on content
          return 'output';
        }
        
        /**
         * Generate timestamp string from index
         */
        function generateTimestamp(index) {
          const stepDate = new Date(baseDate.getTime() + (index * 1000));
          return stepDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
        
        /**
         * Recursively transform tree nodes to steps
         */
        let stepCounter = 0;
        
        function transformNode(node, parentId) {
          const currentIndex = stepCounter++;
          const stepId = parentId ? parentId + '-' + currentIndex : 'step-' + currentIndex;
          
          const stepType = mapNodeType(node);
          
          // Build the step object
          const step = {
            id: stepId,
            type: stepType,
            label: node.name || node.author || node.label || ('Step ' + currentIndex),
            content: node.output || node.content || node.text || '',
            timestamp: generateTimestamp(currentIndex),
            children: [],
          };
          
          // Add tool-specific fields if applicable (handle trace format)
          if (stepType === 'tool_call') {
            // Trace format uses: name, args, response
            // Interface expects: tool, input, output
            step.tool = node.name || node.tool || 'unknown';
            step.input = node.args || node.input || null;
            step.output = node.response || node.output || node.result || null;
            // Keep the original response structure for rich rendering
            step.response = node.response || null;
          }
          
          // Add status if available
          if (node.status) {
            step.status = node.status;
          }
          
          // Add author if available (useful for display)
          if (node.author) {
            step.author = node.author;
          }
          
          // Recursively transform children
          if (node.children && Array.isArray(node.children) && node.children.length > 0) {
            step.children = node.children.map(function(childNode) {
              return transformNode(childNode, stepId);
            });
          }
          
          return step;
        }
        
        // Transform all root-level children (agents)
        const steps = [];
        
        // Create a root wrapper step if the tree has a name
        if (treeData.name && treeData.type === 'root') {
          const rootStep = {
            id: 'main',
            type: 'agent',
            label: treeData.name,
            content: 'Processing pipeline for: ' + query.substring(0, 100) + (query.length > 100 ? '...' : ''),
            timestamp: generateTimestamp(0),
            children: [],
          };
          
          if (treeData.status) {
            rootStep.status = treeData.status;
          }
          
          // Transform all children under the root
          if (treeData.children && Array.isArray(treeData.children)) {
            rootStep.children = treeData.children.map(function(childNode) {
              return transformNode(childNode, 'main');
            });
          }
          
          steps.push(rootStep);
        } else {
          // No root wrapper, just add children directly
          if (treeData.children && Array.isArray(treeData.children)) {
            treeData.children.forEach(function(childNode, index) {
              steps.push(transformNode(childNode, null));
            });
          }
        }
        
        return {
          id: metadata.trace_id || 'trace-' + Date.now(),
          query: query,
          steps: steps,
          conversation: [],
          metadata: metadata,
        };
      }

      // ============================================================================
      // CONFIGURATION
      // ============================================================================
      const CONFIG = {
        enableFollowUpChat: true,
        enableProgressBar: true,
        // Claude API Configuration
        claude: {
          enabled: true,
          // ⚠️ IMPORTANT: Replace with your actual Claude API key
          apiKey: 'YOUR-API-KEY',
          model: 'claude-sonnet-4-20250514',
          apiEndpoint: 'https://api.anthropic.com/v1/messages',
          apiVersion: '2023-06-01',
          maxTokens: 4096,
        }
      };

      // ============================================================================
      // CHAT ERROR TYPES
      // ============================================================================
      const CHAT_ERROR = {
        NO_API_KEY: 'no_api_key',
        WRONG_API_KEY: 'wrong_api_key',
        HTTP_ERROR: 'http_error',
        NETWORK_ERROR: 'network_error',
        ABORTED: 'aborted',
      };

      // ============================================================================
      // TRACE SERIALIZATION FOR CLAUDE
      // ============================================================================
      
      /**
       * Serialize a step to a readable format
       */
      function serializeStep(step, indent) {
        indent = indent || 0;
        const prefix = '  '.repeat(indent);
        let result = '';
        
        if (step.type === 'agent') {
          result += prefix + '[Agent: ' + (step.label || 'Agent') + ']: ' + (step.content || 'Processing...') + '\n\n';
        } else if (step.type === 'thought') {
          result += prefix + '[Thought]: ' + (step.content || '') + '\n\n';
        } else if (step.type === 'tool_call') {
          result += prefix + '[Tool Call - ' + (step.tool || 'unknown') + ']\n';
          if (step.input) {
            result += prefix + 'Input: ' + JSON.stringify(step.input) + '\n';
          }
          if (step.output) {
            result += prefix + 'Output: ' + JSON.stringify(step.output) + '\n';
          }
          result += '\n';
        } else if (step.type === 'subagent') {
          result += prefix + '[Sub-agent]: ' + (step.content || step.label || '') + '\n\n';
        } else if (step.type === 'output') {
          result += prefix + '[Output - ' + (step.label || 'Output') + ']: ' + (step.content || '') + '\n\n';
        } else if (step.type === 'user_message') {
          result += prefix + '[User]: ' + (step.content || '') + '\n\n';
        } else if (step.type === 'assistant_response') {
          result += prefix + '[Assistant]: ' + (step.content || '') + '\n\n';
        }
        
        // Serialize children
        if (step.children && step.children.length > 0) {
          step.children.forEach(function(child) {
            result += serializeStep(child, indent + 1);
          });
        }
        
        return result;
      }
      
      /**
       * Serialize the entire trace to send to Claude
       */
      function serializeTrace(query, steps) {
        let trace = '[User Query]: ' + query + '\n\n';
        
        steps.forEach(function(step) {
          trace += serializeStep(step, 0);
        });
        
        return trace.trim();
      }

      // ============================================================================
      // CLAUDE API FUNCTIONS
      // ============================================================================
      
      /**
       * Send the trace and user message to Claude
       */
      async function sendToClaude({ trace, userMessage, signal }) {
        const apiKey = CONFIG.claude.apiKey;
        
        if (!apiKey || apiKey === 'YOUR_CLAUDE_API_KEY_HERE') {
          throw new Error('Claude API key not configured. Please set CONFIG.claude.apiKey');
        }

        const systemPrompt = `You are a helpful AI assistant. Continue the conversation naturally based on the context provided. Respond to the user's latest message.`;

        const userContent = `${trace}

User: ${userMessage}`;

        const requestBody = {
          model: CONFIG.claude.model,
          max_tokens: CONFIG.claude.maxTokens,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userContent }
          ],
        };

        const response = await fetch(CONFIG.claude.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': CONFIG.claude.apiVersion,
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify(requestBody),
          signal: signal,
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data.error?.message || data.message || 'Unknown error';
          throw new Error(errorMessage);
        }

        // Extract text content from Claude's response
        let textContent = '';
        if (data.content && Array.isArray(data.content)) {
          textContent = data.content
            .filter(function(block) { return block.type === 'text'; })
            .map(function(block) { return block.text; })
            .join('\n');
        }

        return textContent;
      }

      // ============================================================================
      // LABELING ONTOLOGY CONFIGURATION
      // ============================================================================
      const LABELING_ONTOLOGY = {
        _default: {
          dimensions: [
            { key: 'correctness', label: 'Correctness', type: 'single-select', options: ['Correct', 'Partially Correct', 'Incorrect'] },
            { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Add notes for this step...' },
          ],
        },
        agent: {
          dimensions: [
            { key: 'correctness', label: 'Correctness', type: 'single-select', options: ['Correct', 'Partially Correct', 'Incorrect'] },
            { key: 'delegation', label: 'Delegation Quality', type: 'single-select', options: ['Appropriate', 'Over-delegated', 'Under-delegated'] },
            { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Notes on agent orchestration...' },
          ],
        },
        thought: {
          dimensions: [
            { key: 'correctness', label: 'Reasoning Correctness', type: 'single-select', options: ['Correct', 'Partially Correct', 'Incorrect'] },
            { key: 'coherence', label: 'Coherence', type: 'single-select', options: ['Clear', 'Somewhat Clear', 'Confused'] },
            { key: 'completeness', label: 'Completeness', type: 'single-select', options: ['Complete', 'Partial', 'Incomplete'] },
            { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Notes on reasoning quality...' },
          ],
        },
        'thought:Planning': {
          dimensions: [
            { key: 'correctness', label: 'Plan Correctness', type: 'single-select', options: ['Correct', 'Partially Correct', 'Incorrect'] },
            { key: 'feasibility', label: 'Plan Feasibility', type: 'single-select', options: ['Feasible', 'Partially Feasible', 'Not Feasible'] },
            { key: 'efficiency', label: 'Plan Efficiency', type: 'single-select', options: ['Optimal', 'Acceptable', 'Suboptimal'] },
            { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Notes on the plan...' },
          ],
        },
        tool_call: {
          dimensions: [
            { key: 'correctness', label: 'Tool Use Correctness', type: 'single-select', options: ['Correct', 'Partially Correct', 'Incorrect'] },
            { key: 'necessity', label: 'Necessity', type: 'single-select', options: ['Necessary', 'Helpful', 'Unnecessary'] },
            { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Notes on tool usage...' },
          ],
        },
        'tool:sql_query': {
          dimensions: [
            { key: 'correctness', label: 'Query Correctness', type: 'single-select', options: ['Correct', 'Partially Correct', 'Incorrect'] },
            { key: 'efficiency', label: 'Query Efficiency', type: 'single-select', options: ['Optimal', 'Acceptable', 'Inefficient'] },
            { key: 'security', label: 'SQL Security', type: 'single-select', options: ['Secure', 'Potential Risk', 'Insecure'] },
            { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Notes on SQL query...' },
          ],
        },
        'tool:chart_renderer': {
          dimensions: [
            { key: 'correctness', label: 'Rendering Correctness', type: 'single-select', options: ['Correct', 'Partially Correct', 'Incorrect'] },
            { key: 'visualization', label: 'Visualization Choice', type: 'single-select', options: ['Appropriate', 'Acceptable', 'Poor Choice'] },
            { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Notes on visualization...' },
          ],
        },
        subagent: {
          dimensions: [
            { key: 'correctness', label: 'Correctness', type: 'single-select', options: ['Correct', 'Partially Correct', 'Incorrect'] },
            { key: 'appropriateness', label: 'Delegation Appropriateness', type: 'single-select', options: ['Appropriate', 'Questionable', 'Inappropriate'] },
            { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Notes on sub-agent...' },
          ],
        },
        output: {
          dimensions: [
            { key: 'correctness', label: 'Answer Correctness', type: 'single-select', options: ['Correct', 'Partially Correct', 'Incorrect'] },
            { key: 'completeness', label: 'Completeness', type: 'single-select', options: ['Complete', 'Partial', 'Incomplete'] },
            { key: 'clarity', label: 'Clarity', type: 'single-select', options: ['Clear', 'Somewhat Clear', 'Unclear'] },
            { key: 'helpfulness', label: 'Helpfulness', type: 'single-select', options: ['Very Helpful', 'Helpful', 'Not Helpful'] },
            { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Notes on the output...' },
          ],
        },
        user_message: {
          dimensions: [
            { key: 'relevance', label: 'Relevance', type: 'single-select', options: ['Relevant', 'Partially Relevant', 'Not Relevant'] },
            { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Notes on user message...' },
          ],
        },
        assistant_response: {
          dimensions: [
            { key: 'correctness', label: 'Correctness', type: 'single-select', options: ['Correct', 'Partially Correct', 'Incorrect'] },
            { key: 'helpfulness', label: 'Helpfulness', type: 'single-select', options: ['Very Helpful', 'Helpful', 'Not Helpful'] },
            { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Notes on assistant response...' },
          ],
        },
      };

      function getOntologyForStep(step) {
        if (step.type === 'tool_call' && step.tool && LABELING_ONTOLOGY['tool:' + step.tool]) {
          return LABELING_ONTOLOGY['tool:' + step.tool];
        }
        if (step.label && LABELING_ONTOLOGY[step.type + ':' + step.label]) {
          return LABELING_ONTOLOGY[step.type + ':' + step.label];
        }
        if (LABELING_ONTOLOGY[step.type]) {
          return LABELING_ONTOLOGY[step.type];
        }
        return LABELING_ONTOLOGY._default;
      }

      function getStepStatus(step, labelsMap) {
        const ont = getOntologyForStep(step);
        const firstDim = ont.dimensions.find(function(d) { return d.type === 'single-select'; });
        const statusVal = firstDim ? (labelsMap[step.id] && labelsMap[step.id][firstDim.key]) : null;
        
        if (!statusVal) return 'unlabeled';
        if (statusVal.includes('Correct') && !statusVal.includes('Partially') && !statusVal.includes('Incorrect')) return 'correct';
        if (statusVal.includes('Incorrect')) return 'incorrect';
        return 'partial';
      }

      // ============================================================================
      // COLOR PALETTE
      // ============================================================================
      const colors = {
        tint: '#2563EB', tintHover: '#1D4ED8', tintLight: '#EFF6FF', tintMuted: '#DBEAFE',
        success: '#059669', successBg: '#ECFDF5',
        warning: '#D97706', warningBg: '#FFFBEB',
        error: '#DC2626', errorBg: '#FEF2F2',
        text: '#0F172A', textSecondary: '#334155', subtext: '#64748B', disabled: '#94A3B8',
        border: '#E2E8F0', borderLight: '#F1F5F9', bgLight: '#F8FAFC', bgWhite: '#FFFFFF', selected: '#EFF6FF',
        agent: { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
        thought: { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
        tool: { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' },
        subagent: { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
        output: { bg: '#F0F9FF', color: '#0369A1', border: '#BAE6FD' },
        userMessage: { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
        assistantResponse: { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
        kbd: { bg: '#1E293B', color: '#F1F5F9', border: '#334155' },
      };

      // ============================================================================
      // ICON COMPONENTS (SVG-based replacements for lucide-react)
      // ============================================================================
      function Icon(props) {
        const name = props.name;
        const size = props.size || 14;
        const color = props.color || 'currentColor';
        
        const paths = {
          chevronDown: 'M6 9l6 6 6-6',
          chevronRight: 'M9 18l6-6-6-6',
          chevronUp: 'M18 15l-6-6-6 6',
          check: 'M20 6L9 17l-5-5',
          x: 'M18 6L6 18M6 6l12 12',
          alertCircle: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4M12 16h.01',
          database: 'M21 5c0 1.657-4.03 3-9 3S3 6.657 3 5m18 0c0-1.657-4.03-3-9-3S3 3.343 3 5m18 0v14c0 1.657-4.03 3-9 3s-9-1.343-9-3V5m18 7c0 1.657-4.03 3-9 3s-9-1.343-9-3',
          messageSquare: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
          brain: 'M12 5a3 3 0 10-5.997.125 4 4 0 00-2.526 5.77 4 4 0 00.556 6.588A4 4 0 107 21a4 4 0 006-3.5V5zm0 0a3 3 0 115.997.125 4 4 0 012.526 5.77 4 4 0 01-.556 6.588A4 4 0 1017 21a4 4 0 01-6-3.5',
          wrench: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z',
          maximize2: 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7',
          minimize2: 'M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7',
          code: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
          eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z',
          send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
          cpu: 'M18 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2zM9 9h6v6H9V9zM9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3',
          arrowRight: 'M5 12h14M12 5l7 7-7 7',
          search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
          keyboard: 'M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8',
          filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
          loader: 'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83',
          alertTriangle: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
          refreshCw: 'M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15',
          stopCircle: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM8 8h8v8H8z',
          user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
          bot: 'M12 8V4H8M8 4H4v4M4 8v8a4 4 0 004 4h8a4 4 0 004-4V8M20 8V4h-4M9 12h.01M15 12h.01',
          edit: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
        };
        
        return React.createElement('svg', {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: color,
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          style: { flexShrink: 0 }
        }, React.createElement('path', { d: paths[name] || '' }));
      }

      // ============================================================================
      // UTILITY COMPONENTS
      // ============================================================================
      function Kbd(props) {
        return React.createElement('kbd', {
          style: {
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: '18px', height: '18px', padding: '0 5px',
            fontSize: '10px', fontWeight: 600, fontFamily: 'inherit',
            backgroundColor: colors.kbd.bg, color: colors.kbd.color,
            borderRadius: '4px', border: '1px solid ' + colors.kbd.border,
          }
        }, props.children);
      }

      function StepTypeBadge(props) {
        const type = props.type;
        const size = props.size || 'sm';
        const config = {
          agent: { icon: 'cpu', label: 'Agent', bg: colors.agent.bg, color: colors.agent.color, border: colors.agent.border },
          thought: { icon: 'brain', label: 'Thought', bg: colors.thought.bg, color: colors.thought.color, border: colors.thought.border },
          tool_call: { icon: 'wrench', label: 'Tool', bg: colors.tool.bg, color: colors.tool.color, border: colors.tool.border },
          subagent: { icon: 'arrowRight', label: 'Sub-agent', bg: colors.subagent.bg, color: colors.subagent.color, border: colors.subagent.border },
          output: { icon: 'messageSquare', label: 'Output', bg: colors.output.bg, color: colors.output.color, border: colors.output.border },
          user_message: { icon: 'user', label: 'User', bg: colors.userMessage.bg, color: colors.userMessage.color, border: colors.userMessage.border },
          assistant_response: { icon: 'bot', label: 'Assistant', bg: colors.assistantResponse.bg, color: colors.assistantResponse.color, border: colors.assistantResponse.border },
        };
        const c = config[type] || config.thought;
        const isSmall = size === 'sm';
        return React.createElement('span', {
          style: {
            display: 'inline-flex', alignItems: 'center', gap: isSmall ? '4px' : '6px',
            padding: isSmall ? '2px 6px' : '4px 10px',
            fontSize: isSmall ? '10px' : '11px', fontWeight: 600,
            backgroundColor: c.bg, color: c.color,
            borderRadius: '4px', border: '1px solid ' + c.border,
            whiteSpace: 'nowrap',
          }
        }, 
          React.createElement(Icon, { name: c.icon, size: isSmall ? 10 : 12, color: c.color }),
          c.label
        );
      }

      function ViewToggle(props) {
        const view = props.view;
        const onChange = props.onChange;
        const views = [
          { key: 'pretty', icon: 'eye', label: 'Pretty' },
          { key: 'raw', icon: 'code', label: 'Raw' }
        ];
        return React.createElement('div', {
          style: { display: 'flex', gap: '2px', backgroundColor: colors.bgLight, borderRadius: '6px', padding: '2px' }
        }, views.map(function(v) {
          return React.createElement('button', {
            key: v.key,
            onClick: function() { onChange(v.key); },
            style: {
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 8px', fontSize: '10px', fontWeight: 500,
              backgroundColor: view === v.key ? colors.bgWhite : 'transparent',
              color: view === v.key ? colors.text : colors.subtext,
              border: 'none', borderRadius: '4px', cursor: 'pointer',
              boxShadow: view === v.key ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }
          }, React.createElement(Icon, { name: v.icon, size: 10 }), v.label);
        }));
      }

      // ============================================================================
      // MARKDOWN DETECTION AND RENDERING
      // ============================================================================
      
      /**
       * Detect if content appears to be markdown
       */
      function isMarkdown(text) {
        if (!text || typeof text !== 'string') return false;
        
        // Strong patterns - just one of these means it's markdown
        const strongPatterns = [
          /^#{1,6}\s+/m,           // Headers: # ## ### etc
          /^```/m,                 // Code blocks: ```
          /^---+$/m,               // Horizontal rules
        ];
        
        for (let i = 0; i < strongPatterns.length; i++) {
          if (strongPatterns[i].test(text)) return true;
        }
        
        // Weaker patterns - need 2+ to confirm markdown
        const weakPatterns = [
          /\*\*[^*]+\*\*/,         // Bold: **text**
          /\*[^*]+\*/,             // Italic: *text*
          /^\s*[-*+]\s+/m,         // Unordered lists: - item, * item
          /^\s*\d+\.\s+/m,         // Ordered lists: 1. item
          /\[.+\]\(.+\)/,          // Links: [text](url)
          /`[^`]+`/,               // Inline code: `code`
          /^\s*>/m,                // Blockquotes: > text
          /\|.+\|/,                // Tables: | col | col |
        ];
        
        let matchCount = 0;
        for (let i = 0; i < weakPatterns.length; i++) {
          if (weakPatterns[i].test(text)) {
            matchCount++;
            if (matchCount >= 2) return true;
          }
        }
        
        return false;
      }
      
      /**
       * Simple markdown renderer - converts markdown to React elements
       */
      function renderMarkdown(text) {
        if (!text) return null;
        
        const lines = text.split('\n');
        const elements = [];
        let currentListItems = [];
        let listType = null;
        let inCodeBlock = false;
        let codeBlockContent = [];
        
        function flushList() {
          if (currentListItems.length > 0) {
            const ListTag = listType === 'ol' ? 'ol' : 'ul';
            elements.push(React.createElement(ListTag, { 
              key: 'list-' + elements.length,
              style: { margin: '8px 0', paddingLeft: '24px', listStyleType: listType === 'ol' ? 'decimal' : 'disc' }
            }, currentListItems.map(function(item, i) {
              return React.createElement('li', { 
                key: i, 
                style: { 
                  marginBottom: '4px', 
                  fontSize: '12px', 
                  lineHeight: 1.6, 
                  color: colors.textSecondary,
                  marginLeft: (item.indent || 0) * 16 + 'px'
                }
              }, renderInlineMarkdown(item.text));
            })));
            currentListItems = [];
            listType = null;
          }
        }
        
        function flushCodeBlock() {
          if (codeBlockContent.length > 0) {
            elements.push(React.createElement('pre', {
              key: 'code-' + elements.length,
              style: { 
                margin: '8px 0', padding: '12px', 
                backgroundColor: '#1E293B', color: '#E2E8F0', 
                borderRadius: '6px', fontSize: '11px', 
                overflow: 'auto', whiteSpace: 'pre-wrap'
              }
            }, codeBlockContent.join('\n')));
            codeBlockContent = [];
          }
        }
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Code block toggle
          if (line.trim().startsWith('```')) {
            if (inCodeBlock) {
              flushCodeBlock();
              inCodeBlock = false;
            } else {
              flushList();
              inCodeBlock = true;
            }
            continue;
          }
          
          if (inCodeBlock) {
            codeBlockContent.push(line);
            continue;
          }
          
          // Headers
          const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
          if (headerMatch) {
            flushList();
            const level = headerMatch[1].length;
            const sizes = { 1: '18px', 2: '16px', 3: '14px', 4: '13px', 5: '12px', 6: '11px' };
            const margins = { 1: '16px 0 8px', 2: '14px 0 6px', 3: '12px 0 4px', 4: '10px 0 4px', 5: '8px 0 2px', 6: '6px 0 2px' };
            elements.push(React.createElement('div', {
              key: 'h-' + elements.length,
              style: { 
                fontSize: sizes[level], 
                fontWeight: 600, 
                margin: margins[level],
                color: colors.text
              }
            }, renderInlineMarkdown(headerMatch[2])));
            continue;
          }
          
          // Horizontal rule
          if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
            flushList();
            elements.push(React.createElement('hr', {
              key: 'hr-' + elements.length,
              style: { border: 'none', borderTop: '1px solid ' + colors.border, margin: '12px 0' }
            }));
            continue;
          }
          
          // Unordered list (with indent detection)
          const ulMatch = line.match(/^(\s*)([-*+])\s+(.+)$/);
          if (ulMatch) {
            if (listType === 'ol') flushList();
            listType = 'ul';
            const indentLevel = Math.floor(ulMatch[1].length / 2); // 2 spaces per indent
            currentListItems.push({ text: ulMatch[3], indent: indentLevel });
            continue;
          }
          
          // Ordered list (with indent detection)
          const olMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
          if (olMatch) {
            if (listType === 'ul') flushList();
            listType = 'ol';
            const indentLevel = Math.floor(olMatch[1].length / 2);
            currentListItems.push({ text: olMatch[3], indent: indentLevel });
            continue;
          }
          
          // Blockquote
          const bqMatch = line.match(/^\s*>\s*(.*)$/);
          if (bqMatch) {
            flushList();
            elements.push(React.createElement('div', {
              key: 'bq-' + elements.length,
              style: { 
                borderLeft: '3px solid ' + colors.tint, 
                paddingLeft: '12px', 
                margin: '8px 0',
                color: colors.textSecondary,
                fontStyle: 'italic',
                fontSize: '12px'
              }
            }, renderInlineMarkdown(bqMatch[1])));
            continue;
          }
          
          // Empty line
          if (line.trim() === '') {
            flushList();
            continue;
          }
          
          // Regular paragraph
          flushList();
          elements.push(React.createElement('p', {
            key: 'p-' + elements.length,
            style: { margin: '6px 0', fontSize: '12px', lineHeight: 1.7, color: colors.textSecondary }
          }, renderInlineMarkdown(line)));
        }
        
        flushList();
        flushCodeBlock();
        
        return React.createElement('div', { style: { } }, elements);
      }
      
      /**
       * Render inline markdown (bold, italic, code, links)
       */
      function renderInlineMarkdown(text) {
        if (!text) return text;
        
        const parts = [];
        let remaining = text;
        let partIndex = 0;
        
        // Process inline patterns
        const patterns = [
          { regex: /\*\*([^*]+)\*\*/g, render: function(m) { return React.createElement('strong', { key: 'b-' + partIndex++, style: { fontWeight: 600, color: colors.text } }, m); } },
          { regex: /\*([^*]+)\*/g, render: function(m) { return React.createElement('em', { key: 'i-' + partIndex++, style: { fontStyle: 'italic' } }, m); } },
          { regex: /`([^`]+)`/g, render: function(m) { return React.createElement('code', { key: 'c-' + partIndex++, style: { backgroundColor: colors.bgLight, padding: '2px 5px', borderRadius: '3px', fontSize: '11px', fontFamily: 'monospace' } }, m); } },
        ];
        
        // Simple approach: process bold first, then italic, then code
        let result = text;
        
        // Bold
        result = result.replace(/\*\*([^*]+)\*\*/g, '{{BOLD:$1}}');
        // Italic (but not inside bold markers)
        result = result.replace(/(?<!\{)\*([^*]+)\*(?!\})/g, '{{ITALIC:$1}}');
        // Code
        result = result.replace(/`([^`]+)`/g, '{{CODE:$1}}');
        
        // Split and render
        const tokens = result.split(/(\{\{(?:BOLD|ITALIC|CODE):[^}]+\}\})/g);
        
        return tokens.map(function(token, idx) {
          const boldMatch = token.match(/\{\{BOLD:([^}]+)\}\}/);
          if (boldMatch) {
            return React.createElement('strong', { key: idx, style: { fontWeight: 600, color: colors.text } }, boldMatch[1]);
          }
          
          const italicMatch = token.match(/\{\{ITALIC:([^}]+)\}\}/);
          if (italicMatch) {
            return React.createElement('em', { key: idx, style: { fontStyle: 'italic' } }, italicMatch[1]);
          }
          
          const codeMatch = token.match(/\{\{CODE:([^}]+)\}\}/);
          if (codeMatch) {
            return React.createElement('code', { key: idx, style: { backgroundColor: colors.bgLight, padding: '2px 5px', borderRadius: '3px', fontSize: '11px', fontFamily: 'monospace' } }, codeMatch[1]);
          }
          
          return token;
        });
      }

      /**
       * Content view toggle for markdown/raw
       */
      function ContentViewToggle(props) {
        const view = props.view;
        const onChange = props.onChange;
        const autoDetected = props.autoDetected;
        
        return React.createElement('div', {
          style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }
        },
          React.createElement('div', {
            style: { display: 'flex', gap: '2px', backgroundColor: colors.bgLight, borderRadius: '6px', padding: '2px' }
          },
            React.createElement('button', {
              onClick: function() { onChange('formatted'); },
              style: {
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '4px 8px', fontSize: '10px', fontWeight: 500,
                backgroundColor: view === 'formatted' ? colors.bgWhite : 'transparent',
                color: view === 'formatted' ? colors.text : colors.subtext,
                border: 'none', borderRadius: '4px', cursor: 'pointer',
                boxShadow: view === 'formatted' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }
            }, React.createElement(Icon, { name: 'eye', size: 10 }), 'Formatted'),
            React.createElement('button', {
              onClick: function() { onChange('raw'); },
              style: {
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '4px 8px', fontSize: '10px', fontWeight: 500,
                backgroundColor: view === 'raw' ? colors.bgWhite : 'transparent',
                color: view === 'raw' ? colors.text : colors.subtext,
                border: 'none', borderRadius: '4px', cursor: 'pointer',
                boxShadow: view === 'raw' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }
            }, React.createElement(Icon, { name: 'code', size: 10 }), 'Raw')
          ),
          autoDetected ? React.createElement('span', { 
            style: { fontSize: '9px', color: colors.disabled, fontStyle: 'italic' } 
          }, 'auto-detected markdown') : null
        );
      }

      /**
       * Content renderer with markdown support and toggle
       */
      function ContentRenderer(props) {
        const content = props.content;
        const stepId = props.stepId;
        const contentViewModes = props.contentViewModes;
        const onContentViewChange = props.onContentViewChange;
        
        const hasMarkdown = isMarkdown(content);
        const currentView = contentViewModes[stepId] || (hasMarkdown ? 'formatted' : 'raw');
        
        // Show toggle if there's substantial content
        const showToggle = content && content.length > 50;
        
        return React.createElement('div', null,
          showToggle ? React.createElement(ContentViewToggle, {
            view: currentView,
            onChange: function(v) { onContentViewChange(stepId, v); },
            autoDetected: hasMarkdown && !contentViewModes[stepId]
          }) : null,
          currentView === 'formatted' ? 
            renderMarkdown(content) :
            React.createElement('pre', { 
              style: { 
                margin: 0, fontSize: '12px', lineHeight: 1.7, 
                color: colors.textSecondary, whiteSpace: 'pre-wrap',
                fontFamily: 'inherit', backgroundColor: 'transparent'
              } 
            }, content)
        );
      }

      function LabelInput(props) {
        const dimension = props.dimension;
        const value = props.value;
        const onChange = props.onChange;
        const options = dimension.options || [];
        return React.createElement('div', {
          style: { display: 'flex', flexWrap: 'wrap', gap: '6px' }
        }, options.map(function(opt, idx) {
          const isSelected = value === opt;
          let bg = colors.bgLight;
          let borderColor = colors.border;
          let textColor = colors.textSecondary;
          
          if (isSelected) {
            if (opt.includes('Correct') && !opt.includes('Partially') && !opt.includes('Incorrect')) {
              bg = colors.successBg; borderColor = colors.success; textColor = colors.success;
            } else if (opt.includes('Incorrect') || opt.includes('Not ') || opt.includes('Insecure') || opt.includes('Poor') || opt.includes('Inappropriate') || opt.includes('Incomplete') || opt.includes('Unclear') || opt.includes('Confused') || opt.includes('Suboptimal') || opt.includes('Inefficient') || opt.includes('Unnecessary')) {
              bg = colors.errorBg; borderColor = colors.error; textColor = colors.error;
            } else {
              bg = colors.warningBg; borderColor = colors.warning; textColor = colors.warning;
            }
          }
          
          return React.createElement('button', {
            key: opt,
            onClick: function() { onChange(isSelected ? null : opt); },
            style: {
              padding: '6px 12px', fontSize: '11px', fontWeight: 500,
              backgroundColor: bg, color: textColor,
              border: '1.5px solid ' + borderColor, borderRadius: '6px',
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: '4px',
            }
          },
            React.createElement('span', {
              style: {
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '14px', height: '14px', fontSize: '10px',
                backgroundColor: isSelected ? textColor : 'transparent',
                color: isSelected ? '#fff' : textColor,
                borderRadius: '3px', border: isSelected ? 'none' : '1px solid ' + borderColor,
              }
            }, idx + 1),
            opt
          );
        }));
      }

      function ToolContent(props) {
        const step = props.step;
        const viewMode = props.viewMode;
        
        // Get the response data (could be in step.response or step.output)
        const response = step.response || step.output;
        
        if (viewMode === 'raw') {
          return React.createElement('pre', {
            style: { margin: 0, padding: '12px', backgroundColor: '#1E293B', color: '#E2E8F0', borderRadius: '6px', fontSize: '11px', overflow: 'auto', maxHeight: '400px' }
          }, JSON.stringify({ tool: step.tool, input: step.input, output: response }, null, 2));
        }
        
        const children = [];
        
        // Tool name
        children.push(React.createElement('div', { key: 'tool', style: { marginBottom: '12px' } },
          React.createElement('div', { style: { fontSize: '10px', fontWeight: 600, color: colors.subtext, textTransform: 'uppercase', marginBottom: '6px' } }, 'Tool'),
          React.createElement('code', { style: { padding: '6px 10px', backgroundColor: colors.tool.bg, borderRadius: '4px', fontSize: '12px', color: colors.tool.color, fontWeight: 500 } }, step.tool)
        ));
        
        // Input arguments
        if (step.input) {
          children.push(React.createElement('div', { key: 'input', style: { marginBottom: '12px' } },
            React.createElement('div', { style: { fontSize: '10px', fontWeight: 600, color: colors.subtext, textTransform: 'uppercase', marginBottom: '6px' } }, 'Input Arguments'),
            React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
              Object.keys(step.input).map(function(key) {
                const val = step.input[key];
                const displayVal = Array.isArray(val) ? val.join(', ') : (typeof val === 'object' ? JSON.stringify(val) : String(val));
                return React.createElement('span', { 
                  key: key, 
                  style: { 
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '4px 8px', backgroundColor: colors.bgLight, 
                    borderRadius: '4px', fontSize: '11px' 
                  } 
                },
                  React.createElement('span', { style: { color: colors.subtext, fontWeight: 500 } }, key + ':'),
                  React.createElement('span', { style: { color: colors.text } }, displayVal.length > 50 ? displayVal.substring(0, 50) + '...' : displayVal)
                );
              })
            )
          ));
        }
        
        // Response section
        if (response) {
          const responseChildren = [];
          
          // SQL Query (if present)
          if (response.sql || response.sql_query) {
            const sql = response.sql || response.sql_query;
            responseChildren.push(React.createElement('div', { key: 'sql', style: { marginBottom: '12px' } },
              React.createElement('div', { style: { fontSize: '10px', fontWeight: 600, color: colors.subtext, textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' } },
                React.createElement(Icon, { name: 'database', size: 12, color: colors.subtext }),
                'SQL Query'
              ),
              React.createElement('pre', { style: { margin: 0, padding: '10px', backgroundColor: '#1E293B', color: '#A5D6FF', borderRadius: '6px', fontSize: '11px', overflow: 'auto', whiteSpace: 'pre-wrap' } }, sql)
            ));
          }
          
          // Direct table format (columns + rows at root level)
          if (response.columns && response.rows) {
            responseChildren.push(renderTable('Results', response.columns, response.rows, 'direct-table'));
          }
          
          // Named tables (response.tables object)
          if (response.tables && typeof response.tables === 'object') {
            Object.keys(response.tables).forEach(function(tableName) {
              const table = response.tables[tableName];
              if (table.columns && table.rows) {
                responseChildren.push(renderTable(tableName, table.columns, table.rows, 'table-' + tableName));
                // Show SQL for this table if available
                if (table.sql) {
                  responseChildren.push(React.createElement('div', { key: 'sql-' + tableName, style: { marginBottom: '12px', marginTop: '-8px' } },
                    React.createElement('pre', { style: { margin: 0, padding: '8px', backgroundColor: '#1E293B', color: '#A5D6FF', borderRadius: '4px', fontSize: '10px', overflow: 'auto' } }, table.sql)
                  ));
                }
              }
            });
          }
          
          // Plot data (charts)
          if (response.plot_data && typeof response.plot_data === 'object') {
            Object.keys(response.plot_data).forEach(function(chartName) {
              const chart = response.plot_data[chartName];
              responseChildren.push(renderChart(chartName, chart, 'chart-' + chartName));
            });
          }
          
          // Charts in response (alternative location)
          if (response.charts && typeof response.charts === 'object') {
            Object.keys(response.charts).forEach(function(chartName) {
              const chart = response.charts[chartName];
              responseChildren.push(renderChart(chartName, chart, 'chart-' + chartName));
            });
          }
          
          // Summary section (if present)
          if (response.summary && typeof response.summary === 'object') {
            responseChildren.push(React.createElement('div', { key: 'summary', style: { marginBottom: '12px' } },
              React.createElement('div', { style: { fontSize: '10px', fontWeight: 600, color: colors.subtext, textTransform: 'uppercase', marginBottom: '6px' } }, 'Summary'),
              React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } },
                Object.keys(response.summary).map(function(key) {
                  const val = response.summary[key];
                  const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
                  return React.createElement('div', { 
                    key: key, 
                    style: { 
                      padding: '8px 12px', backgroundColor: colors.bgLight, 
                      borderRadius: '6px', border: '1px solid ' + colors.border 
                    } 
                  },
                    React.createElement('div', { style: { fontSize: '10px', color: colors.subtext, marginBottom: '2px' } }, formattedKey),
                    React.createElement('div', { style: { fontSize: '14px', fontWeight: 600, color: colors.text } }, 
                      typeof val === 'number' ? (val < 1 ? (val * 100).toFixed(0) + '%' : val.toLocaleString()) : String(val)
                    )
                  );
                })
              )
            ));
          }
          
          // Other key-value pairs (excluding already rendered items)
          const excludeKeys = ['sql', 'sql_query', 'columns', 'rows', 'tables', 'plot_data', 'charts', 'summary', 'execution_time_ms', 'inference_time_ms', 'row_count', 'model_id'];
          const otherKeys = Object.keys(response).filter(function(k) { return excludeKeys.indexOf(k) === -1; });
          
          if (otherKeys.length > 0) {
            const otherItems = [];
            otherKeys.forEach(function(key) {
              const val = response[key];
              if (val !== null && val !== undefined) {
                if (typeof val === 'object' && !Array.isArray(val)) {
                  // Nested object - render as a card
                  otherItems.push(renderNestedObject(key, val, 'nested-' + key));
                } else if (Array.isArray(val)) {
                  // Array - render appropriately
                  if (val.length > 0 && typeof val[0] === 'object') {
                    // Array of objects - could be a table
                    const cols = Object.keys(val[0]);
                    const rows = val.map(function(item) {
                      return cols.map(function(c) { return item[c]; });
                    });
                    otherItems.push(renderTable(key, cols, rows, 'array-' + key));
                  } else {
                    // Simple array
                    otherItems.push(React.createElement('div', { key: 'arr-' + key, style: { marginBottom: '8px' } },
                      React.createElement('span', { style: { fontSize: '11px', fontWeight: 500, color: colors.subtext } }, key + ': '),
                      React.createElement('span', { style: { fontSize: '11px', color: colors.text } }, val.join(', '))
                    ));
                  }
                } else {
                  // Simple value
                  otherItems.push(React.createElement('div', { key: 'val-' + key, style: { marginBottom: '4px', display: 'flex', gap: '8px' } },
                    React.createElement('span', { style: { fontSize: '11px', fontWeight: 500, color: colors.subtext, minWidth: '100px' } }, key.replace(/_/g, ' ') + ':'),
                    React.createElement('span', { style: { fontSize: '11px', color: colors.text } }, String(val))
                  ));
                }
              }
            });
            
            if (otherItems.length > 0) {
              responseChildren.push(React.createElement('div', { key: 'other', style: { marginTop: '8px' } }, otherItems));
            }
          }
          
          // Metadata footer
          const metaItems = [];
          if (response.execution_time_ms) metaItems.push('Execution: ' + response.execution_time_ms + 'ms');
          if (response.inference_time_ms) metaItems.push('Inference: ' + response.inference_time_ms + 'ms');
          if (response.model_id) metaItems.push('Model: ' + response.model_id);
          if (response.row_count) metaItems.push('Rows: ' + response.row_count);
          
          if (metaItems.length > 0) {
            responseChildren.push(React.createElement('div', { 
              key: 'meta', 
              style: { 
                marginTop: '12px', paddingTop: '8px', borderTop: '1px solid ' + colors.borderLight,
                display: 'flex', gap: '12px', flexWrap: 'wrap'
              } 
            },
              metaItems.map(function(item, i) {
                return React.createElement('span', { key: i, style: { fontSize: '10px', color: colors.disabled } }, item);
              })
            ));
          }
          
          if (responseChildren.length > 0) {
            children.push(React.createElement('div', { key: 'response' },
              React.createElement('div', { style: { fontSize: '10px', fontWeight: 600, color: colors.subtext, textTransform: 'uppercase', marginBottom: '8px' } }, 'Response'),
              React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } }, responseChildren)
            ));
          } else {
            // Fallback: show as JSON if no structured content was rendered
            children.push(React.createElement('div', { key: 'response-fallback' },
              React.createElement('div', { style: { fontSize: '10px', fontWeight: 600, color: colors.subtext, textTransform: 'uppercase', marginBottom: '6px' } }, 'Response'),
              React.createElement('pre', { style: { margin: 0, padding: '10px', backgroundColor: colors.bgLight, borderRadius: '6px', fontSize: '11px', overflow: 'auto', maxHeight: '200px' } },
                JSON.stringify(response, null, 2))
            ));
          }
        }
        
        return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } }, children);
        
        // Helper function to render a table
        function renderTable(title, columns, rows, key) {
          const formattedTitle = title.replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
          
          // Handle rows as array of objects or array of arrays
          const normalizedRows = rows.map(function(row) {
            if (Array.isArray(row)) {
              return row;
            } else if (typeof row === 'object') {
              return columns.map(function(col) { return row[col]; });
            }
            return [row];
          });
          
          return React.createElement('div', { key: key, style: { marginBottom: '12px' } },
            React.createElement('div', { style: { fontSize: '10px', fontWeight: 600, color: colors.subtext, textTransform: 'uppercase', marginBottom: '6px' } }, formattedTitle),
            React.createElement('div', { style: { overflow: 'auto', maxHeight: '250px', border: '1px solid ' + colors.border, borderRadius: '6px' } },
              React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '11px' } },
                React.createElement('thead', null,
                  React.createElement('tr', { style: { backgroundColor: colors.bgLight, position: 'sticky', top: 0 } },
                    columns.map(function(col, i) {
                      const formattedCol = String(col).replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
                      return React.createElement('th', { 
                        key: i, 
                        style: { 
                          padding: '8px 10px', textAlign: 'left', 
                          borderBottom: '2px solid ' + colors.border, 
                          fontWeight: 600, color: colors.textSecondary,
                          whiteSpace: 'nowrap'
                        } 
                      }, formattedCol);
                    })
                  )
                ),
                React.createElement('tbody', null,
                  normalizedRows.map(function(row, i) {
                    return React.createElement('tr', { 
                      key: i, 
                      style: { backgroundColor: i % 2 === 0 ? colors.bgWhite : colors.bgLight }
                    },
                      row.map(function(cell, j) {
                        let cellContent = cell;
                        let cellStyle = { padding: '8px 10px', borderBottom: '1px solid ' + colors.borderLight, color: colors.text };
                        
                        // Format numbers and booleans nicely
                        if (typeof cell === 'number') {
                          if (cell < 1 && cell > 0) {
                            cellContent = (cell * 100).toFixed(1) + '%';
                          } else if (cell >= 1000) {
                            cellContent = cell.toLocaleString();
                          } else {
                            cellContent = cell.toFixed ? cell.toFixed(2) : cell;
                          }
                          cellStyle.fontFamily = 'monospace';
                        } else if (typeof cell === 'boolean') {
                          cellContent = cell ? '✓' : '✗';
                          cellStyle.color = cell ? colors.success : colors.error;
                          cellStyle.fontWeight = 600;
                        } else if (cell === null || cell === undefined) {
                          cellContent = '—';
                          cellStyle.color = colors.disabled;
                        }
                        
                        return React.createElement('td', { key: j, style: cellStyle }, String(cellContent));
                      })
                    );
                  })
                )
              )
            )
          );
        }
        
        // Helper function to render a chart
        function renderChart(title, chartData, key) {
          const formattedTitle = chartData.title || title.replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
          const chartType = chartData.chart_type || 'bar';
          
          return React.createElement('div', { key: key, style: { marginBottom: '12px' } },
            React.createElement('div', { style: { fontSize: '10px', fontWeight: 600, color: colors.subtext, textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' } },
              React.createElement(Icon, { name: 'eye', size: 12, color: colors.subtext }),
              formattedTitle + ' (' + chartType + ' chart)'
            ),
            chartData.data ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
              chartData.data.slice(0, 8).map(function(item, i) {
                const label = item.score_range || item.claim_type || item.label || ('Item ' + (i + 1));
                const value = item.percentage || item.count || item.value || 0;
                const maxVal = Math.max.apply(null, chartData.data.map(function(d) { return d.percentage || d.count || d.value || 0; }));
                const barWidth = maxVal > 0 ? (value / maxVal * 100) : 0;
                
                return React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                  React.createElement('span', { style: { fontSize: '10px', color: colors.textSecondary, width: '80px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, label),
                  React.createElement('div', { style: { flex: 1, height: '16px', backgroundColor: colors.bgLight, borderRadius: '3px', overflow: 'hidden' } },
                    React.createElement('div', { style: { width: barWidth + '%', height: '100%', backgroundColor: colors.tint, borderRadius: '3px', transition: 'width 0.3s' } })
                  ),
                  React.createElement('span', { style: { fontSize: '10px', color: colors.text, width: '50px', textAlign: 'right', fontFamily: 'monospace' } }, 
                    typeof value === 'number' ? (value < 1 && value > 0 ? (value * 100).toFixed(1) + '%' : value.toLocaleString()) : value
                  )
                );
              })
            ) : React.createElement('div', { style: { padding: '16px', backgroundColor: colors.bgLight, borderRadius: '6px', textAlign: 'center', color: colors.subtext, fontSize: '11px' } }, 
              'Chart data available in raw view'
            )
          );
        }
        
        // Helper function to render nested objects
        function renderNestedObject(title, obj, key) {
          const formattedTitle = title.replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
          
          return React.createElement('div', { key: key, style: { marginBottom: '12px' } },
            React.createElement('div', { style: { fontSize: '10px', fontWeight: 600, color: colors.subtext, textTransform: 'uppercase', marginBottom: '6px' } }, formattedTitle),
            React.createElement('div', { style: { padding: '10px', backgroundColor: colors.bgLight, borderRadius: '6px', border: '1px solid ' + colors.borderLight } },
              Object.keys(obj).map(function(k) {
                const v = obj[k];
                const formattedKey = k.replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
                
                if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                  // Sub-nested object
                  return React.createElement('div', { key: k, style: { marginBottom: '8px' } },
                    React.createElement('div', { style: { fontSize: '10px', fontWeight: 600, color: colors.subtext, marginBottom: '4px' } }, formattedKey),
                    React.createElement('div', { style: { paddingLeft: '12px', borderLeft: '2px solid ' + colors.border } },
                      Object.keys(v).map(function(sk) {
                        return React.createElement('div', { key: sk, style: { fontSize: '11px', marginBottom: '2px' } },
                          React.createElement('span', { style: { color: colors.subtext } }, sk.replace(/_/g, ' ') + ': '),
                          React.createElement('span', { style: { color: colors.text } }, String(v[sk]))
                        );
                      })
                    )
                  );
                } else if (Array.isArray(v)) {
                  return React.createElement('div', { key: k, style: { marginBottom: '4px', fontSize: '11px' } },
                    React.createElement('span', { style: { color: colors.subtext } }, formattedKey + ': '),
                    React.createElement('span', { style: { color: colors.text } }, v.join(', '))
                  );
                } else {
                  return React.createElement('div', { key: k, style: { marginBottom: '4px', fontSize: '11px' } },
                    React.createElement('span', { style: { color: colors.subtext } }, formattedKey + ': '),
                    React.createElement('span', { style: { color: colors.text, fontWeight: typeof v === 'number' ? 600 : 400 } }, 
                      typeof v === 'number' ? (v < 1 && v > 0 ? (v * 100).toFixed(0) + '%' : v.toLocaleString()) : String(v)
                    )
                  );
                }
              })
            )
          );
        }
      }

      function FilterDropdown(props) {
        const filter = props.filter;
        const onFilterChange = props.onFilterChange;
        const counts = props.counts;
        const [isOpen, setIsOpen] = useState(false);
        
        const options = [
          { key: 'all', label: 'All Steps', icon: null },
          { key: 'unlabeled', label: 'Unlabeled', icon: null, color: colors.subtext },
          { key: 'correct', label: 'Correct', icon: 'check', color: colors.success },
          { key: 'partial', label: 'Partially Correct', icon: 'alertCircle', color: colors.warning },
          { key: 'incorrect', label: 'Incorrect', icon: 'x', color: colors.error },
        ];
        const current = options.find(function(o) { return o.key === filter; }) || options[0];
        
        const children = [
          React.createElement('button', {
            key: 'trigger',
            onClick: function() { setIsOpen(!isOpen); },
            style: {
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 10px', fontSize: '11px', fontWeight: 500,
              border: '1px solid ' + colors.border, borderRadius: '6px',
              backgroundColor: colors.bgWhite, color: colors.text, cursor: 'pointer',
            }
          },
            React.createElement(Icon, { name: 'filter', size: 12 }),
            current.label,
            React.createElement('span', { style: { fontSize: '10px', color: colors.subtext } }, '(' + counts[filter] + ')'),
            React.createElement(Icon, { name: 'chevronDown', size: 12 })
          )
        ];
        
        if (isOpen) {
          children.push(
            React.createElement('div', {
              key: 'overlay',
              style: { position: 'fixed', inset: 0, zIndex: 10 },
              onClick: function() { setIsOpen(false); }
            }),
            React.createElement('div', {
              key: 'dropdown',
              style: {
                position: 'absolute', top: '100%', left: 0, marginTop: '4px',
                backgroundColor: colors.bgWhite, border: '1px solid ' + colors.border,
                borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 20, minWidth: '180px', overflow: 'hidden',
              }
            }, options.map(function(opt) {
              return React.createElement('button', {
                key: opt.key,
                onClick: function() { onFilterChange(opt.key); setIsOpen(false); },
                style: {
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                  padding: '8px 12px', fontSize: '12px',
                  backgroundColor: filter === opt.key ? colors.bgLight : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  color: opt.color || colors.text,
                }
              },
                opt.icon ? React.createElement(Icon, { name: opt.icon, size: 12, color: opt.color }) : null,
                opt.label,
                React.createElement('span', { style: { marginLeft: 'auto', fontSize: '10px', color: colors.subtext } }, counts[opt.key])
              );
            }))
          );
        }
        
        return React.createElement('div', { style: { position: 'relative' } }, children);
      }

      function ShortcutsPanel(props) {
        if (!props.isOpen) return null;
        
        const shortcuts = [
          { key: '↑/↓ or J/K', desc: 'Navigate steps' },
          { key: '←/→ or H/L', desc: 'Collapse/Expand step' },
          { key: '1-9', desc: 'Select label option' },
          { key: 'N', desc: 'Focus notes field' },
          { key: '/', desc: 'Focus search' },
          { key: 'Esc', desc: 'Clear search / Close panel' },
          { key: 'E', desc: 'Expand all' },
          { key: 'C', desc: 'Collapse all' },
          { key: '?', desc: 'Toggle shortcuts' },
        ];
        
        return React.createElement(React.Fragment, null,
          React.createElement('div', {
            style: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100 },
            onClick: props.onClose
          }),
          React.createElement('div', {
            style: {
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              backgroundColor: colors.bgWhite, borderRadius: '12px', padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)', zIndex: 101, width: '340px',
            }
          },
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
              React.createElement('h3', { style: { margin: 0, fontSize: '16px', fontWeight: 600 } }, 'Keyboard Shortcuts'),
              React.createElement('button', { onClick: props.onClose, style: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px' } },
                React.createElement(Icon, { name: 'x', size: 18, color: colors.subtext })
              )
            ),
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              shortcuts.map(function(s) {
                return React.createElement('div', {
                  key: s.key,
                  style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid ' + colors.borderLight }
                },
                  React.createElement('span', { style: { fontSize: '13px', color: colors.textSecondary } }, s.desc),
                  React.createElement(Kbd, null, s.key)
                );
              })
            )
          )
        );
      }

      function HighlightText(props) {
        const text = props.text;
        const query = props.query;
        if (!query || !query.trim() || !text) return React.createElement(React.Fragment, null, text);
        const regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        const parts = String(text).split(regex);
        return React.createElement(React.Fragment, null,
          parts.map(function(part, i) {
            return regex.test(part) ?
              React.createElement('mark', { key: i, style: { backgroundColor: colors.warningBg, color: colors.warning, padding: '0 2px', borderRadius: '2px' } }, part) :
              React.createElement('span', { key: i }, part);
          })
        );
      }

      // ============================================================================
      // ERROR ALERT COMPONENT
      // ============================================================================
      function ErrorAlert(props) {
        const error = props.error;
        const onDismiss = props.onDismiss;
        const onRetry = props.onRetry;
        
        if (!error) return null;
        
        return React.createElement('div', {
          style: {
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            padding: '12px 14px', backgroundColor: colors.errorBg,
            border: '1px solid ' + colors.error, borderRadius: '8px',
            marginBottom: '12px',
          }
        },
          React.createElement(Icon, { name: 'alertTriangle', size: 16, color: colors.error }),
          React.createElement('div', { style: { flex: 1 } },
            React.createElement('div', { style: { fontSize: '12px', fontWeight: 600, color: colors.error, marginBottom: '4px' } },
              'Error sending message'
            ),
            React.createElement('div', { style: { fontSize: '11px', color: colors.textSecondary } },
              error.message || 'An unknown error occurred'
            )
          ),
          onRetry ? React.createElement('button', {
            onClick: onRetry,
            style: {
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 8px', fontSize: '10px', fontWeight: 500,
              backgroundColor: colors.bgWhite, color: colors.error,
              border: '1px solid ' + colors.error, borderRadius: '4px',
              cursor: 'pointer',
            }
          },
            React.createElement(Icon, { name: 'refreshCw', size: 10, color: colors.error }),
            'Retry'
          ) : null,
          React.createElement('button', {
            onClick: onDismiss,
            style: {
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
            }
          },
            React.createElement(Icon, { name: 'x', size: 14, color: colors.error })
          )
        );
      }

      // ============================================================================
      // TREE NODE COMPONENT
      // ============================================================================
      function VirtualizedTreeNode(props) {
        const step = props.step;
        const depth = props.depth;
        const labelsMap = props.labels;
        const selectedStep = props.selectedStep;
        const onSelect = props.onSelect;
        const expandedSteps = props.expandedSteps;
        const onToggle = props.onToggle;
        const viewModes = props.viewModes;
        const onViewModeChange = props.onViewModeChange;
        const contentViewModes = props.contentViewModes;
        const onContentViewChange = props.onContentViewChange;
        const searchQuery = props.searchQuery;
        const isLast = props.isLast;
        // Editing props
        const editingStepId = props.editingStepId;
        const editingContent = props.editingContent;
        const onEditStart = props.onEditStart;
        const onEditCancel = props.onEditCancel;
        const onEditSubmit = props.onEditSubmit;
        const onEditChange = props.onEditChange;
        const isProcessing = props.isProcessing;
        
        const isSelected = selectedStep === step.id;
        const isExpanded = expandedSteps.has(step.id);
        const hasChildren = step.children && step.children.length > 0;
        const ontology = getOntologyForStep(step);
        const firstDim = ontology.dimensions.find(function(d) { return d.type === 'single-select'; });
        const statusValue = firstDim ? (labelsMap[step.id] && labelsMap[step.id][firstDim.key]) : null;
        const isEditing = editingStepId === step.id;
        const canEdit = step.type === 'user_message' && !isProcessing;
        
        function getStatusStyle(val) {
          if (!val) return null;
          if (val.includes('Correct') && !val.includes('Partially') && !val.includes('Incorrect')) {
            return { bg: colors.successBg, color: colors.success, icon: 'check' };
          }
          if (val.includes('Incorrect')) {
            return { bg: colors.errorBg, color: colors.error, icon: 'x' };
          }
          return { bg: colors.warningBg, color: colors.warning, icon: 'alertCircle' };
        }

        const statusStyle = getStatusStyle(statusValue);
        const indentPx = depth * 24;
        
        const treeLines = [];
        if (depth > 0) {
          treeLines.push(React.createElement('div', {
            key: 'vline',
            style: {
              position: 'absolute',
              left: (indentPx - 12) + 'px',
              top: 0,
              bottom: isLast ? '50%' : 0,
              width: '1px',
              backgroundColor: colors.border,
            }
          }));
          treeLines.push(React.createElement('div', {
            key: 'hline',
            style: {
              position: 'absolute',
              left: (indentPx - 12) + 'px',
              top: '18px',
              width: '12px',
              height: '1px',
              backgroundColor: colors.border,
            }
          }));
        }
        
        const headerContent = [
          isExpanded ? React.createElement(Icon, { key: 'chevron', name: 'chevronDown', size: 14, color: colors.subtext }) : React.createElement(Icon, { key: 'chevron', name: 'chevronRight', size: 14, color: colors.subtext }),
          React.createElement(StepTypeBadge, { key: 'badge', type: step.type }),
          React.createElement('span', { key: 'label', style: { flex: 1, fontSize: '12px', fontWeight: 500, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
            React.createElement(HighlightText, { text: step.label || (step.type === 'tool_call' ? step.tool : (step.content ? step.content.slice(0, 60) : '')), query: searchQuery })
          ),
          React.createElement('span', { key: 'time', style: { fontSize: '10px', color: colors.disabled } }, step.timestamp),
        ];
        
        if (statusStyle) {
          headerContent.push(React.createElement('span', {
            key: 'status',
            style: {
              padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '4px',
              backgroundColor: statusStyle.bg, color: statusStyle.color,
            }
          },
            React.createElement(Icon, { name: statusStyle.icon, size: 10, color: statusStyle.color }),
            statusValue
          ));
        }
        
        let expandedContent = null;
        if (isExpanded) {
          const contentChildren = [];
          if (step.type === 'tool_call') {
            contentChildren.push(React.createElement('div', { key: 'toggle', style: { display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' } },
              React.createElement(ViewToggle, { view: viewModes[step.id] || 'pretty', onChange: function(mode) { onViewModeChange(step.id, mode); } })
            ));
            contentChildren.push(React.createElement(ToolContent, { key: 'tool', step: step, viewMode: viewModes[step.id] || 'pretty' }));
          } else if (step.type === 'user_message' && isEditing) {
            // Edit mode for user message
            contentChildren.push(React.createElement('div', { key: 'edit-form', style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
              React.createElement('textarea', {
                value: editingContent,
                onChange: function(e) { onEditChange(e.target.value); },
                style: {
                  width: '100%', padding: '10px 12px', fontSize: '12px',
                  border: '1px solid ' + colors.tint, borderRadius: '6px',
                  resize: 'vertical', minHeight: '80px', fontFamily: 'inherit',
                  color: colors.text, boxSizing: 'border-box',
                },
                autoFocus: true
              }),
              React.createElement('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } },
                React.createElement('button', {
                  onClick: onEditCancel,
                  style: {
                    padding: '6px 12px', fontSize: '11px', fontWeight: 500,
                    backgroundColor: colors.bgLight, color: colors.textSecondary,
                    border: '1px solid ' + colors.border, borderRadius: '6px',
                    cursor: 'pointer',
                  }
                }, 'Cancel'),
                React.createElement('button', {
                  onClick: onEditSubmit,
                  disabled: !editingContent.trim(),
                  style: {
                    padding: '6px 12px', fontSize: '11px', fontWeight: 500,
                    backgroundColor: editingContent.trim() ? colors.tint : colors.disabled,
                    color: '#FFFFFF', border: 'none', borderRadius: '6px',
                    cursor: editingContent.trim() ? 'pointer' : 'not-allowed',
                  }
                }, 'Save & Resend')
              )
            ));
          } else if (step.type === 'user_message') {
            // View mode for user message with edit button
            contentChildren.push(React.createElement('div', { key: 'content-wrapper', style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
              React.createElement('p', { style: { margin: 0, fontSize: '12px', lineHeight: 1.7, color: colors.textSecondary, whiteSpace: 'pre-wrap' } }, step.content),
              canEdit ? React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
                React.createElement('button', {
                  onClick: function(e) { e.stopPropagation(); onEditStart(step.id); },
                  style: {
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '4px 10px', fontSize: '10px', fontWeight: 500,
                    backgroundColor: colors.bgLight, color: colors.subtext,
                    border: '1px solid ' + colors.border, borderRadius: '4px',
                    cursor: 'pointer',
                  }
                },
                  React.createElement(Icon, { name: 'edit', size: 10, color: colors.subtext }),
                  'Edit & Resend'
                )
              ) : null
            ));
          } else {
            contentChildren.push(React.createElement(ContentRenderer, { 
              key: 'content', 
              content: step.content,
              stepId: step.id,
              contentViewModes: contentViewModes,
              onContentViewChange: onContentViewChange
            }));
          }
          expandedContent = React.createElement('div', { style: { padding: '12px 14px' } }, contentChildren);
        }
        
        let childNodes = null;
        if (hasChildren) {
          childNodes = React.createElement('div', { style: { position: 'relative' } },
            step.children.map(function(child, index) {
              return React.createElement(VirtualizedTreeNode, {
                key: child.id,
                step: child,
                depth: depth + 1,
                labels: labelsMap,
                selectedStep: selectedStep,
                onSelect: onSelect,
                expandedSteps: expandedSteps,
                onToggle: onToggle,
                viewModes: viewModes,
                onViewModeChange: onViewModeChange,
                contentViewModes: contentViewModes,
                onContentViewChange: onContentViewChange,
                searchQuery: searchQuery,
                isLast: index === step.children.length - 1,
                // Editing props
                editingStepId: editingStepId,
                editingContent: editingContent,
                onEditStart: onEditStart,
                onEditCancel: onEditCancel,
                onEditSubmit: onEditSubmit,
                onEditChange: onEditChange,
                isProcessing: isProcessing,
              });
            })
          );
        }
        
        return React.createElement('div', { 'data-step-id': step.id, style: { position: 'relative', marginBottom: '4px' } },
          treeLines,
          React.createElement('div', { style: { marginLeft: indentPx + 'px' } },
            React.createElement('div', {
              onClick: function() { onSelect(step.id); },
              style: {
                backgroundColor: isSelected ? colors.selected : colors.bgWhite,
                border: '1px solid ' + (isSelected ? colors.tint : colors.border),
                borderRadius: '8px', cursor: 'pointer',
                boxShadow: isSelected ? '0 0 0 2px ' + colors.tintMuted : 'none',
                transition: 'box-shadow 0.15s',
                marginBottom: hasChildren ? '4px' : 0,
              }
            },
              React.createElement('div', {
                onClick: function(e) { e.stopPropagation(); onToggle(step.id); },
                style: {
                  display: 'flex', alignItems: 'center', padding: '8px 12px', gap: '10px',
                  backgroundColor: isExpanded ? colors.bgLight : 'transparent',
                  borderBottom: isExpanded ? '1px solid ' + colors.borderLight : 'none',
                  borderRadius: isExpanded ? '8px 8px 0 0' : '8px',
                }
              }, headerContent),
              expandedContent
            ),
            childNodes
          )
        );
      }

      function FlatStepItem(props) {
        const step = props.step;
        const labelsMap = props.labels;
        const selectedStep = props.selectedStep;
        const onSelect = props.onSelect;
        const expandedSteps = props.expandedSteps;
        const onToggle = props.onToggle;
        const viewModes = props.viewModes;
        const onViewModeChange = props.onViewModeChange;
        const contentViewModes = props.contentViewModes;
        const onContentViewChange = props.onContentViewChange;
        
        const isSelected = selectedStep === step.id;
        const isExpanded = expandedSteps.has(step.id);
        const ontology = getOntologyForStep(step);
        const firstDim = ontology.dimensions.find(function(d) { return d.type === 'single-select'; });
        const statusValue = firstDim ? (labelsMap[step.id] && labelsMap[step.id][firstDim.key]) : null;

        function getStatusStyle(val) {
          if (!val) return null;
          if (val.includes('Correct') && !val.includes('Partially') && !val.includes('Incorrect')) {
            return { bg: colors.successBg, color: colors.success, icon: 'check' };
          }
          if (val.includes('Incorrect')) {
            return { bg: colors.errorBg, color: colors.error, icon: 'x' };
          }
          return { bg: colors.warningBg, color: colors.warning, icon: 'alertCircle' };
        }

        const statusStyle = getStatusStyle(statusValue);
        
        const headerContent = [
          isExpanded ? React.createElement(Icon, { key: 'chevron', name: 'chevronDown', size: 14, color: colors.subtext }) : React.createElement(Icon, { key: 'chevron', name: 'chevronRight', size: 14, color: colors.subtext }),
          React.createElement(StepTypeBadge, { key: 'badge', type: step.type }),
          React.createElement('span', { key: 'label', style: { flex: 1, fontSize: '12px', fontWeight: 500, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
            step.label || (step.type === 'tool_call' ? step.tool : (step.content ? step.content.slice(0, 60) : ''))
          ),
          React.createElement('span', { key: 'time', style: { fontSize: '10px', color: colors.disabled } }, step.timestamp),
        ];
        
        if (statusStyle) {
          headerContent.push(React.createElement('span', {
            key: 'status',
            style: {
              padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '4px',
              backgroundColor: statusStyle.bg, color: statusStyle.color,
            }
          },
            React.createElement(Icon, { name: statusStyle.icon, size: 10, color: statusStyle.color }),
            statusValue
          ));
        }
        
        let expandedContent = null;
        if (isExpanded) {
          const contentChildren = [];
          if (step.type === 'tool_call') {
            contentChildren.push(React.createElement('div', { key: 'toggle', style: { display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' } },
              React.createElement(ViewToggle, { view: viewModes[step.id] || 'pretty', onChange: function(mode) { onViewModeChange(step.id, mode); } })
            ));
            contentChildren.push(React.createElement(ToolContent, { key: 'tool', step: step, viewMode: viewModes[step.id] || 'pretty' }));
          } else {
            contentChildren.push(React.createElement(ContentRenderer, { 
              key: 'content', 
              content: step.content,
              stepId: step.id,
              contentViewModes: contentViewModes,
              onContentViewChange: onContentViewChange
            }));
          }
          expandedContent = React.createElement('div', { style: { padding: '12px 14px' } }, contentChildren);
        }

        return React.createElement('div', { 'data-step-id': step.id },
          React.createElement('div', {
            onClick: function() { onSelect(step.id); },
            style: {
              backgroundColor: isSelected ? colors.selected : colors.bgWhite,
              border: '1px solid ' + (isSelected ? colors.tint : colors.border),
              borderRadius: '8px', marginBottom: '4px', cursor: 'pointer',
              boxShadow: isSelected ? '0 0 0 2px ' + colors.tintMuted : 'none',
              transition: 'box-shadow 0.15s',
            }
          },
            React.createElement('div', {
              onClick: function(e) { e.stopPropagation(); onToggle(step.id); },
              style: {
                display: 'flex', alignItems: 'center', padding: '8px 12px', gap: '10px',
                backgroundColor: isExpanded ? colors.bgLight : 'transparent',
                borderBottom: isExpanded ? '1px solid ' + colors.borderLight : 'none',
                borderRadius: isExpanded ? '8px 8px 0 0' : '8px',
              }
            }, headerContent),
            expandedContent
          )
        );
      }

      function ChatInput(props) {
        const onSend = props.onSend;
        const onCancel = props.onCancel;
        const disabled = props.disabled;
        const isSending = props.isSending;
        const [value, setValue] = useState('');
        
        function handleSend() {
          if (value.trim() && !disabled && !isSending) {
            onSend(value.trim());
            setValue('');
          }
        }
        
        return React.createElement('div', { style: { display: 'flex', gap: '8px', padding: '12px', backgroundColor: colors.bgWhite } },
          React.createElement('textarea', {
            value: value,
            onChange: function(e) { setValue(e.target.value); },
            onKeyDown: function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } },
            placeholder: 'Send a message to steer or correct the agent...',
            disabled: disabled || isSending,
            style: { 
              flex: 1, padding: '12px 14px', fontSize: '13px', 
              border: '1px solid ' + colors.border, borderRadius: '8px', 
              resize: 'none', fontFamily: 'inherit', color: colors.text, minHeight: '80px',
              opacity: isSending ? 0.7 : 1,
            },
            rows: 3
          }),
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', alignSelf: 'flex-end' } },
            isSending ? React.createElement('button', {
              onClick: onCancel,
              style: {
                padding: '12px 20px', backgroundColor: colors.error,
                color: '#FFFFFF', border: 'none', borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500,
              }
            },
              React.createElement(Icon, { name: 'stopCircle', size: 14, color: '#FFFFFF' }),
              'Cancel'
            ) : React.createElement('button', {
              onClick: handleSend,
              disabled: !value.trim() || disabled,
              style: {
                padding: '12px 20px', backgroundColor: value.trim() && !disabled ? colors.tint : colors.disabled,
                color: '#FFFFFF', border: 'none', borderRadius: '8px',
                cursor: value.trim() && !disabled ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500,
              }
            },
              React.createElement(Icon, { name: 'send', size: 14, color: '#FFFFFF' }),
              'Send'
            )
          )
        );
      }

      function ProgressBar(props) {
        const total = props.total;
        const labeled = props.labeled;
        const pct = Math.round((labeled / total) * 100);
        return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
          React.createElement('div', { style: { flex: 1, height: '6px', backgroundColor: colors.bgLight, borderRadius: '3px', overflow: 'hidden' } },
            React.createElement('div', { style: { width: pct + '%', height: '100%', backgroundColor: pct === 100 ? colors.success : colors.tint, borderRadius: '3px', transition: 'width 0.3s ease' } })
          ),
          React.createElement('span', { style: { fontSize: '12px', color: colors.subtext, fontWeight: 500 } }, labeled + '/' + total)
        );
      }

      function flattenSteps(steps, depth) {
        depth = depth || 0;
        let result = [];
        steps.forEach(function(step) {
          result.push(Object.assign({}, step, { _depth: depth }));
          if (step.children && step.children.length > 0) {
            result = result.concat(flattenSteps(step.children, depth + 1));
          }
        });
        return result;
      }

      // ============================================================================
      // COLLAPSIBLE USER QUERY COMPONENT
      // ============================================================================
      function CollapsibleUserQuery(props) {
        const query = props.query;
        const isCollapsed = props.isCollapsed;
        const onToggle = props.onToggle;
        
        return React.createElement('div', {
          style: { 
            backgroundColor: colors.bgWhite, 
            border: '1px solid ' + colors.border, 
            borderLeft: '4px solid ' + colors.tint, 
            borderRadius: '8px', 
            marginBottom: '12px', 
            flexShrink: 0,
            overflow: 'hidden',
          }
        },
          React.createElement('div', {
            onClick: onToggle,
            style: { 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '10px 16px', 
              cursor: 'pointer',
              backgroundColor: isCollapsed ? 'transparent' : colors.bgLight,
              borderBottom: isCollapsed ? 'none' : '1px solid ' + colors.borderLight,
            }
          },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
              React.createElement('div', { 
                style: { 
                  fontSize: '10px', 
                  fontWeight: 600, 
                  color: colors.subtext, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px',
                }
              }, 'User Query'),
              isCollapsed ? React.createElement('div', { 
                style: { 
                  fontSize: '12px', 
                  color: colors.textSecondary, 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  maxWidth: '400px',
                }
              }, query) : null
            ),
            React.createElement('div', { 
              style: { 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px',
                color: colors.subtext,
                fontSize: '10px',
              }
            },
              isCollapsed ? 'Show' : 'Hide',
              React.createElement(Icon, { name: isCollapsed ? 'chevronDown' : 'chevronUp', size: 14, color: colors.subtext })
            )
          ),
          !isCollapsed ? React.createElement('div', { 
            style: { 
              padding: '12px 16px', 
              fontSize: '14px', 
              color: colors.text, 
              lineHeight: 1.6,
              maxHeight: '120px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
            }
          }, query) : null
        );
      }

      // ============================================================================
      // COLLAPSIBLE CHAT SECTION COMPONENT
      // ============================================================================
      function CollapsibleChatSection(props) {
        const isProcessing = props.isProcessing;
        const onSendMessage = props.onSendMessage;
        const onCancelSending = props.onCancelSending;
        const isChatActive = props.isChatActive;
        const onChatActivate = props.onChatActivate;
        const isChatExpanded = props.isChatExpanded;
        const onToggleChatExpand = props.onToggleChatExpand;
        const chatError = props.chatError;
        const onDismissError = props.onDismissError;
        const onRetry = props.onRetry;
        
        if (!isChatActive) {
          return React.createElement('div', {
            onClick: onChatActivate,
            style: { 
              marginTop: '12px', 
              padding: '10px 16px', 
              backgroundColor: colors.bgWhite, 
              border: '1px solid ' + colors.border, 
              borderRadius: '8px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
              transition: 'background-color 0.15s',
            }
          },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
              React.createElement(Icon, { name: 'messageSquare', size: 14, color: colors.subtext }),
              React.createElement('span', { style: { fontSize: '12px', color: colors.subtext } },
                'Need to steer or correct the agent? Click to send a message'
              )
            ),
            React.createElement('div', { 
              style: { 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px',
                color: colors.tint,
                fontSize: '11px',
                fontWeight: 500,
              }
            },
              'Open',
              React.createElement(Icon, { name: 'chevronRight', size: 14, color: colors.tint })
            )
          );
        }
        
        const children = [
          React.createElement('div', {
            key: 'header',
            onClick: onToggleChatExpand,
            style: { 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '10px 14px', 
              backgroundColor: colors.tintLight,
              borderBottom: isChatExpanded ? '1px solid ' + colors.border : 'none',
              cursor: 'pointer',
            }
          },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
              React.createElement(Icon, { name: 'messageSquare', size: 14, color: colors.tint }),
              React.createElement('span', { style: { fontSize: '12px', fontWeight: 600, color: colors.tint } },
                'Send Message'
              ),
              isProcessing ? React.createElement('span', {
                style: {
                  fontSize: '10px',
                  color: colors.warning,
                  backgroundColor: colors.warningBg,
                  padding: '2px 6px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }
              }, '⏳ Processing...') : null
            ),
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '4px', color: colors.tint } },
              React.createElement(Icon, { name: isChatExpanded ? 'chevronDown' : 'chevronUp', size: 14, color: colors.tint })
            )
          )
        ];
        
        if (isChatExpanded) {
          // Error alert
          if (chatError) {
            children.push(React.createElement('div', { key: 'error', style: { padding: '12px' } },
              React.createElement(ErrorAlert, {
                error: chatError,
                onDismiss: onDismissError,
                onRetry: onRetry,
              })
            ));
          }
          
          children.push(React.createElement(ChatInput, { 
            key: 'input', 
            onSend: onSendMessage, 
            onCancel: onCancelSending,
            disabled: false, 
            isSending: isProcessing,
          }));
        }
        
        return React.createElement('div', {
          style: { 
            marginTop: '12px', 
            backgroundColor: colors.bgWhite, 
            border: '1px solid ' + colors.tint, 
            borderRadius: '8px', 
            overflow: 'hidden', 
            flexShrink: 0,
            boxShadow: '0 0 0 2px ' + colors.tintMuted,
          }
        }, children);
      }

      // ============================================================================
      // STATE MANAGEMENT
      // ============================================================================
      
      // Debug: Log regions on init
      console.log('=== INIT: regions received ===', regions);
      console.log('=== INIT: regions length ===', regions.length);
      console.log('=== INIT: data received ===', data);
      regions.forEach(function(r, i) {
        console.log('Region ' + i + ':', r);
        if (r.value) console.log('Region ' + i + ' value:', r.value);
      });
      
      const [task, setTask] = useState(function() {
        // Transform tree data to steps format (data is the tree directly via data="$tree")
        const transformedData = transformTraceToSteps(data);
        
        if (transformedData) {
          console.log('=== Transformed tree data ===', transformedData);
          // Load any saved steps from regions
          const savedSteps = [];
          regions.forEach(function(region) {
            let step = null;
            if (region.value && region.value.custominterface && region.value.custominterface.step) {
              step = region.value.custominterface.step;
            } else if (region.value && region.value.step) {
              step = region.value.step;
            } else if (region.step) {
              step = region.step;
            }
            
            if (step && (step.type === 'user_message' || step.type === 'assistant_response')) {
              console.log('Found saved step:', step);
              savedSteps.push(step);
            }
          });
          
          // Sort saved steps by timestamp in ID
          savedSteps.sort(function(a, b) {
            const getTimestamp = function(id) {
              const match = (id || '').match(/(\d+)$/);
              return match ? parseInt(match[1], 10) : 0;
            };
            return getTimestamp(a.id) - getTimestamp(b.id);
          });
          
          // Merge saved steps with transformed data
          if (savedSteps.length > 0) {
            transformedData.steps = transformedData.steps.concat(savedSteps);
          }
          
          return transformedData;
        }
        
        // Fallback: Return empty structure if transformation fails
        console.warn('Failed to transform tree data, using fallback');
        return {
          id: 'fallback-' + Date.now(),
          query: 'No query provided',
          steps: [],
          conversation: [],
        };
      });
      
      const [labels, setLabels] = useState(function() {
        const initialLabels = {};
        regions.forEach(function(region) {
          let stepId = null;
          let labelData = null;
          
          if (region.value && region.value.custominterface) {
            stepId = region.value.custominterface.stepId;
            labelData = region.value.custominterface.labels;
          } else if (region.value) {
            stepId = region.value.stepId;
            labelData = region.value.labels;
          }
          
          if (stepId && labelData) {
            initialLabels[stepId] = labelData;
          }
        });
        console.log('Loaded labels:', initialLabels);
        return initialLabels;
      });
      
      const [expandedSteps, setExpandedSteps] = useState(function() { return new Set(['main']); });
      const [selectedStep, setSelectedStep] = useState('main');
      const [viewModes, setViewModes] = useState({});
      const [contentViewModes, setContentViewModes] = useState({});
      const [isProcessing, setIsProcessing] = useState(false);
      const [searchQuery, setSearchQuery] = useState('');
      const [filter, setFilter] = useState('all');
      const [showShortcuts, setShowShortcuts] = useState(false);
      const [isQueryCollapsed, setIsQueryCollapsed] = useState(false);
      const [isChatActive, setIsChatActive] = useState(false);
      const [isChatExpanded, setIsChatExpanded] = useState(true);
      const [chatError, setChatError] = useState(null);
      const [lastUserMessage, setLastUserMessage] = useState(null);
      const [editingStepId, setEditingStepId] = useState(null);
      const [editingContent, setEditingContent] = useState('');
      
      const searchInputRef = useRef(null);
      const notesRef = useRef(null);
      const listContainerRef = useRef(null);
      const abortControllerRef = useRef(null);

      const allSteps = useMemo(function() { return flattenSteps(task.steps || []); }, [task.steps]);
      
      const filterCounts = useMemo(function() {
        const counts = { all: allSteps.length, unlabeled: 0, correct: 0, partial: 0, incorrect: 0 };
        allSteps.forEach(function(step) {
          const status = getStepStatus(step, labels);
          counts[status]++;
        });
        return counts;
      }, [allSteps, labels]);
      
      const filteredSteps = useMemo(function() {
        let result = allSteps;
        
        if (filter !== 'all') {
          result = result.filter(function(step) { return getStepStatus(step, labels) === filter; });
        }
        
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          result = result.filter(function(step) {
            const label = (step.label || '').toLowerCase();
            const content = (step.content || '').toLowerCase();
            const tool = (step.tool || '').toLowerCase();
            return label.includes(q) || content.includes(q) || tool.includes(q);
          });
        }
        
        return result;
      }, [allSteps, filter, labels, searchQuery]);

      const currentStep = allSteps.find(function(s) { return s.id === selectedStep; });
      const currentOntology = currentStep ? getOntologyForStep(currentStep) : null;
      const labeledCount = allSteps.filter(function(s) {
        const ont = getOntologyForStep(s);
        const firstDim = ont.dimensions.find(function(d) { return d.type === 'single-select'; });
        return firstDim && labels[s.id] && labels[s.id][firstDim.key];
      }).length;

      const handleLabelChange = useCallback(function(stepId, key, value) {
        console.log('=== LABEL CHANGE ===', { stepId, key, value });
        setLabels(function(prev) {
          const newLabels = Object.assign({}, prev);
          newLabels[stepId] = Object.assign({}, prev[stepId] || {});
          newLabels[stepId][key] = value;
          
          const existingRegion = regions.find(function(r) {
            return r.value && r.value.custominterface && r.value.custominterface.stepId === stepId;
          });
          
          console.log('Existing region found:', existingRegion);
          
          if (existingRegion) {
            const existingStep = existingRegion.value.custominterface.step;
            console.log('Updating existing region with step:', existingStep);
            existingRegion.update({
              stepId: stepId,
              step: existingStep,
              labels: newLabels[stepId]
            });
          } else {
            console.log('Creating new region for labels');
            addRegion({
              stepId: stepId,
              labels: newLabels[stepId]
            });
          }
          
          return newLabels;
        });
      }, [regions, addRegion]);

      const toggleStep = useCallback(function(stepId) {
        setExpandedSteps(function(prev) {
          const next = new Set(prev);
          if (next.has(stepId)) next.delete(stepId);
          else next.add(stepId);
          return next;
        });
      }, []);

      const handleViewModeChange = useCallback(function(stepId, mode) {
        setViewModes(function(prev) {
          const newModes = Object.assign({}, prev);
          newModes[stepId] = mode;
          return newModes;
        });
      }, []);

      const handleContentViewChange = useCallback(function(stepId, mode) {
        setContentViewModes(function(prev) {
          const newModes = Object.assign({}, prev);
          newModes[stepId] = mode;
          return newModes;
        });
      }, []);

      const expandAll = useCallback(function() {
        setExpandedSteps(new Set(allSteps.map(function(s) { return s.id; })));
      }, [allSteps]);

      const collapseAll = useCallback(function() {
        setExpandedSteps(new Set());
      }, []);

      const cancelSending = useCallback(function() {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
        setIsProcessing(false);
      }, []);

      // ============================================================================
      // SEND MESSAGE HANDLER - SENDS FULL TRACE AND ADDS RESPONSE AS NEW STEPS
      // ============================================================================
      const handleSendMessage = useCallback(async function(message) {
        setLastUserMessage(message);
        setChatError(null);
        
        const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        
        const userStepId = 'user-msg-' + Date.now();
        const userStep = {
          id: userStepId,
          type: 'user_message',
          label: 'User Message',
          content: message,
          timestamp: ts,
          children: []
        };
        
        console.log('=== SAVING USER STEP AS REGION ===', userStep);
        const userRegion = addRegion({
          stepId: userStepId,
          step: userStep,
          labels: {}
        });
        console.log('User region created:', userRegion);
        
        setTask(function(prev) {
          return Object.assign({}, prev, {
            steps: prev.steps.concat([userStep])
          });
        });
        
        setExpandedSteps(function(prev) {
          const next = new Set(prev);
          next.add(userStepId);
          return next;
        });
        
        if (!CONFIG.claude.enabled) {
          return;
        }
        
        setIsProcessing(true);
        abortControllerRef.current = new AbortController();
        
        try {
          const traceWithUserMsg = task.steps.concat([userStep]);
          const serializedTrace = serializeTrace(task.query, traceWithUserMsg);
          
          const responseContent = await sendToClaude({
            trace: serializedTrace,
            userMessage: message,
            signal: abortControllerRef.current.signal,
          });
          
          if (!responseContent) {
            throw new Error('No response received');
          }
          
          const assistantStepId = 'assistant-resp-' + Date.now();
          const assistantStep = {
            id: assistantStepId,
            type: 'assistant_response',
            label: 'Assistant Response',
            content: responseContent,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            children: []
          };
          
          console.log('=== SAVING ASSISTANT STEP AS REGION ===', assistantStep);
          const assistantRegion = addRegion({
            stepId: assistantStepId,
            step: assistantStep,
            labels: {}
          });
          console.log('Assistant region created:', assistantRegion);
          
          setTask(function(prev) {
            return Object.assign({}, prev, {
              steps: prev.steps.concat([assistantStep])
            });
          });
          
          setExpandedSteps(function(prev) {
            const next = new Set(prev);
            next.add(assistantStepId);
            return next;
          });
          
          setSelectedStep(assistantStepId);
          
        } catch (error) {
          if (error.name === 'AbortError') {
            return;
          }
          
          console.error('API Error:', error);
          setChatError({
            code: CHAT_ERROR.HTTP_ERROR,
            message: error.message || 'Failed to get response',
          });
          
        } finally {
          setIsProcessing(false);
          abortControllerRef.current = null;
        }
      }, [task.query, task.steps, addRegion]);

      const startEditingStep = useCallback(function(stepId) {
        const step = task.steps.find(function(s) { return s.id === stepId; });
        if (step && step.type === 'user_message') {
          setEditingStepId(stepId);
          setEditingContent(step.content || '');
        }
      }, [task.steps]);

      const cancelEditing = useCallback(function() {
        setEditingStepId(null);
        setEditingContent('');
      }, []);

      const submitEditedMessage = useCallback(async function() {
        if (!editingStepId || !editingContent.trim()) return;
        
        const stepIndex = task.steps.findIndex(function(s) { return s.id === editingStepId; });
        if (stepIndex === -1) return;
        
        const stepsToRemove = task.steps.slice(stepIndex + 1);
        const idsToRemove = stepsToRemove.map(function(s) { return s.id; });
        
        console.log('=== EDITING: Removing steps after index', stepIndex, ':', idsToRemove);
        
        idsToRemove.forEach(function(idToRemove) {
          const regionToDelete = regions.find(function(r) {
            if (r.value && r.value.custominterface && r.value.custominterface.stepId === idToRemove) {
              return true;
            }
            return false;
          });
          if (regionToDelete) {
            console.log('Deleting region for step:', idToRemove);
            regionToDelete.deleteRegion();
          }
          setLabels(function(prev) {
            const newLabels = Object.assign({}, prev);
            delete newLabels[idToRemove];
            return newLabels;
          });
        });
        
        const updatedSteps = task.steps.slice(0, stepIndex + 1);
        const editedStep = Object.assign({}, updatedSteps[stepIndex], {
          content: editingContent.trim(),
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
        });
        updatedSteps[stepIndex] = editedStep;
        
        const editedRegion = regions.find(function(r) {
          return r.value && r.value.custominterface && r.value.custominterface.stepId === editingStepId;
        });
        if (editedRegion) {
          editedRegion.update({
            stepId: editingStepId,
            step: editedStep,
            labels: labels[editingStepId] || {}
          });
        }
        
        setTask(function(prev) {
          return Object.assign({}, prev, {
            steps: updatedSteps
          });
        });
        
        const editedMessage = editingContent.trim();
        setEditingStepId(null);
        setEditingContent('');
        setChatError(null);
        
        if (!CONFIG.claude.enabled) {
          return;
        }
        
        setIsProcessing(true);
        abortControllerRef.current = new AbortController();
        
        try {
          const serializedTrace = serializeTrace(task.query, updatedSteps);
          
          const responseContent = await sendToClaude({
            trace: serializedTrace,
            userMessage: editedMessage,
            signal: abortControllerRef.current.signal,
          });
          
          if (!responseContent) {
            throw new Error('No response received');
          }
          
          const assistantStepId = 'assistant-resp-' + Date.now();
          const assistantStep = {
            id: assistantStepId,
            type: 'assistant_response',
            label: 'Assistant Response',
            content: responseContent,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            children: []
          };
          
          console.log('=== SAVING NEW ASSISTANT STEP AFTER EDIT ===', assistantStep);
          addRegion({
            stepId: assistantStepId,
            step: assistantStep,
            labels: {}
          });
          
          setTask(function(prev) {
            return Object.assign({}, prev, {
              steps: prev.steps.concat([assistantStep])
            });
          });
          
          setExpandedSteps(function(prev) {
            const next = new Set(prev);
            next.add(assistantStepId);
            return next;
          });
          
          setSelectedStep(assistantStepId);
          
        } catch (error) {
          if (error.name === 'AbortError') {
            return;
          }
          
          console.error('API Error:', error);
          setChatError({
            code: CHAT_ERROR.HTTP_ERROR,
            message: error.message || 'Failed to get response',
          });
          
        } finally {
          setIsProcessing(false);
          abortControllerRef.current = null;
        }
      }, [editingStepId, editingContent, task.query, task.steps, regions, labels, addRegion]);

      const retryLastMessage = useCallback(function() {
        if (lastUserMessage) {
          setChatError(null);
          handleSendMessage(lastUserMessage);
        }
      }, [lastUserMessage, handleSendMessage]);

      useEffect(function() {
        function handleKeyDown(e) {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            if (e.key === 'Escape') {
              e.target.blur();
              setSearchQuery('');
            }
            return;
          }
          
          const currentIndex = filteredSteps.findIndex(function(s) { return s.id === selectedStep; });
          
          switch (e.key) {
            case 'ArrowDown':
            case 'j':
              e.preventDefault();
              if (currentIndex < filteredSteps.length - 1) {
                const nextStep = filteredSteps[currentIndex + 1];
                setSelectedStep(nextStep.id);
                setExpandedSteps(function(prev) { const n = new Set(prev); n.add(nextStep.id); return n; });
                const nextEl = document.querySelector('[data-step-id="' + nextStep.id + '"]');
                if (nextEl) nextEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
              break;
            case 'ArrowUp':
            case 'k':
              e.preventDefault();
              if (currentIndex > 0) {
                const prevStep = filteredSteps[currentIndex - 1];
                setSelectedStep(prevStep.id);
                setExpandedSteps(function(prev) { const n = new Set(prev); n.add(prevStep.id); return n; });
                const prevEl = document.querySelector('[data-step-id="' + prevStep.id + '"]');
                if (prevEl) prevEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
              break;
            case 'ArrowRight':
            case 'l':
              if (selectedStep) {
                setExpandedSteps(function(prev) { const n = new Set(prev); n.add(selectedStep); return n; });
              }
              break;
            case 'ArrowLeft':
            case 'h':
              if (selectedStep) {
                setExpandedSteps(function(prev) { const n = new Set(prev); n.delete(selectedStep); return n; });
              }
              break;
            case '/':
              e.preventDefault();
              if (searchInputRef.current) searchInputRef.current.focus();
              break;
            case 'n':
            case 'N':
              e.preventDefault();
              if (notesRef.current) notesRef.current.focus();
              break;
            case 'e':
            case 'E':
              expandAll();
              break;
            case 'c':
            case 'C':
              collapseAll();
              break;
            case '?':
              setShowShortcuts(function(prev) { return !prev; });
              break;
            case 'Escape':
              setShowShortcuts(false);
              setSearchQuery('');
              break;
            default:
              if (currentOntology && /^[1-9]$/.test(e.key)) {
                const firstDim = currentOntology.dimensions.find(function(d) { return d.type === 'single-select'; });
                if (firstDim) {
                  const optIndex = parseInt(e.key) - 1;
                  if (optIndex < firstDim.options.length) {
                    handleLabelChange(selectedStep, firstDim.key, firstDim.options[optIndex]);
                  }
                }
              }
          }
        }
        
        window.addEventListener('keydown', handleKeyDown);
        return function() { window.removeEventListener('keydown', handleKeyDown); };
      }, [selectedStep, filteredSteps, currentOntology, handleLabelChange, expandAll, collapseAll]);

      useEffect(function() {
        return function() {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
        };
      }, []);

      // ============================================================================
      // UI RENDERING
      // ============================================================================
      
      const stepListContent = [];
      if (filteredSteps.length === 0) {
        stepListContent.push(React.createElement('div', {
          key: 'empty',
          style: { textAlign: 'center', padding: '40px', color: colors.subtext }
        },
          React.createElement(Icon, { name: 'filter', size: 32, color: colors.subtext }),
          React.createElement('div', { style: { fontSize: '14px', fontWeight: 500, marginTop: '12px' } }, 'No steps match your filters'),
          React.createElement('div', { style: { fontSize: '12px', marginTop: '4px' } }, 'Try adjusting your search or filter criteria'),
          React.createElement('button', {
            onClick: function() { setFilter('all'); setSearchQuery(''); },
            style: {
              marginTop: '12px', padding: '8px 16px', fontSize: '12px',
              backgroundColor: colors.tint, color: '#fff', border: 'none',
              borderRadius: '6px', cursor: 'pointer',
            }
          }, 'Clear Filters')
        ));
      } else if (filter === 'all' && !searchQuery.trim()) {
        (task.steps || []).forEach(function(step, index) {
          stepListContent.push(React.createElement(VirtualizedTreeNode, {
            key: step.id,
            step: step,
            depth: 0,
            labels: labels,
            selectedStep: selectedStep,
            onSelect: setSelectedStep,
            expandedSteps: expandedSteps,
            onToggle: toggleStep,
            viewModes: viewModes,
            onViewModeChange: handleViewModeChange,
            contentViewModes: contentViewModes,
            onContentViewChange: handleContentViewChange,
            searchQuery: searchQuery,
            isLast: index === task.steps.length - 1,
            editingStepId: editingStepId,
            editingContent: editingContent,
            onEditStart: startEditingStep,
            onEditCancel: cancelEditing,
            onEditSubmit: submitEditedMessage,
            onEditChange: setEditingContent,
            isProcessing: isProcessing,
          }));
        });
      } else {
        filteredSteps.forEach(function(step) {
          stepListContent.push(React.createElement(FlatStepItem, {
            key: step.id,
            step: step,
            labels: labels,
            selectedStep: selectedStep,
            onSelect: setSelectedStep,
            expandedSteps: expandedSteps,
            onToggle: toggleStep,
            viewModes: viewModes,
            onViewModeChange: handleViewModeChange,
            contentViewModes: contentViewModes,
            onContentViewChange: handleContentViewChange,
          }));
        });
      }
      
      const sidebarContent = [];
      if (currentStep && currentOntology) {
        sidebarContent.push(React.createElement('div', {
          key: 'header',
          style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid ' + colors.border }
        },
          React.createElement(StepTypeBadge, { type: currentStep.type, size: 'md' }),
          React.createElement('span', { style: { fontSize: '13px', color: colors.text, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, currentStep.label || currentStep.id)
        ));
        
        sidebarContent.push(React.createElement('div', {
          key: 'dimensions',
          style: { display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }
        }, currentOntology.dimensions.map(function(dim, dimIdx) {
          return React.createElement('div', { key: dim.key },
            React.createElement('div', { style: { fontSize: '11px', fontWeight: 600, color: colors.subtext, marginBottom: '8px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' } },
              dim.label,
              dim.type === 'textarea' ? React.createElement('span', { style: { fontWeight: 400, textTransform: 'none' } }, '(press N to focus)') : null
            ),
            dim.type === 'textarea' ? 
              React.createElement('textarea', {
                ref: dimIdx === currentOntology.dimensions.length - 1 ? notesRef : null,
                placeholder: dim.placeholder || '',
                value: (labels[selectedStep] && labels[selectedStep][dim.key]) || '',
                onChange: function(e) { handleLabelChange(selectedStep, dim.key, e.target.value); },
                style: { width: '100%', padding: '10px 12px', fontSize: '12px', border: '1px solid ' + colors.border, borderRadius: '6px', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit', color: colors.text, boxSizing: 'border-box' }
              }) :
              React.createElement(LabelInput, {
                dimension: dim,
                value: labels[selectedStep] && labels[selectedStep][dim.key],
                onChange: function(v) { handleLabelChange(selectedStep, dim.key, v); }
              })
          );
        })));
      }
      
      if (CONFIG.enableProgressBar) {
        const progressStepList = allSteps.map(function(step) {
          const status = getStepStatus(step, labels);
          
          let bgColor = 'transparent';
          if (selectedStep === step.id) {
            bgColor = colors.tintLight;
          } else if (status === 'correct') {
            bgColor = colors.successBg;
          } else if (status === 'incorrect') {
            bgColor = colors.errorBg;
          } else if (status === 'partial') {
            bgColor = colors.warningBg;
          }
          
          let statusIcon = null;
          if (status === 'correct') {
            statusIcon = React.createElement(Icon, { name: 'check', size: 12, color: colors.success });
          } else if (status === 'incorrect') {
            statusIcon = React.createElement(Icon, { name: 'x', size: 12, color: colors.error });
          } else if (status === 'partial') {
            statusIcon = React.createElement(Icon, { name: 'alertCircle', size: 12, color: colors.warning });
          } else {
            statusIcon = React.createElement('div', {
              style: {
                width: '12px', height: '12px', borderRadius: '50%',
                border: '1.5px dashed ' + colors.disabled
              }
            });
          }
          
          return React.createElement('div', {
            key: step.id,
            onClick: function() {
              setSelectedStep(step.id);
              setExpandedSteps(function(prev) { const n = new Set(prev); n.add(step.id); return n; });
            },
            style: {
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '4px 8px', borderRadius: '4px', cursor: 'pointer',
              backgroundColor: bgColor,
              border: selectedStep === step.id ? '1px solid ' + colors.tint : '1px solid transparent',
            }
          },
            React.createElement(StepTypeBadge, { type: step.type, size: 'sm' }),
            React.createElement('span', {
              style: {
                fontSize: '11px', color: colors.textSecondary, flex: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }
            }, step.label || step.id),
            statusIcon
          );
        });
        
        sidebarContent.push(React.createElement('div', {
          key: 'progress',
          style: { marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid ' + colors.border }
        },
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' } },
            React.createElement('span', { style: { fontSize: '11px', fontWeight: 600, color: colors.subtext, textTransform: 'uppercase' } }, 'Evaluation Progress')
          ),
          React.createElement(ProgressBar, { total: allSteps.length, labeled: labeledCount }),
          React.createElement('div', { style: { marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflow: 'auto' } }, progressStepList)
        ));
      }

      return React.createElement('div', {
        style: { fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: colors.bgLight, minHeight: '100vh', color: colors.text }
      },
        React.createElement(ShortcutsPanel, { isOpen: showShortcuts, onClose: function() { setShowShortcuts(false); } }),
        
        React.createElement('div', {
          style: { display: 'flex', alignItems: 'center', padding: '8px 16px', backgroundColor: colors.bgWhite, borderBottom: '1px solid ' + colors.border, gap: '12px' }
        },
          React.createElement('div', { style: { position: 'relative', flex: 1, maxWidth: '300px' } },
            React.createElement('div', { style: { position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' } },
              React.createElement(Icon, { name: 'search', size: 14, color: colors.subtext })
            ),
            React.createElement('input', {
              ref: searchInputRef,
              type: 'text',
              placeholder: 'Search steps... ( / )',
              value: searchQuery,
              onChange: function(e) { setSearchQuery(e.target.value); },
              style: { width: '100%', padding: '6px 10px 6px 32px', fontSize: '12px', border: '1px solid ' + colors.border, borderRadius: '6px', backgroundColor: colors.bgWhite, color: colors.text, boxSizing: 'border-box' }
            }),
            searchQuery ? React.createElement('button', {
              onClick: function() { setSearchQuery(''); },
              style: { position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }
            }, React.createElement(Icon, { name: 'x', size: 12, color: colors.subtext })) : null
          ),
          
          React.createElement(FilterDropdown, { filter: filter, onFilterChange: setFilter, counts: filterCounts }),
          
          React.createElement('div', { style: { flex: 1 } }),
          
          React.createElement('button', {
            onClick: function() { setShowShortcuts(true); },
            style: {
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 10px', fontSize: '11px', fontWeight: 500,
              border: '1px solid ' + colors.border, borderRadius: '6px',
              backgroundColor: colors.bgWhite, color: colors.subtext, cursor: 'pointer',
            }
          },
            React.createElement(Icon, { name: 'keyboard', size: 12 }),
            'Shortcuts',
            React.createElement(Kbd, null, '?')
          ),
          
          React.createElement('div', { style: { display: 'flex', gap: '4px' } },
            React.createElement('button', {
              onClick: expandAll,
              style: { display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', fontSize: '11px', fontWeight: 500, border: '1px solid ' + colors.border, borderRadius: '6px', backgroundColor: colors.bgWhite, cursor: 'pointer', color: colors.subtext }
            }, React.createElement(Icon, { name: 'maximize2', size: 11 }), ' Expand'),
            React.createElement('button', {
              onClick: collapseAll,
              style: { display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', fontSize: '11px', fontWeight: 500, border: '1px solid ' + colors.border, borderRadius: '6px', backgroundColor: colors.bgWhite, cursor: 'pointer', color: colors.subtext }
            }, React.createElement(Icon, { name: 'minimize2', size: 11 }), ' Collapse')
          )
        ),
        
        React.createElement('div', { style: { display: 'flex', height: 'calc(100vh - 49px)' } },
          React.createElement('div', { style: { flex: 1, overflow: 'hidden', padding: '12px', display: 'flex', flexDirection: 'column' } },
            React.createElement(CollapsibleUserQuery, {
              query: task.query || 'No query provided',
              isCollapsed: isQueryCollapsed,
              onToggle: function() { setIsQueryCollapsed(function(prev) { return !prev; }); }
            }),
            React.createElement('div', {
              ref: listContainerRef,
              style: { flex: 1, overflow: 'auto', paddingRight: '8px' }
            }, stepListContent),
            CONFIG.enableFollowUpChat ? React.createElement(CollapsibleChatSection, {
              isProcessing: isProcessing,
              onSendMessage: handleSendMessage,
              onCancelSending: cancelSending,
              isChatActive: isChatActive,
              onChatActivate: function() { setIsChatActive(true); },
              isChatExpanded: isChatExpanded,
              onToggleChatExpand: function() { setIsChatExpanded(function(prev) { return !prev; }); },
              chatError: chatError,
              onDismissError: function() { setChatError(null); },
              onRetry: retryLastMessage,
            }) : null
          ),
          
          React.createElement('div', {
            style: { width: '320px', backgroundColor: colors.bgWhite, borderLeft: '1px solid ' + colors.border, padding: '16px', overflow: 'auto', display: 'flex', flexDirection: 'column' }
          }, sidebarContent)
        )
      );
    }
    ]]>
  </ReactCode>
</View>
```

{% enddetails %}

## Example input

Copy this into a JSON file and then import it into a project with the example code above. 

{% details <b>Click to expand</b> %}

```json
{
  "data": {
    "tree": {
      "name": "Claims Processing Pipeline",
      "type": "root",
      "status": "completed",
      "metadata": {
        "trace_id": "trace_2025-12-18T09-12-06",
        "timestamp": "2025-12-18T09:12:06.972741",
        "claim_text": "I found a small scratch on my passenger door this morning in the parking lot. It's about 6 inches long and just surface level - looks like someone's shopping cart hit it. The paint is scraped but no dent. Car is a 2020 Honda Civic."
      },
      "children": [
        {
          "name": "Intake Planner",
          "type": "agent",
          "author": "IntakePlannerAgent",
          "output": "Processing path: STANDARD. Estimated claim value: $950. This is a typical single-panel cosmetic damage claim.",
          "status": "completed",
          "children": []
        },
        {
          "name": "Evidence Collection",
          "type": "agent",
          "author": "EvidenceCollectionAgent",
          "output": "All photos are usable. Quality grades: B, B, A.",
          "status": "completed",
          "children": [
            {
              "id": "adk-ed92bcf3-c1fd-4c69-9072-dc2534c7641a",
              "name": "image_quality_scorer",
              "type": "tool_call",
              "args": {
                "photo_ids": ["photo_001", "photo_002", "photo_003"]
              },
              "response": {
                "sql": "SELECT photo_id, analyze_quality(blob) as sharpness_score, lighting_score, resolution, quality_grade, usable FROM photos WHERE id IN ('photo_001', 'photo_002', 'photo_003')",
                "rows": [
                  {
                    "photo_id": "photo_001",
                    "resolution": "1920x1080",
                    "quality_grade": "B",
                    "lighting_score": 0.75,
                    "sharpness_score": 0.8,
                    "usable": true
                  },
                  {
                    "photo_id": "photo_002",
                    "resolution": "1920x1080",
                    "quality_grade": "B",
                    "lighting_score": 0.8,
                    "sharpness_score": 0.85,
                    "usable": true
                  },
                  {
                    "photo_id": "photo_003",
                    "resolution": "1920x1080",
                    "quality_grade": "A",
                    "lighting_score": 0.85,
                    "sharpness_score": 0.9,
                    "usable": true
                  }
                ],
                "columns": ["photo_id", "sharpness_score", "lighting_score", "resolution", "quality_grade", "usable"],
                "row_count": 3,
                "execution_time_ms": 245
              }
            }
          ]
        },
        {
          "name": "Damage Assessment",
          "type": "agent",
          "author": "DamageAssessmentAgent",
          "output": "Damage detected: Rear Bumper (dent 0.72 severity, paint scrape 0.45 severity), Trunk Lid (minor dent 0.25 severity). Overall severity: 0.65.",
          "status": "completed",
          "children": [
            {
              "id": "adk-837c1124-d977-46fc-bbcb-adc541e8b73d",
              "name": "vision_damage_model",
              "type": "tool_call",
              "args": {
                "photo_ids": ["photo_001", "photo_002", "photo_003"],
                "vehicle_type": "2020 Honda Civic"
              },
              "response": {
                "sql": "SELECT panel, damage_type, severity, area_cm2, repair_method FROM damage_detections WHERE photo_id IN ('photo_001', 'photo_002', 'photo_003')",
                "rows": [
                  {
                    "panel": "rear_bumper",
                    "area_cm2": 450,
                    "severity": 0.72,
                    "damage_type": "dent",
                    "repair_method": "PDR + repaint"
                  },
                  {
                    "panel": "rear_bumper",
                    "area_cm2": 280,
                    "severity": 0.45,
                    "damage_type": "paint_scrape",
                    "repair_method": "sand and repaint"
                  },
                  {
                    "panel": "trunk_lid",
                    "area_cm2": 120,
                    "severity": 0.25,
                    "damage_type": "minor_dent",
                    "repair_method": "PDR"
                  }
                ],
                "columns": ["panel", "damage_type", "severity", "area_cm2", "repair_method"],
                "summary": {
                  "confidence": 0.94,
                  "overall_severity_score": 0.65,
                  "total_loss_probability": 0.02
                },
                "model_id": "DamageNet-v3.2",
                "row_count": 3,
                "inference_time_ms": 1823
              }
            }
          ]
        },
        {
          "name": "Policy Coverage",
          "type": "agent",
          "author": "PolicyCoverageAgent",
          "output": "Policy POL-2024-78432: Comprehensive coverage enabled, limit $50,000, deductible $400.",
          "status": "completed",
          "children": [
            {
              "id": "adk-944bb79c-3aa4-405c-a7c0-9f3121294f2d",
              "name": "policy_database",
              "type": "tool_call",
              "args": {
                "policy_id": "POL-2024-78432"
              },
              "response": {
                "sql": "SELECT * FROM policies p JOIN coverage_details c ON p.id = c.policy_id WHERE p.policy_number = 'POL-2024-78432'",
                "tables": {
                  "policy": {
                    "rows": [
                      {
                        "policy_id": "POL-2024-78432",
                        "holder_name": "Laura Chen",
                        "policy_type": "Comprehensive Auto",
                        "status": "Active",
                        "loyalty_tier": "Gold"
                      }
                    ],
                    "columns": ["policy_id", "holder_name", "policy_type", "status", "loyalty_tier"],
                    "row_count": 1
                  },
                  "coverage": {
                    "rows": [
                      {
                        "coverage_type": "comprehensive",
                        "enabled": true,
                        "limit_amount": 50000,
                        "deductible": 400
                      },
                      {
                        "coverage_type": "collision",
                        "enabled": true,
                        "limit_amount": 50000,
                        "deductible": 600
                      }
                    ],
                    "columns": ["coverage_type", "enabled", "limit_amount", "deductible"],
                    "row_count": 2
                  }
                },
                "execution_time_ms": 45
              }
            }
          ]
        }
      ]
    }
  }
}
```

{% enddetails %}

## Example output

This is a an example selection of the annotation output:

```json
[
    {
        "id": 243533361,
        "annotations": [
            {
                "id": 83543096,
                "completed_by": {
                    "id": 11551,
                    "email": "heidi@humansignal.com",
                    "first_name": "Heidi",
                    "last_name": "Opossum"
                },
                "result": [
                    {
                        "id": "28yskHp2Ew",
                        "type": "reactcode",
                        "value": {
                            "reactcode": {
                                "labels": {
                                    "delegation": "Appropriate"
                                },
                                "stepId": "main"
                            }
                        },
                        "origin": "manual",
                        "to_name": "custom",
                        "from_name": "custom"
                    },
                    {
                        "id": "PLUJjgUwJw",
                        "type": "reactcode",
                        "value": {
                            "reactcode": {
                                "labels": {
                                    "delegation": "Appropriate"
                                },
                                "stepId": "main-0"
                            }
                        },
                        "origin": "manual",
                        "to_name": "custom",
                        "from_name": "custom"
                    },
                    {
                        "id": "lJ8UN3Qsfp",
                        "type": "reactcode",
                        "value": {
                            "reactcode": {
                                "labels": {
                                    "correctness": "Correct"
                                },
                                "stepId": "main-1"
                            }
                        },
                        "origin": "manual",
                        "to_name": "custom",
                        "from_name": "custom"
                    },
                    {
                        "id": "z51Oi2o82C",
                        "type": "reactcode",
                        "value": {
                            "reactcode": {
                                "labels": {
                                    "notes": "Looks complete to me, but should reference all images",
                                    "delegation": "Appropriate"
                                },
                                "stepId": "main-3"
                            }
                        },
                        "origin": "manual",
                        "to_name": "custom",
                        "from_name": "custom"
                    },
                    {
                        "id": "gAuCT2miRs",
                        "type": "reactcode",
                        "value": {
                            "reactcode": {
                                "labels": {
                                    "correctness": "Correct"
                                },
                                "stepId": "main-5"
                            }
                        },
                        "origin": "manual",
                        "to_name": "custom",
                        "from_name": "custom"
                    },
                    {
                        "id": "pRiJwDAjt4",
                        "type": "reactcode",
                        "value": {
                            "reactcode": {
                                "labels": {
                                    "delegation": "Appropriate",
                                    "correctness": "Correct"
                                },
                                "stepId": "main-5"
                            }
                        },
                        "origin": "manual",
                        "to_name": "custom",
                        "from_name": "custom"
                    }
                ],
                "reviews": [],
                "was_cancelled": false,
                "ground_truth": false,
                "created_at": "2026-01-13T18:31:35.384154Z",
                "updated_at": "2026-01-13T18:31:35.384165Z",
                "draft_created_at": "2026-01-13T18:30:57.550499Z",
                "lead_time": 50.092,
                "prediction": {},
                "result_count": 6,
                "unique_id": "64a34a36-5a2c-476e-9623-4718e8ac42fe",
                "import_id": null,
                "last_action": "submitted",
                "bulk_created": false,
                "task": 243533361,
                "project": 222216,
                "updated_by": 11551,
                "parent_prediction": null,
                "parent_annotation": null,
                "last_created_by": 11551
            }
        ]
    }
]
```
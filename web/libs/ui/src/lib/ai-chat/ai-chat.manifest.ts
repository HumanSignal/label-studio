import { defineManifest } from "../../ds-manifest";

export default defineManifest({
  name: "AiChatShell",
  tier: 2,
  exports: [
    "AiChatShell",
    "AiChatPromptBar",
    "AiChatApprovalCard",
    "AiChatStreamingMessage",
    "AiChatThinking",
    "AiChatToolActivity",
    "AiChatLoading",
    "AiChatLoadingIcon",
  ],
  intent: [],
  use_when: "Chat surfaces that talk to an assistant: prompt bar, streaming messages, approvals.",
  never_when: [],
  replaces: [],
});

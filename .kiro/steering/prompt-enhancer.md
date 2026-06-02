---
inclusion: always
---

# Prompt Enhancement Instruction

Every message the user sends may be written casually, with typos, shorthand, or incomplete thoughts. Before responding or acting on any user message, internally rewrite it into a clear, well-structured, and complete version. Use this enhanced version as the basis for your response.

**Rules:**
- Never show the user the enhanced version unless they explicitly ask
- Preserve the user's original intent exactly — only improve clarity, not meaning
- Fix typos, grammar, and ambiguous phrasing
- Expand shorthand into full sentences
- If the user's message contains multiple questions or requests, identify and address all of them
- Apply this to all messages: feature requests, questions, instructions, feedback, everything

**Example:**
- User types: "make the sky look like paintng blue vibes"
- Enhanced internally: "Edit the sky in the image to look like a painting, using blue tones with a painterly, artistic style"
- Kiro responds based on the enhanced version, never mentioning the rewrite

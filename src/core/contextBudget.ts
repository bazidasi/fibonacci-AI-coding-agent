import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

/**
 * Trim the API message array to stay within a character budget (~30K tokens).
 *
 * Rules:
 *   1. Never drop the system prompt.
 *   2. Compress old tool-result messages into short stubs — they're the
 *      biggest culprits (full file content embedded in tool output).
 *   3. If still over budget, drop oldest non-recent messages, preserving
 *      the last `keepRecent` messages so the model retains immediate context.
 *
 * Extracted from agentLoop.ts as a pure, VS Code-free function so it can be
 * unit-tested directly.
 */
export function enforceBudget(
  messages: ChatCompletionMessageParam[],
  budget: number,
  keepRecent: number
): ChatCompletionMessageParam[] {
  // FIX (O(n²)): track the total length incrementally instead of calling
  // result.reduce() inside both loops.
  const totalLen0 = messages.reduce((n, m) => n + (m.content?.length ?? 0), 0);
  if (totalLen0 <= budget) return messages;

  const result: ChatCompletionMessageParam[] = [];
  let system: ChatCompletionMessageParam | undefined;
  let total = 0;
  for (const m of messages) {
    if (m.role === 'system' && !system) {
      system = m;
    } else {
      result.push(m);
      total += m.content?.length ?? 0;
    }
  }

  // Pass 1: compress oversized tool results (older than keepRecent from end)
  for (let i = 0; i < result.length; i++) {
    if (total <= budget) break;
    const m = result[i];
    if (
      m.role === 'tool' &&
      i < result.length - keepRecent &&
      (m.content?.length ?? 0) > 200
    ) {
      const name = (m as any).toolName ?? 'tool';
      const oldLen = m.content?.length ?? 0;
      result[i] = {
        role: 'user',
        content: `[tool result for ${name} dropped from context to fit budget — ${oldLen.toLocaleString()} chars removed]`,
      } as ChatCompletionMessageParam;
      total -= oldLen - (result[i].content?.length ?? 0);
    }
  }

  // Pass 2: drop oldest messages entirely if still over budget
  while (
    result.length > keepRecent &&
    total > budget
  ) {
    const removed = result.shift()!;
    total -= removed.content?.length ?? 0;
    // Replace with a compact eviction notice so the model isn't confused
    if (removed.role !== 'tool') {
      result.unshift({
        role: 'user',
        content: '[an older message was dropped from context to fit budget]',
      } as ChatCompletionMessageParam);
      total += result[0].content?.length ?? 0;
    }
  }

  if (system) result.unshift(system);
  return result;
}

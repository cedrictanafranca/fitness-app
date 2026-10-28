import { toProposal } from '../../../core/assistant/proposal';
import type { AssistantReply, ChatTurn } from '../../../core/assistant/types';
import { callStructured, hasAnthropicKey } from '../../../server/anthropic';
import { mockAssistant } from '../../../server/assistant-mock';
import { ASSISTANT_SYSTEM, buildAssistantSnapshotText } from '../../../server/assistant-prompt';
import { errorResponse, json, parseBody } from '../../../server/http';
import { assistantReplySchema, chatRequestSchema, modelReplySchema } from '../../../server/schemas';

/** Mock mode: explicit opt-in, or automatic when no key is configured (documented in docs/API.md). */
function isMockMode(): boolean {
  return process.env.ASSISTANT_MOCK === '1' || !hasAnthropicKey();
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await parseBody(request, chatRequestSchema);
    const history: ChatTurn[] = body.messages;
    // The API requires the conversation to start with a user turn.
    while (history.length && history[0].role !== 'user') history.shift();

    const mock = isMockMode();
    const modelReply = mock
      ? mockAssistant(history, body.snapshot)
      : await callStructured({
          system: ASSISTANT_SYSTEM,
          text: '',
          history: [
            // The snapshot rides as the first user turn so the system prompt stays cache-stable.
            { role: 'user', content: buildAssistantSnapshotText(body.snapshot) },
            { role: 'assistant', content: 'Understood. I have the snapshot.' },
            ...history.map((m) => ({ role: m.role, content: m.content })),
          ],
          schema: modelReplySchema,
          effort: 'medium',
          maxTokens: 4000,
        });

    let reply = modelReply.reply.trim() || 'Sorry, I have nothing to add.';
    let proposal: AssistantReply['proposal'] = null;
    if (modelReply.action) {
      const result = toProposal(modelReply.action, body.snapshot);
      if (result.ok) proposal = result.proposal;
      else {
        console.warn(`[assistant] dropped action: ${result.reason}`);
        reply += ' (I could not turn that into a change to your log. Could you say which entry you mean?)';
      }
    }
    const out: AssistantReply = { reply, proposal, mode: mock ? 'mock' : 'claude' };
    return json(assistantReplySchema.parse(out));
  } catch (err) {
    return errorResponse(err);
  }
}

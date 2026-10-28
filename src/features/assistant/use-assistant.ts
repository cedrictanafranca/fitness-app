import { useCallback } from 'react';

import { withCandidate, type ActionCandidate, type AssistantProposal, type AssistantSnapshot, type ChatTurn } from '@/core/assistant';
import { newId } from '@/data/ids';
import { errorMessage } from '@/features/log/format';
import { loadAssistantSnapshot, prepareAction, sendAssistantMessage } from '@/services/assistant';

import { chatStore, EMPTY_CHAT, patchMessage, patchProposal, type ChatMessage, type ProposalState } from './store';

/** Turns sent to the model; older ones are dropped to keep the request small. */
const MAX_HISTORY_TURNS = 20;

function candidateLabels(proposal: AssistantProposal, snapshot: AssistantSnapshot): ProposalState['candidateLabels'] {
  return proposal.candidates.map((candidate) => {
    const meal = snapshot.meals.find((m) => m.id === candidate.mealId);
    const item = candidate.itemId ? meal?.items.find((i) => i.id === candidate.itemId) : undefined;
    const when = meal ? `${meal.date === snapshot.today ? 'Today' : meal.weekday} ${meal.mealType}` : 'Meal';
    const what = item ? `${item.name}${item.grams != null ? ` · ${Math.round(item.grams)} g` : ''}` : (meal?.name ?? '');
    return { candidate, label: `${when}: ${what}` };
  });
}

/** Load the affected meal, preview the change, and apply it when no confirmation is needed. */
async function prepareAndMaybeApply(messageId: string, proposal: AssistantProposal) {
  patchProposal(messageId, { status: 'preparing', proposal, error: undefined });
  try {
    const prepared = await prepareAction(proposal.action, messageId);
    const needsUser = proposal.needsConfirmation || prepared.blockers.length > 0;
    patchProposal(messageId, { prepared, status: needsUser ? 'pending' : 'applying' });
    if (!needsUser) await commit(messageId);
  } catch (e) {
    patchProposal(messageId, { status: 'failed', error: errorMessage(e, 'Could not prepare this change.') });
  }
}

async function commit(messageId: string) {
  const msg = chatStore.get().messages.find((m) => m.id === messageId);
  const prepared = msg?.proposal?.prepared;
  if (!prepared) return;
  patchProposal(messageId, { status: 'applying', error: undefined });
  try {
    await prepared.commit();
    patchProposal(messageId, { status: 'applied' });
  } catch (e) {
    patchProposal(messageId, { status: 'failed', error: errorMessage(e, 'Could not apply this change.') });
  }
}

export function useAssistant() {
  const state = chatStore.use();

  const send = useCallback(async (rawText: string) => {
    const text = rawText.trim();
    if (!text || chatStore.get().busy) return;
    const userMsg: ChatMessage = { id: newId(), role: 'user', text };
    chatStore.set((s) => ({ ...s, messages: [...s.messages, userMsg], busy: true, error: null }));
    try {
      // Fresh snapshot every turn so earlier applied actions are visible to the model.
      const snapshot = await loadAssistantSnapshot();
      const history: ChatTurn[] = chatStore
        .get()
        .messages.slice(-MAX_HISTORY_TURNS)
        .map((m) => ({ role: m.role, content: m.text }));
      const reply = await sendAssistantMessage(history, snapshot);
      const assistantMsg: ChatMessage = {
        id: newId(),
        role: 'assistant',
        text: reply.reply,
        proposal: reply.proposal
          ? {
              proposal: reply.proposal,
              status: reply.proposal.candidates.length > 1 ? 'choose' : 'preparing',
              candidateLabels: candidateLabels(reply.proposal, snapshot),
            }
          : undefined,
      };
      chatStore.set((s) => ({ ...s, messages: [...s.messages, assistantMsg], busy: false, mode: reply.mode, snapshot }));
      if (reply.proposal && reply.proposal.candidates.length <= 1) {
        await prepareAndMaybeApply(assistantMsg.id, reply.proposal);
      }
    } catch (e) {
      chatStore.set((s) => ({ ...s, busy: false, error: errorMessage(e, 'The assistant is unavailable right now.') }));
    }
  }, []);

  const confirm = useCallback((messageId: string) => void commit(messageId), []);

  const dismiss = useCallback((messageId: string) => patchProposal(messageId, { status: 'dismissed' }), []);

  const choose = useCallback((messageId: string, candidate: ActionCandidate) => {
    const msg = chatStore.get().messages.find((m) => m.id === messageId);
    if (!msg?.proposal) return;
    const proposal = withCandidate(msg.proposal.proposal, candidate);
    patchMessage(messageId, (m) => ({ ...m, proposal: { ...m.proposal!, proposal, candidateLabels: [] } }));
    void prepareAndMaybeApply(messageId, proposal);
  }, []);

  const reset = useCallback(() => chatStore.set(EMPTY_CHAT), []);

  return { ...state, send, confirm, dismiss, choose, reset };
}

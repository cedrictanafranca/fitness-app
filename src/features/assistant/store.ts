/**
 * Session-only chat state. Lives at module level so closing the modal keeps the thread;
 * nothing here is persisted — only applied actions reach the database (via repos).
 */

import type { ActionCandidate, AssistantProposal, AssistantSnapshot } from '@/core/assistant';
import { createStore } from '@/features/log/store';
import type { PreparedAction } from '@/services/assistant';

export type ProposalStatus =
  | 'choose' // several candidates: the user must pick one
  | 'preparing' // loading the affected meal and computing the preview
  | 'pending' // waiting for the user to confirm
  | 'applying'
  | 'applied'
  | 'dismissed'
  | 'failed';

export interface ProposalState {
  proposal: AssistantProposal;
  prepared?: PreparedAction;
  status: ProposalStatus;
  error?: string;
  /** Candidate labels resolved from the snapshot the proposal was made against. */
  candidateLabels: { candidate: ActionCandidate; label: string }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  proposal?: ProposalState;
}

export interface ChatState {
  messages: ChatMessage[];
  busy: boolean;
  error: string | null;
  /** Set after the first reply: tells the UI whether the offline mock answered. */
  mode: 'claude' | 'mock' | null;
  snapshot: AssistantSnapshot | null;
}

export const EMPTY_CHAT: ChatState = { messages: [], busy: false, error: null, mode: null, snapshot: null };

export const chatStore = createStore<ChatState>(EMPTY_CHAT);

export function patchMessage(id: string, patch: (m: ChatMessage) => ChatMessage) {
  chatStore.set((s) => ({ ...s, messages: s.messages.map((m) => (m.id === id ? patch(m) : m)) }));
}

export function patchProposal(id: string, patch: Partial<ProposalState>) {
  patchMessage(id, (m) => (m.proposal ? { ...m, proposal: { ...m.proposal, ...patch } } : m));
}

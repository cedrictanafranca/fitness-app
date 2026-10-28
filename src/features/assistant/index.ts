export { ActionCard } from './components/ActionCard';
export { Composer } from './components/Composer';
export { MessageBubble } from './components/MessageBubble';
export { useAssistant } from './use-assistant';
export type { ChatMessage, ProposalState } from './store';

/** Example prompts shown on the empty thread (PRD §10). */
export const ASSISTANT_SUGGESTIONS = [
  'How much protein do I still need?',
  'Log the same lunch as yesterday',
  'What did I eat last Tuesday?',
  'Change my dinner from 200 g to 250 g',
  'Remove the protein shake I logged earlier',
  "How many calories were in Mom's chicken adobo?",
];

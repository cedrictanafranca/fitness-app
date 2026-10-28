import { hasAnthropicKey } from '../../server/anthropic';
import { json } from '../../server/http';
import { hasUsdaKey } from '../../server/usda';

/** Reports which server keys are configured. Never returns the values. */
export function GET(): Response {
  return json({ ok: true, anthropic: hasAnthropicKey(), usda: hasUsdaKey() });
}

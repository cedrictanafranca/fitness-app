/** Anthropic client factory and structured-output helper. Server-only: the key never leaves the server. */

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';
import { ApiError } from './http';

/** The one place the model id lives. Sonnet-class, vision-capable. */
export const ANTHROPIC_MODEL = 'claude-sonnet-5-5';

let cached: Anthropic | undefined;

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ApiError(
      500,
      'ANTHROPIC_API_KEY is not set. Add it to .env (see .env.example) and restart the dev server.',
    );
  }
  cached ??= new Anthropic({ apiKey, maxRetries: 1, timeout: 60_000 });
  return cached;
}

export type ImageInput = { base64: string; mimeType: 'image/jpeg' | 'image/png' };

interface StructuredCall<S extends z.ZodType> {
  system: string;
  text: string;
  image?: ImageInput;
  schema: S;
  maxTokens?: number;
  /** Multi-turn history; when set, `text`/`image` are appended as the final user turn only if `text` is non-empty. */
  history?: Anthropic.Beta.BetaMessageParam[];
  /** Reasoning depth. Extraction uses 'low'; the assistant uses 'medium'. */
  effort?: 'low' | 'medium' | 'high';
}

/**
 * Single structured-output call. The response is constrained to `schema` via
 * output_config.format (forced tool_choice is not supported on this model), then
 * re-validated with zod. Throws ApiError(502) on any upstream failure.
 */
export async function callStructured<S extends z.ZodType>(call: StructuredCall<S>): Promise<z.infer<S>> {
  const client = getAnthropic();
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (call.image) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: call.image.mimeType, data: call.image.base64 },
    });
  }
  if (call.text) content.push({ type: 'text', text: call.text });
  const messages: Anthropic.Beta.BetaMessageParam[] = [...(call.history ?? [])];
  if (content.length) messages.push({ role: 'user', content });

  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await client.beta.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: call.maxTokens ?? 8000,
      system: call.system,
      messages,
      // Low effort keeps extraction fast and deterministic; sampling params are not accepted on this model.
      output_config: { effort: call.effort ?? 'low', format: zodOutputFormat(call.schema) },
      // Opt-in server-side retry on a substitute model if the request is declined for policy reasons.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error(`[anthropic] upstream error ${err.status ?? ''}: ${err.message}`);
      throw new ApiError(502, `AI service error${err.status ? ` (${err.status})` : ''}. Please try again.`);
    }
    throw new ApiError(502, 'Could not reach the AI service. Please try again.');
  }

  if (response.stop_reason === 'refusal') {
    throw new ApiError(502, 'The AI service declined to analyze this input.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new ApiError(502, 'The AI response was cut off. Try a simpler description.');
  }
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new ApiError(502, 'The AI service returned no result.');
  }
  let raw: unknown;
  try {
    raw = JSON.parse(textBlock.text);
  } catch {
    throw new ApiError(502, 'The AI service returned malformed output.');
  }
  const parsed = call.schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(502, 'The AI service returned output in an unexpected shape.');
  }
  return parsed.data;
}

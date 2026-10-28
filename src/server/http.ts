/** Shared HTTP helpers for Expo Router API routes. Server-only. */

import type { z } from 'zod';

/** An error that maps directly to an HTTP status and a client-safe message. */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function json(body: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

export function errorResponse(err: unknown): Response {
  if (err instanceof ApiError) return json({ error: err.message }, err.status);
  // Never echo request bodies; log only the error message.
  console.error('[api] unexpected error:', err instanceof Error ? err.message : String(err));
  return json({ error: 'Unexpected server error.' }, 500);
}

/** Parse and validate a JSON request body, throwing a 400 ApiError on failure. */
export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON.');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join('.') || 'body';
    throw new ApiError(400, `Invalid request: ${path}: ${issue?.message ?? 'invalid value'}`);
  }
  return parsed.data;
}

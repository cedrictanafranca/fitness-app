/**
 * Resolves absolute URLs for the app's own Expo Router API routes (src/app/api/**).
 *
 * Order: EXPO_PUBLIC_API_URL (explicit override, e.g. a deployed server) ->
 * the Metro dev-server host Expo reports in `hostUri` (native dev) -> a relative path (web).
 *
 * Note: EXPO_PUBLIC_* values are bundled into the client. Only ever put a public origin here,
 * never a secret.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '');
}

/** "192.168.1.20:8081" -> "http://192.168.1.20:8081"; tunnel hosts use https. */
function originFromHostUri(hostUri: string): string {
  if (/^https?:\/\//i.test(hostUri)) return stripTrailingSlash(hostUri);
  const host = hostUri.split(':')[0] ?? '';
  const isLocal = host === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.endsWith('.local');
  return `${isLocal ? 'http' : 'https'}://${stripTrailingSlash(hostUri)}`;
}

export function apiOrigin(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return stripTrailingSlash(explicit);
  if (Platform.OS === 'web') return '';
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) return originFromHostUri(hostUri);
  return '';
}

/** `apiUrl('/api/health')` -> absolute URL on native dev, relative on web. */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${apiOrigin()}${p}`;
}

/** Fetch an API route and return parsed JSON, throwing a readable Error on any failure. */
export async function apiFetchJson(path: string, init?: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), init);
  } catch {
    throw new Error('Could not reach the app server. Check your connection and that the dev server is running.');
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON body; handled below.
  }
  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
        ? (body as { error: string }).error
        : `Request failed (${res.status}).`;
    throw new Error(message);
  }
  if (body === null) throw new Error('The server returned an unreadable response.');
  return body;
}

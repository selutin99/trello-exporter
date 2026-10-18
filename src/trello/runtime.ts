import { parseBoardReference } from '@trello-exporter/trello-client';
import type { OAuthOptions } from './sdk';

export interface RuntimeSettings {
  boardReference: string | null;
  clientId: string;
  redirectUri: string;
  oauthOptions: OAuthOptions;
}

/** Reads public deployment settings and builds a clean, exact OAuth callback URL. */
export function runtimeSettings(href: string): RuntimeSettings {
  const url = new URL(href);
  const reference = url.searchParams.get('board');
  const clientId = url.searchParams.get('clientId') ?? '';
  if (clientId && !/^[a-zA-Z0-9_-]{1,100}$/.test(clientId)) throw new Error('INVALID_CONFIG');
  const callback = new URL('./authorize.html', url);
  if (clientId) callback.searchParams.set('clientId', clientId);
  return {
    boardReference: reference ? parseBoardReference(reference) : null,
    clientId, redirectUri: callback.href,
    oauthOptions: clientId ? { clientId, redirectUri: callback.href } : {},
  };
}

export function probeUrl(href: string, settings: RuntimeSettings): string {
  const url = new URL('./probe.html', href);
  if (settings.boardReference) url.searchParams.set('board', settings.boardReference);
  if (settings.clientId) url.searchParams.set('clientId', settings.clientId);
  return url.href;
}

import { parseBoardReference } from './scope.js';

export function runtimeSettings(href) {
  const url = new URL(href);
  const reference = url.searchParams.get('board');
  const clientId = url.searchParams.get('clientId') ?? '';
  if (clientId && !/^[a-zA-Z0-9_-]{1,100}$/.test(clientId)) throw new Error('INVALID_CONFIG');
  const callback = new URL('./authorize.html', url);
  if (clientId) callback.searchParams.set('clientId', clientId);
  return {
    boardReference: reference ? parseBoardReference(reference) : null,
    clientId,
    redirectUri: callback.href,
    oauthOptions: clientId ? { clientId, redirectUri: callback.href } : {},
  };
}

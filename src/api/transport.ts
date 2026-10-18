import { ApiError } from './errors';
import type { ClientOptions, RequestOptions } from './types';

interface TransportOptions extends RequestOptions {
  query?: Record<string, string>;
  body?: Record<string, string>;
}

/** Abortable backoff; cancellation clears its timer immediately. */
export function pause(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const finish = () => { signal?.removeEventListener('abort', abort); resolve(); };
    const timer = setTimeout(finish, ms);
    const abort = () => { clearTimeout(timer); reject(signal?.reason); };
    signal?.addEventListener('abort', abort, { once: true });
  });
}

/** Internal transport. Callers use the board-scoped facade, never arbitrary endpoints. */
export class Transport {
  constructor(private readonly options: ClientOptions) {}

  async request(method: 'GET' | 'POST', path: string, options: TransportOptions = {}): Promise<unknown> {
    const { signal, body, query = {} } = options;
    const url = new URL(`https://api.trello.com/1${path}`);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    const attempts = method === 'GET' ? 3 : 1;
    for (let attempt = 0; attempt < attempts; attempt++) {
      signal?.throwIfAborted();
      let token: string | null | undefined;
      try { token = await this.options.getAccessToken(); }
      catch { signal?.throwIfAborted(); throw new ApiError('AUTH_REQUIRED'); }
      signal?.throwIfAborted();
      if (typeof token !== 'string' || !token) throw new ApiError('AUTH_REQUIRED');
      let response: Response;
      try {
        // Web APIs require their original receiver, not this Transport instance.
        const fetchRequest = this.options.fetchImpl ?? fetch;
        response = await fetchRequest(url.href, {
          method, credentials: 'omit', redirect: 'error', cache: 'no-store',
          headers: {
            Accept: 'application/json', Authorization: `Bearer ${token}`,
            ...(body ? { 'Content-Type': 'application/json' } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
          ...(signal ? { signal } : {}),
        });
      } catch {
        signal?.throwIfAborted();
        throw new ApiError(method === 'GET' ? 'NETWORK_ERROR' : 'WRITE_RESULT_UNKNOWN');
      }
      signal?.throwIfAborted();
      if (response.ok) {
        try {
          const result: unknown = await response.json();
          signal?.throwIfAborted();
          return result;
        } catch {
          signal?.throwIfAborted();
          throw new ApiError(method === 'GET' ? 'INVALID_RESPONSE' : 'WRITE_RESULT_UNKNOWN');
        }
      }
      if (method === 'GET' && [429, 502, 503, 504].includes(response.status) && attempt + 1 < attempts) {
        const retry = response.headers.get('Retry-After');
        let delay = 500 * (2 ** attempt);
        if (retry) {
          const seconds = Number(retry);
          const requested = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retry) - Date.now();
          if (Number.isFinite(requested)) delay = Math.max(delay, requested);
        }
        if (delay > 10_000) throw new ApiError('RATE_LIMIT_WAIT', response.status);
        await (this.options.pauseImpl ?? pause)(delay, signal);
        continue;
      }
      throw new ApiError(method === 'POST' && response.status >= 500 ? 'WRITE_RESULT_UNKNOWN'
        : response.status === 401 ? 'AUTH_REQUIRED' : 'API_REQUEST_FAILED', response.status);
    }
    throw new ApiError('API_REQUEST_FAILED');
  }
}

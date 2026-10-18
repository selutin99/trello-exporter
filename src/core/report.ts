import type { CallbackStage } from './diagnostics';

export type Check = 'scanned' | 'connected' | 'inspected';
export type Status = 'idle' | 'working' | 'cancelled' | 'failed' | 'downloaded' | 'selected' | 'reported' | Check;

export type ProbeEvent =
  | { code: 'CHECK_STARTED'; check: Check }
  | { code: 'CHECK_CANCELLED' | 'CHECK_FAILED'; check: Check; errorCode: string; status: number | null }
  | { code: 'OAUTH_CALLBACK_STAGE'; stage: CallbackStage }
  | { code: 'SAMPLE_DOWNLOAD_REQUESTED' | 'AUTHORIZATION_COMPLETED' }
  | { code: 'LOCAL_FILE_SELECTED'; name: string; size: number }
  | { code: 'LOCAL_FILE_READ'; name: string; bytes: number }
  | { code: 'TEST_BOARD_VERIFIED'; board: { id: string; name: string; shortLink: string; closed: boolean } };

export interface ProbeReport {
  format: 'trello-exporter.compatibility-probe';
  version: '0.0.0';
  startedAt: string;
  boardReference: string | null;
  apiWritesEnabled: false;
  events: (ProbeEvent & { at: string })[];
}

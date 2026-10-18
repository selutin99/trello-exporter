import { CallbackStage, Check, DiagnosticFormat, EventCode, Status } from './codes';
import type { DiagnosticCode } from './diagnostics';

export type ProbeStatus = Status | Check;

export type ProbeEvent =
  | { code: EventCode.CheckStarted; check: Check }
  | {
      code: EventCode.CheckCancelled | EventCode.CheckFailed;
      check: Check;
      errorCode: DiagnosticCode;
      status: number | null;
    }
  | { code: EventCode.OAuthCallbackStage; stage: CallbackStage }
  | { code: EventCode.SampleDownloadRequested | EventCode.AuthorizationCompleted }
  | { code: EventCode.LocalFileSelected; name: string; size: number }
  | { code: EventCode.LocalFileRead; name: string; bytes: number }
  | {
      code: EventCode.TestBoardVerified;
      board: { id: string; name: string; shortLink: string; closed: boolean };
    };

export interface ProbeReport {
  format: DiagnosticFormat.CompatibilityProbe;
  version: '0.0.0';
  startedAt: string;
  boardReference: string | null;
  apiWritesEnabled: false;
  events: (ProbeEvent & { at: string })[];
}

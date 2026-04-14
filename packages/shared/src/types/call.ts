export type CallStatus = 'completed' | 'missed' | 'failed';
export type CallOutcome = 'scheduled' | 'callback_requested' | 'unqualified' | 'info_only';

export interface Call {
  id: string;
  agentId: string;
  tenantId: string;
  callerNumber: string | null;
  durationSeconds: number | null;
  status: CallStatus;
  outcome: CallOutcome | null;
  recordingUrl: string | null;
  transcript: string | null;
  summary: string | null;
  startedAt: string;
  endedAt: string | null;
}

export interface CallToolEvent {
  id: string;
  callId: string;
  toolName: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  durationMs: number | null;
  createdAt: string;
}

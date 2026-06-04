export type LlmModel =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4-turbo'
  | 'claude-3-5-sonnet'
  | 'claude-3-5-haiku'
  | 'claude-3-opus';
export type AgentVertical = 'realtor' | 'dental' | 'legal' | 'general';

export interface Agent {
  id: string;
  tenantId: string;
  name: string;
  voiceId: string | null;
  systemPrompt: string | null;
  llmModel: LlmModel | null;
  isActive: boolean;
  config: AgentConfig | null;
  createdAt: string;
}

export interface AgentConfig {
  greeting?: string;
  fallbackMessage?: string;
  timezone?: string;
  vertical?: AgentVertical;
  recordingDisclosure?: string;
  vapiAssistantId?: string;
  templateId?: string;
  templateVersion?: number;
  businessProfile?: Record<string, unknown>;
}

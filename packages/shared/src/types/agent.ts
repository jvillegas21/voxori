export type LlmModel = 'gpt-4o' | 'claude-3-5-sonnet';

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
  vertical?: 'realtor' | 'dental' | 'legal' | 'general';
  recordingDisclosure?: string;
}

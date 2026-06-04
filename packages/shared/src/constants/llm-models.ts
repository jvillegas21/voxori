/** Supported LLM models for voice agents (Vapi / provider mapping). */
export const LLM_MODEL_OPTIONS = [
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { id: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
  { id: 'claude-3-5-haiku', label: 'Claude 3.5 Haiku' },
  { id: 'claude-3-opus', label: 'Claude 3 Opus' },
] as const;

export type LlmModelId = (typeof LLM_MODEL_OPTIONS)[number]['id'];

export const LLM_MODEL_IDS = LLM_MODEL_OPTIONS.map((m) => m.id) as readonly LlmModelId[];

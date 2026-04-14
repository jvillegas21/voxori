import { AgentVertical } from './agent';

export interface AgentTemplateField {
  key: string;
  label: string;
  type: 'string' | 'string[]' | 'number' | 'boolean';
  required: boolean;
}

export interface AgentTemplateSchema {
  fields: AgentTemplateField[];
}

export interface AgentTemplate {
  id: string;
  name: string;
  vertical: AgentVertical;
  description: string;
  lockedPromptCore: string;
  defaultTools: string[];
  defaultVoice: Record<string, unknown>;
  editableFieldsSchema: AgentTemplateSchema;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

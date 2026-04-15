import { describe, it, expect } from 'vitest';
import { composeAssistantPayload } from '../template-composer';

const BASE_INPUT = {
  templateName: 'Test Template',
  templateDescription: 'A test',
  lockedPromptCore: 'You are a helpful assistant.',
  defaultTools: ['log-lead', 'book-showing'],
  defaultVoice: null,
  templateId: 'tpl-1',
  templateVersion: 1,
  tenantId: 'tenant-1',
  agentName: 'Test Agent',
  businessProfile: { businessName: 'Acme Realty', city: 'Austin' },
};

describe('composeAssistantPayload', () => {
  it('includes the locked prompt core in system message', () => {
    const payload = composeAssistantPayload(BASE_INPUT);
    const systemMsg = payload.model.messages[0]!.content;
    expect(systemMsg).toContain('You are a helpful assistant.');
  });

  it('includes business profile data in system message', () => {
    const payload = composeAssistantPayload(BASE_INPUT);
    const systemMsg = payload.model.messages[0]!.content;
    expect(systemMsg).toContain('Acme Realty');
  });

  it('includes all defaultTools as function definitions', () => {
    const payload = composeAssistantPayload(BASE_INPUT);
    const toolNames = payload.model.tools.map((t: any) => t.function.name);
    expect(toolNames).toContain('log-lead');
    expect(toolNames).toContain('book-showing');
  });

  it('includes Deepgram transcriber with nova-2 model', () => {
    const payload = composeAssistantPayload(BASE_INPUT);
    expect(payload.transcriber).toMatchObject({
      provider: 'deepgram',
      model: 'nova-2',
      language: 'en',
    });
  });

  it('uses gpt-4o as LLM model', () => {
    const payload = composeAssistantPayload(BASE_INPUT);
    expect(payload.model.model).toBe('gpt-4o');
  });

  it('sets agent name correctly', () => {
    const payload = composeAssistantPayload(BASE_INPUT);
    expect(payload.name).toBe('Test Agent');
  });
});

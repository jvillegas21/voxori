'use client';

import { useEffect, useMemo, useState } from 'react';
import { createAgentFromTemplate, fetchTemplates } from '@/lib/api-client';

interface TemplateField {
  key: string;
  label: string;
  type: string;
  required: boolean;
}

interface AgentTemplate {
  id: string;
  name: string;
  vertical: string;
  description: string;
  editable_fields_schema: { fields?: TemplateField[] };
  version: number;
}

const defaultTenantId = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? '';

function getFieldInputValue(value: string): string | string[] {
  if (value.includes(',')) return value.split(',').map((item) => item.trim()).filter(Boolean);
  return value;
}

export function AgentTemplateWizard() {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [agentName, setAgentName] = useState('');
  const [tenantId, setTenantId] = useState(defaultTenantId);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ agentId: string; assistantId: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoadingTemplates(true);
      try {
        const data = await fetchTemplates();
        setTemplates(data.templates);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load templates');
      } finally {
        setLoadingTemplates(false);
      }
    };
    void load();
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  );

  const fields = selectedTemplate?.editable_fields_schema.fields ?? [];

  async function handlePublish() {
    if (!selectedTemplate || !tenantId || !agentName) {
      setError('Template, tenant ID, and agent name are required.');
      return;
    }

    setPublishing(true);
    setError(null);
    try {
      const businessProfile = fields.reduce<Record<string, unknown>>((acc, field) => {
        const rawValue = fieldValues[field.key]?.trim();
        if (!rawValue) return acc;
        acc[field.key] = field.type === 'string[]' ? getFieldInputValue(rawValue) : rawValue;
        return acc;
      }, {});

      const result = await createAgentFromTemplate({
        tenantId,
        templateId: selectedTemplate.id,
        name: agentName,
        businessProfile,
        makeActive: true,
      });

      setPublishResult({ agentId: result.agent.id, assistantId: result.assistantId });
      setStep(3);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Failed to publish agent');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
        <p className="text-sm text-gray-400">Step {step} of 3</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Template-first Agent Setup</h2>
      </div>

      {error ? <p className="rounded-md border border-red-900 bg-red-950 p-3 text-sm text-red-300">{error}</p> : null}

      {step === 1 ? (
        <div className="space-y-4">
          <h3 className="text-base font-medium text-white">1) Select template</h3>
          {loadingTemplates ? <p className="text-sm text-gray-400">Loading templates...</p> : null}
          <div className="grid gap-3 md:grid-cols-2">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplateId(template.id)}
                className={`rounded-lg border p-4 text-left ${
                  selectedTemplateId === template.id
                    ? 'border-blue-500 bg-blue-950/20'
                    : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                }`}
              >
                <p className="text-sm font-semibold text-white">{template.name}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-gray-400">{template.vertical}</p>
                <p className="mt-2 text-sm text-gray-300">{template.description}</p>
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!selectedTemplateId}
            onClick={() => setStep(2)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <h3 className="text-base font-medium text-white">2) Configure business profile</h3>
          <div className="grid gap-4">
            <label className="grid gap-1 text-sm">
              <span className="text-gray-300">Tenant ID</span>
              <input
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value)}
                className="rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                placeholder="uuid..."
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-gray-300">Agent name</span>
              <input
                value={agentName}
                onChange={(event) => setAgentName(event.target.value)}
                className="rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                placeholder="Riley - Main Line"
              />
            </label>
            {fields.map((field) => (
              <label key={field.key} className="grid gap-1 text-sm">
                <span className="text-gray-300">
                  {field.label}
                  {field.required ? ' *' : ''}
                  {field.type === 'string[]' ? ' (comma-separated)' : ''}
                </span>
                <input
                  value={fieldValues[field.key] ?? ''}
                  onChange={(event) =>
                    setFieldValues((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                  className="rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                  placeholder={field.key}
                />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-200"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => void handlePublish()}
              disabled={publishing}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {publishing ? 'Publishing...' : 'Publish agent'}
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-3 rounded-lg border border-green-900 bg-green-950/20 p-4">
          <h3 className="text-base font-medium text-green-200">3) Published</h3>
          <p className="text-sm text-green-100">Agent created and synced to Vapi.</p>
          {publishResult ? (
            <ul className="space-y-1 text-sm text-green-100">
              <li>
                <strong>Agent ID:</strong> {publishResult.agentId}
              </li>
              <li>
                <strong>Vapi Assistant ID:</strong> {publishResult.assistantId}
              </li>
            </ul>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setStep(1);
              setPublishResult(null);
              setSelectedTemplateId('');
              setFieldValues({});
            }}
            className="rounded-md border border-green-700 px-3 py-2 text-sm text-green-100"
          >
            Create another agent
          </button>
        </div>
      ) : null}
    </div>
  );
}

const defaultApiBaseUrl = 'http://localhost:3002';

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl;
}

function getAdminSecretHeaders() {
  const adminSecret = process.env.NEXT_PUBLIC_ADMIN_API_SECRET;
  if (!adminSecret) return {} as Record<string, string>;
  return { 'x-voxori-admin-secret': adminSecret };
}

export async function fetchTemplates() {
  const response = await fetch(`${getApiBaseUrl()}/tools/admin/templates`, {
    headers: {
      ...getAdminSecretHeaders(),
    },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Failed to fetch templates');
  return response.json() as Promise<{
    templates: Array<{
      id: string;
      name: string;
      vertical: string;
      description: string;
      editable_fields_schema: { fields?: Array<{ key: string; label: string; type: string; required: boolean }> };
      version: number;
    }>;
  }>;
}

export async function createAgentFromTemplate(payload: {
  tenantId: string;
  templateId: string;
  name: string;
  businessProfile: Record<string, unknown>;
  makeActive: boolean;
}) {
  const response = await fetch(`${getApiBaseUrl()}/tools/admin/create-agent-from-template`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAdminSecretHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Failed to create agent');
  return data as {
    assistantId: string;
    agent: {
      id: string;
      name: string;
      is_active: boolean;
      config: Record<string, unknown>;
    };
  };
}

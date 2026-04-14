'use client';
import { useState } from 'react';

export function ImpersonateButton({
  tenantId,
  apiBaseUrl,
  adminSecret,
}: {
  tenantId: string;
  apiBaseUrl: string;
  adminSecret: string;
}) {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImpersonate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/admin/impersonate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-voxori-admin-secret': adminSecret,
        },
        body: JSON.stringify({ tenantId, actorUserId: 'admin' }),
      });
      const data = await res.json() as { actionLink?: string; error?: string };
      if (!res.ok) { setError(data.error ?? 'Failed'); return; }
      setLink(data.actionLink ?? null);
    } catch {
      setError('Request failed');
    } finally {
      setLoading(false);
    }
  }

  if (link) {
    return (
      <div className="rounded border border-yellow-600 bg-yellow-900/30 p-4 space-y-2">
        <p className="text-xs text-yellow-300 font-medium">⚠ Impersonation link (valid 60 min — single use)</p>
        <p className="break-all font-mono text-xs text-yellow-200">{link}</p>
        <button onClick={() => { window.open(link, '_blank'); setLink(null); }}
          className="rounded bg-yellow-600 px-3 py-1 text-xs text-white hover:bg-yellow-700">
          Open in new tab
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button onClick={handleImpersonate} disabled={loading}
        className="rounded bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50">
        {loading ? 'Generating...' : 'Impersonate Tenant'}
      </button>
    </div>
  );
}

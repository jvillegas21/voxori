'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Pencil, Plus, Trash2 } from 'lucide-react';

type FormState = {
  number: string;
  agentId: string;
  isActive: boolean;
  twilioSid: string;
};

const emptyForm = (defaultAgentId: string): FormState => ({
  number: '',
  agentId: defaultAgentId,
  isActive: true,
  twilioSid: '',
});

export function PhoneNumbersTab() {
  const utils = trpc.useUtils();
  const { data: agents } = trpc.agents.list.useQuery();
  const { data: phoneNumbers, isLoading } = trpc.phoneNumbers.list.useQuery();
  const defaultAgentId = agents?.[0]?.id ?? '';

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultAgentId));
  const [showForm, setShowForm] = useState(false);

  const createMutation = trpc.phoneNumbers.create.useMutation({
    onSuccess: () => {
      void utils.phoneNumbers.list.invalidate();
      setShowForm(false);
      setForm(emptyForm(defaultAgentId));
    },
  });

  const updateMutation = trpc.phoneNumbers.update.useMutation({
    onSuccess: () => {
      void utils.phoneNumbers.list.invalidate();
      setEditingId(null);
      setShowForm(false);
    },
  });

  const deleteMutation = trpc.phoneNumbers.delete.useMutation({
    onSuccess: () => void utils.phoneNumbers.list.invalidate(),
  });

  function startEdit(row: NonNullable<typeof phoneNumbers>[number]) {
    setEditingId(row.id);
    setShowForm(true);
    setForm({
      number: row.number,
      agentId: row.agent_id,
      isActive: row.is_active,
      twilioSid: row.twilio_sid ?? '',
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.agentId) return;

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        agentId: form.agentId,
        isActive: form.isActive,
        twilioSid: form.twilioSid || null,
        retryVapiSync: true,
      });
      return;
    }

    createMutation.mutate({
      number: form.number,
      agentId: form.agentId,
      isActive: form.isActive,
      twilioSid: form.twilioSid || undefined,
    });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error?.message ?? updateMutation.error?.message;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Phone Numbers</CardTitle>
            <CardDescription>
              Register Twilio numbers you already own; on save we import them into Vapi for inbound
              AI calls. Before production launch, complete the checklist in{' '}
              <code className="text-xs">docs/TELEPHONY_DECISION.md</code> (10DLC, Twilio purchase,
              env vars).
            </CardDescription>
          </div>
          <Button
            type="button"
            className="cursor-pointer min-h-[44px]"
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm(defaultAgentId));
              setShowForm(true);
            }}
            disabled={!defaultAgentId}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add number
          </Button>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="mb-6 grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2"
            >
              {!editingId && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="pn-number">E.164 number</Label>
                  <Input
                    id="pn-number"
                    value={form.number}
                    onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                    placeholder="+15125550100"
                    required
                    className="min-h-[44px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Buy the number in Twilio first, then paste it here with the Twilio Phone
                    Number SID (PN…).
                  </p>
                </div>
              )}
              {editingId && (
                <p className="text-sm text-muted-foreground sm:col-span-2">
                  Number: <span className="font-mono">{form.number}</span> (cannot be changed
                  after create)
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="pn-agent">Agent</Label>
                <select
                  id="pn-agent"
                  value={form.agentId}
                  onChange={(e) => setForm((f) => ({ ...f, agentId: e.target.value }))}
                  className="flex h-11 min-h-[44px] w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm"
                  required
                >
                  {(agents ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pn-twilio">Twilio SID (recommended)</Label>
                <Input
                  id="pn-twilio"
                  value={form.twilioSid}
                  onChange={(e) => setForm((f) => ({ ...f, twilioSid: e.target.value }))}
                  placeholder="PNxxxxxxxx"
                  className="min-h-[44px]"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="h-4 w-4"
                />
                Active (used for inbound routing and outbound SMS when configured)
              </label>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={isSaving} className="cursor-pointer min-h-[44px]">
                  {isSaving ? 'Saving…' : editingId ? 'Update & sync Vapi' : 'Create & sync Vapi'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer min-h-[44px]"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
              {mutationError && (
                <p className="text-sm text-destructive sm:col-span-2">{mutationError}</p>
              )}
            </form>
          )}

          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !phoneNumbers?.length ? (
            <p className="text-sm text-muted-foreground">
              No phone numbers yet. Add a Twilio number to route inbound calls to your agent.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Vapi</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phoneNumbers.map((pn) => {
                  const agentName = Array.isArray(pn.agents)
                    ? pn.agents[0]?.name
                    : (pn.agents as { name: string } | null)?.name;
                  const syncError = (pn as { vapi_sync_error?: string | null }).vapi_sync_error;
                  const vapiId = (pn as { vapi_phone_id?: string | null }).vapi_phone_id;

                  return (
                    <TableRow key={pn.id}>
                      <TableCell className="font-mono">{pn.number}</TableCell>
                      <TableCell>{agentName ?? '—'}</TableCell>
                      <TableCell>
                        {vapiId ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                            Linked
                          </Badge>
                        ) : syncError ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs text-destructive"
                            title={syncError}
                          >
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            Sync failed
                          </span>
                        ) : (
                          <Badge variant="secondary">Not synced</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {pn.is_active ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="cursor-pointer min-h-[44px] min-w-[44px]"
                            onClick={() => startEdit(pn)}
                            aria-label="Edit phone number"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="cursor-pointer min-h-[44px] min-w-[44px] text-destructive"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (window.confirm(`Deactivate ${pn.number}?`)) {
                                deleteMutation.mutate({ id: pn.id });
                              }
                            }}
                            aria-label="Deactivate phone number"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

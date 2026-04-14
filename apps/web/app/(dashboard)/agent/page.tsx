'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertCircle, Bot } from 'lucide-react';

const LLM_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] as const;
type LlmModel = (typeof LLM_MODELS)[number];

type SaveStatus = 'idle' | 'saving' | 'saved';

export default function AgentPage() {
  const { data: agents, isLoading: isLoadingList } = trpc.agents.list.useQuery();
  const primaryAgentId = agents?.[0]?.id ?? null;

  const { data: agentDetail, isLoading: isLoadingDetail } = trpc.agents.get.useQuery(
    { id: primaryAgentId! },
    { enabled: Boolean(primaryAgentId) }
  );

  const updateAgent = trpc.agents.update.useMutation();

  const agent = agents?.[0] ?? null;
  const isLoading = isLoadingList || (Boolean(primaryAgentId) && isLoadingDetail);

  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [llmModel, setLlmModel] = useState<LlmModel>('gpt-4o');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setIsActive(agent.is_active);
      setLlmModel((agent.llm_model as LlmModel) ?? 'gpt-4o');
    }
  }, [agent]);

  const handleSave = async () => {
    if (!agent) return;
    setSaveStatus('saving');
    try {
      await updateAgent.mutateAsync({
        id: agent.id,
        data: {
          name,
          isActive,
          llmModel,
        },
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('idle');
    }
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold">My Agent</h1>
        <p className="mt-2 text-gray-500">Configure your AI voice agent.</p>
        <div className="mt-6 space-y-6">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold">My Agent</h1>
        <p className="mt-2 text-gray-500">Configure your AI voice agent.</p>
        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <Bot className="h-12 w-12 text-gray-300" />
          <div>
            <p className="text-lg font-semibold text-gray-700">No agent configured yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Contact support to get your AI voice agent set up.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const vapiAssistantId = (agent?.config as Record<string, unknown> | null)?.vapi_assistant_id;
  const isSynced = Boolean(vapiAssistantId);

  return (
    <div>
      <h1 className="text-2xl font-bold">My Agent</h1>
      <p className="mt-2 text-gray-500">Configure your AI voice agent.</p>

      <div className="mt-6 space-y-6">
        {/* Agent Info */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="agent-name">Name</Label>
              <Input
                id="agent-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Agent name"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                id="agent-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="agent-active" className="cursor-pointer">
                Active
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Vapi sync:</span>
              {isSynced ? (
                <Badge className="flex items-center gap-1 bg-green-100 text-green-700 hover:bg-green-100">
                  <CheckCircle2 className="h-3 w-3" />
                  Synced
                </Badge>
              ) : (
                <Badge className="flex items-center gap-1 bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                  <AlertCircle className="h-3 w-3" />
                  Not synced
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Voice Model */}
        <Card>
          <CardHeader>
            <CardTitle>Voice Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="llm-model">LLM Model</Label>
              <select
                id="llm-model"
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value as LlmModel)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {LLM_MODELS.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* System Prompt */}
        <Card>
          <CardHeader>
            <CardTitle>System Prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              System prompt managed by template
            </p>
            <textarea
              readOnly
              value={agentDetail?.system_prompt ?? ''}
              placeholder="No system prompt configured"
              rows={6}
              className="w-full resize-none rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
            />
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saveStatus === 'saving'}>
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Save changes'}
          </Button>
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Changes saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

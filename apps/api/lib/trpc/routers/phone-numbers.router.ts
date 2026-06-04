import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, tenantProcedure } from '../init';
import { createServiceRoleClient } from '@voxori/database/client';
import type { Database } from '@voxori/database';
import { markStepComplete } from '../../services/onboarding.service';
import {
  importAgentPhoneToVapi,
  loadAgentVapiAssistantId,
} from '../../services/phone-numbers-vapi.service';

type PhoneNumberUpdate = Database['public']['Tables']['phone_numbers']['Update'];

const phoneSelect =
  'id, number, is_active, agent_id, twilio_sid, vapi_phone_id, vapi_sync_error, created_at';

const e164Schema = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, 'Phone number must be E.164 format (e.g. +15125551234)');

export const phoneNumbersRouter = router({
  list: tenantProcedure.query(async ({ ctx }) => {
    const db = createServiceRoleClient();
    const { data, error } = await db
      .from('phone_numbers')
      .select(`${phoneSelect}, agents(name)`)
      .eq('tenant_id', ctx.tenantId)
      .order('number');

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    return data ?? [];
  }),

  create: tenantProcedure
    .input(
      z.object({
        number: e164Schema,
        agentId: z.string().uuid(),
        isActive: z.boolean().optional().default(true),
        twilioSid: z.string().optional(),
        skipVapiImport: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = createServiceRoleClient();

      const { data: agent } = await db
        .from('agents')
        .select('id, name, config')
        .eq('id', input.agentId)
        .eq('tenant_id', ctx.tenantId)
        .maybeSingle();

      if (!agent) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Agent not found for this workspace' });
      }

      let vapiPhoneId: string | null = null;
      let vapiSyncError: string | null = null;

      if (!input.skipVapiImport) {
        const assistantId = await loadAgentVapiAssistantId(db, input.agentId, ctx.tenantId);
        if (!assistantId) {
          vapiSyncError =
            'Agent has no Vapi assistant yet. Provision the agent first, then re-save the number.';
        } else {
          const vapiResult = await importAgentPhoneToVapi({
            number: input.number.trim(),
            vapiAssistantId: assistantId,
            agentName: agent.name,
            twilioSid: input.twilioSid,
          });
          vapiPhoneId = vapiResult.vapiPhoneId;
          vapiSyncError = vapiResult.error;
        }
      }

      const { data, error } = await db
        .from('phone_numbers')
        .insert({
          tenant_id: ctx.tenantId,
          agent_id: input.agentId,
          number: input.number.trim(),
          is_active: input.isActive,
          twilio_sid: input.twilioSid ?? null,
          vapi_phone_id: vapiPhoneId,
          vapi_sync_error: vapiSyncError,
        })
        .select(phoneSelect)
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'This phone number is already registered for your workspace',
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message ?? 'Insert failed',
        });
      }

      if (input.isActive) {
        await markStepComplete(db, ctx.tenantId, 'number');
      }

      return data;
    }),

  update: tenantProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        agentId: z.string().uuid().optional(),
        isActive: z.boolean().optional(),
        twilioSid: z.string().nullable().optional(),
        retryVapiSync: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = createServiceRoleClient();
      const payload: PhoneNumberUpdate = {};

      if (input.isActive !== undefined) payload.is_active = input.isActive;
      if (input.twilioSid !== undefined) payload.twilio_sid = input.twilioSid;

      if (input.agentId !== undefined) {
        const { data: agent } = await db
          .from('agents')
          .select('id')
          .eq('id', input.agentId)
          .eq('tenant_id', ctx.tenantId)
          .maybeSingle();
        if (!agent) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Agent not found for this workspace' });
        }
        payload.agent_id = input.agentId;
      }

      if (input.retryVapiSync) {
        const { data: existing } = await db
          .from('phone_numbers')
          .select('number, agent_id, twilio_sid, agents(name)')
          .eq('id', input.id)
          .eq('tenant_id', ctx.tenantId)
          .maybeSingle();

        if (existing) {
          const agentId = input.agentId ?? existing.agent_id;
          const assistantId = await loadAgentVapiAssistantId(db, agentId, ctx.tenantId);
          const agentRow = existing.agents as { name: string } | { name: string }[] | null;
          const agentName = Array.isArray(agentRow) ? agentRow[0]?.name : agentRow?.name;

          if (!assistantId) {
            payload.vapi_sync_error =
              'Agent has no Vapi assistant yet. Provision the agent first.';
          } else {
            const vapiResult = await importAgentPhoneToVapi({
              number: existing.number,
              vapiAssistantId: assistantId,
              agentName,
              twilioSid: input.twilioSid ?? existing.twilio_sid,
            });
            payload.vapi_phone_id = vapiResult.vapiPhoneId;
            payload.vapi_sync_error = vapiResult.error;
          }
        }
      }

      if (Object.keys(payload).length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No fields to update' });
      }

      const { data, error } = await db
        .from('phone_numbers')
        .update(payload)
        .eq('id', input.id)
        .eq('tenant_id', ctx.tenantId)
        .select(phoneSelect)
        .single();

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Phone number not found' });
      }

      if (input.isActive === true) {
        await markStepComplete(db, ctx.tenantId, 'number');
      }

      return data;
    }),

  delete: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const db = createServiceRoleClient();
      const { data, error } = await db
        .from('phone_numbers')
        .update({ is_active: false })
        .eq('id', input.id)
        .eq('tenant_id', ctx.tenantId)
        .select('id')
        .single();

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Phone number not found' });
      }
      return { deleted: true, id: data.id };
    }),
});

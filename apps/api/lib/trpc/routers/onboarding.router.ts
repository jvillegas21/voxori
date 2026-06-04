import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, tenantProcedure } from '../init';
import { createServiceRoleClient } from '@voxori/database/client';
import {
  getCompletedSteps,
  markStepComplete,
  ONBOARDING_STEPS,
  STEP_LABELS,
  type OnboardingStep,
} from '../../services/onboarding.service';

export type { OnboardingStep };

export const onboardingRouter = router({
  getProgress: tenantProcedure.query(async ({ ctx }) => {
    const db = createServiceRoleClient();
    const completed = await getCompletedSteps(db, ctx.tenantId);

    const steps = ONBOARDING_STEPS.map((step) => ({
      id: step,
      label: STEP_LABELS[step],
      completed: completed.has(step),
      href: `/onboarding?step=${step}`,
    }));

    const completedCount = steps.filter((s) => s.completed).length;

    return {
      tenantId: ctx.tenantId,
      steps,
      completedCount,
      totalSteps: ONBOARDING_STEPS.length,
      isComplete: completedCount === ONBOARDING_STEPS.length,
    };
  }),

  completeStep: tenantProcedure
    .input(z.object({ step: z.enum(ONBOARDING_STEPS) }))
    .mutation(async ({ ctx, input }) => {
      const db = createServiceRoleClient();
      await markStepComplete(db, ctx.tenantId, input.step);
      return { step: input.step, completed: true };
    }),
});

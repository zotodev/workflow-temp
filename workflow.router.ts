/**
 * workflow.router.ts  (server-side tRPC router)
 *
 * The 3 procedures the wizard depends on:
 *   - getRun          → get current workflow run + stage pointer
 *   - getStepCompletion → get saved data for a specific stage
 *   - saveStepCompletion → upsert step data (called on Save Draft + submit)
 *   - advanceStage    → update the run's currentStageSlug pointer
 *
 * Wire this into your root appRouter as: workflow: workflowRouter
 */

import { z } from "zod";
import { router, protectedProcedure } from "../trpc"; // your tRPC init
import { db } from "../db";
import {
  workflowRuns,
  stepCompletions,
} from "../db/schema";
import { and, eq } from "drizzle-orm";

export const workflowRouter = router({

  // ── Get or create a workflow run for this entity ──────────────────────────
  getRun: protectedProcedure
    .input(z.object({ entityId: z.string() }))
    .query(async ({ input, ctx }) => {
      const existing = await db.query.workflowRuns.findFirst({
        where: eq(workflowRuns.entityId, input.entityId),
      });

      if (existing) return existing;

      // Auto-create run starting at first stage
      const [created] = await db
        .insert(workflowRuns)
        .values({
          entityId: input.entityId,
          entityType: "case",
          currentStageSlug: "basic-info",
          status: "in_progress",
          createdBy: ctx.user.id,
        })
        .returning();

      return created;
    }),

  // ── Fetch saved data for a specific stage ─────────────────────────────────
  getStepCompletion: protectedProcedure
    .input(z.object({ entityId: z.string(), stageSlug: z.string() }))
    .query(async ({ input }) => {
      const completion = await db.query.stepCompletions.findFirst({
        where: and(
          eq(stepCompletions.entityId, input.entityId),
          eq(stepCompletions.stageSlug, input.stageSlug),
        ),
      });

      return completion ?? null;
    }),

  // ── Upsert step data (save draft or submit) ───────────────────────────────
  saveStepCompletion: protectedProcedure
    .input(
      z.object({
        entityId: z.string(),
        stageSlug: z.string(),
        data: z.record(z.unknown()), // flexible — each stage owns its schema
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await db.query.stepCompletions.findFirst({
        where: and(
          eq(stepCompletions.entityId, input.entityId),
          eq(stepCompletions.stageSlug, input.stageSlug),
        ),
      });

      if (existing) {
        const [updated] = await db
          .update(stepCompletions)
          .set({ data: input.data, updatedAt: new Date() })
          .where(eq(stepCompletions.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await db
        .insert(stepCompletions)
        .values({
          entityId: input.entityId,
          stageSlug: input.stageSlug,
          data: input.data,
          completedBy: ctx.user.id,
        })
        .returning();

      return created;
    }),

  // ── Advance the run's stage pointer ───────────────────────────────────────
  advanceStage: protectedProcedure
    .input(z.object({ entityId: z.string(), nextStageSlug: z.string() }))
    .mutation(async ({ input }) => {
      const isCompleted = input.nextStageSlug === "completed";

      const [updated] = await db
        .update(workflowRuns)
        .set({
          currentStageSlug: input.nextStageSlug,
          status: isCompleted ? "completed" : "in_progress",
          completedAt: isCompleted ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(workflowRuns.entityId, input.entityId))
        .returning();

      return updated;
    }),
});

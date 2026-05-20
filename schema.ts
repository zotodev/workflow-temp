/**
 * schema.ts — Drizzle ORM schema for the workflow wizard
 *
 * Two tables:
 *  - workflow_runs      → one per entity (case), tracks current stage pointer
 *  - step_completions   → one per (entity, stage), stores form data as jsonb
 */

import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const workflowRunStatusEnum = pgEnum("workflow_run_status", [
  "in_progress",
  "completed",
  "cancelled",
]);

// ─── workflow_runs ────────────────────────────────────────────────────────────

export const workflowRuns = pgTable(
  "workflow_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: text("entity_id").notNull(),          // e.g. caseId
    entityType: text("entity_type").notNull(),       // e.g. "case"
    currentStageSlug: text("current_stage_slug").notNull(),
    status: workflowRunStatusEnum("status").notNull().default("in_progress"),
    createdBy: text("created_by").notNull(),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    entityIdx: index("workflow_runs_entity_idx").on(t.entityId),
  }),
);

// ─── step_completions ─────────────────────────────────────────────────────────

export const stepCompletions = pgTable(
  "step_completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: text("entity_id").notNull(),
    stageSlug: text("stage_slug").notNull(),
    data: jsonb("data").notNull(),                  // stage form data
    completedBy: text("completed_by").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    entityStageIdx: index("step_completions_entity_stage_idx").on(
      t.entityId,
      t.stageSlug,
    ),
  }),
);

export type WorkflowRun = typeof workflowRuns.$inferSelect;
export type StepCompletion = typeof stepCompletions.$inferSelect;

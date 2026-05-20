import type { UseFormReturn, FieldValues, DefaultValues } from "react-hook-form";

// ─── Stage Definition ─────────────────────────────────────────────────────────

export interface WorkflowStage {
  slug: string;
  title: string;
  description?: string;
}

// ─── Wizard Context ───────────────────────────────────────────────────────────

export interface WizardContextValue<T extends FieldValues = FieldValues> {
  /** All stages in order */
  stages: WorkflowStage[];
  /** Currently active stage */
  currentStage: WorkflowStage;
  currentIndex: number;
  isFirst: boolean;
  isLast: boolean;
  /** Navigate to a specific stage slug (only allowed if already completed) */
  goToStage: (slug: string) => void;
  goBack: () => void;
  /** The caseId / entityId this wizard is running for */
  entityId: string;
  /** Slug of the furthest completed stage (from DB) */
  completedUpToSlug: string | null;
}

// ─── Stage Page Props ─────────────────────────────────────────────────────────

/**
 * Props injected into every stage page component.
 * `T` is the shape of this stage's form data.
 */
export interface StagePageProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  /** Call this in your onSubmit handler — it persists + advances the stage */
  submitStage: (data: T) => Promise<void>;
  isSubmitting: boolean;
  entityId: string;
  /** Saved data from DB for this stage, if any */
  savedData: T | undefined;
}

// ─── Stage Route Config ───────────────────────────────────────────────────────

/**
 * Developers register each stage with this config.
 */
export interface StageRouteConfig<T extends FieldValues> {
  stage: WorkflowStage;
  /** Used to seed useForm defaultValues */
  defaultValues: DefaultValues<T>;
  /**
   * Validation schema (zod resolver) — optional.
   * Pass result of zodResolver(yourSchema).
   */
  resolver?: Parameters<typeof import("react-hook-form").useForm>[0]["resolver"];
  /** The actual form UI component for this stage */
  component: React.ComponentType<StagePageProps<T>>;
}

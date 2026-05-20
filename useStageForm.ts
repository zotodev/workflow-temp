/**
 * useStageForm.ts
 *
 * The primary hook for every stage page. It:
 *  - Fetches saved data for this stage from the DB
 *  - Initialises react-hook-form with saved data as defaultValues
 *  - Provides a `submitStage` handler that:
 *      1. Saves step completion to DB via tRPC
 *      2. Advances the workflow run's current stage pointer
 *      3. Navigates to next stage (or calls onFinish if last)
 *  - Provides save-draft (no advance) separately
 *
 * Usage:
 *   const { form, submitStage, saveDraft, isSubmitting, savedData } =
 *     useStageForm({ stageSlug: "basic-info", defaultValues: { name: "" } });
 */

import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useWizard } from "../context/WizardContext";
import { trpc } from "../lib/trpc";
import type { FieldValues, DefaultValues, Resolver } from "react-hook-form";

interface UseStageFormOptions<T extends FieldValues> {
  stageSlug: string;
  defaultValues: DefaultValues<T>;
  resolver?: Resolver<T>;
  /** Called instead of navigation when finishing the last stage */
  onFinish?: (entityId: string) => void;
}

export function useStageForm<T extends FieldValues>({
  stageSlug,
  defaultValues,
  resolver,
  onFinish,
}: UseStageFormOptions<T>) {
  const { entityId, stages, currentIndex, isLast } = useWizard();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── 1. Fetch saved data for this stage ──────────────────────────────────────
  const { data: savedData, isLoading: isSavedDataLoading } = useQuery({
    queryKey: ["stepCompletion", entityId, stageSlug],
    queryFn: () =>
      trpc.workflow.getStepCompletion.query({ entityId, stageSlug }),
    // Don't refetch on window focus — form is the source of truth while editing
    refetchOnWindowFocus: false,
  });

  // ── 2. Initialise RHF ────────────────────────────────────────────────────────
  const form = useForm<T>({
    defaultValues,
    resolver,
    // Re-populate form when saved data arrives (handles back-navigation)
    values: savedData?.data as DefaultValues<T> | undefined,
  });

  // ── 3. Save step completion mutation ─────────────────────────────────────────
  const saveStepMutation = useMutation({
    mutationFn: (data: T) =>
      trpc.workflow.saveStepCompletion.mutate({ entityId, stageSlug, data }),
    onSuccess: () => {
      // Invalidate so back-nav re-hydrates correctly
      queryClient.invalidateQueries({ queryKey: ["stepCompletion", entityId, stageSlug] });
    },
  });

  // ── 4. Advance workflow run mutation ──────────────────────────────────────────
  const advanceStageMutation = useMutation({
    mutationFn: (nextSlug: string) =>
      trpc.workflow.advanceStage.mutate({ entityId, nextStageSlug: nextSlug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflowRun", entityId] });
    },
  });

  // ── 5. submitStage — save + advance + navigate ────────────────────────────────
  const submitStage = async (data: T) => {
    // a) Persist step data
    await saveStepMutation.mutateAsync(data);

    if (isLast) {
      // Advance to a "completed" sentinel stage if you track that
      await advanceStageMutation.mutateAsync("completed");
      if (onFinish) {
        onFinish(entityId);
      } else {
        navigate({ to: `/cases/${entityId}` }); // default: go to case detail
      }
      return;
    }

    // b) Advance to next stage
    const nextStage = stages[currentIndex + 1];
    await advanceStageMutation.mutateAsync(nextStage.slug);

    // c) Navigate
    navigate({ to: `/cases/${entityId}/stage/${nextStage.slug}` });
  };

  // ── 6. saveDraft — save without advancing ────────────────────────────────────
  const saveDraft = form.handleSubmit(async (data: T) => {
    await saveStepMutation.mutateAsync(data);
  });

  const isSubmitting =
    saveStepMutation.isPending ||
    advanceStageMutation.isPending ||
    form.formState.isSubmitting;

  return {
    form,
    submitStage,
    saveDraft,
    isSubmitting,
    isSavedDataLoading,
    savedData: savedData?.data as T | undefined,
  };
}

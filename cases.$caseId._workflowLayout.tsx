/**
 * WorkflowWizardLayout.tsx
 *
 * Drop this as your TanStack Router layout route, e.g.:
 *   /cases/$caseId/_workflowLayout.tsx
 *
 * It:
 *  1. Fetches the current workflow run for the entity
 *  2. Guards against skipping stages (redirects back if ahead)
 *  3. Provides WizardContext to all child stage pages
 *  4. Renders a stage progress stepper
 */

import { createFileRoute, Outlet, redirect, useNavigate, useParams } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { WizardContext } from "../context/WizardContext";
import type { WorkflowStage, WizardContextValue } from "../types/workflow";
import { trpc } from "../lib/trpc"; // your tRPC client
import { CheckIcon } from "lucide-react";

// ─── Stage Registry ───────────────────────────────────────────────────────────
// Developers define the ordered stages here once. Pages are registered separately.

export const WORKFLOW_STAGES: WorkflowStage[] = [
  { slug: "basic-info",     title: "Basic Info",      description: "Case details" },
  { slug: "parties",        title: "Parties",         description: "Involved parties" },
  { slug: "documents",      title: "Documents",       description: "Attach evidence" },
  { slug: "review",         title: "Review",          description: "Final review" },
];

// ─── Route Definition ─────────────────────────────────────────────────────────

export const Route = createFileRoute("/cases/$caseId/_workflowLayout")({
  // Loader runs server-side / on navigation — guards stage skipping
  loader: async ({ params, context }) => {
    const { caseId } = params;

    // fetch via tRPC query utils (or your preferred method)
    const run = await context.queryClient.ensureQueryData({
      queryKey: ["workflowRun", caseId],
      queryFn: () => trpc.workflow.getRun.query({ entityId: caseId }),
    });

    return { run };
  },

  // beforeLoad: redirect if the user is trying to access a future stage directly
  beforeLoad: async ({ params, location, context }) => {
    const { caseId } = params;

    // Extract the stage slug from the URL, e.g. /cases/123/stage/parties → "parties"
    const urlSlug = location.pathname.split("/stage/")[1]?.split("/")[0];
    if (!urlSlug) return; // navigating to layout root, let loader handle it

    const run = await context.queryClient.fetchQuery({
      queryKey: ["workflowRun", caseId],
      queryFn: () => trpc.workflow.getRun.query({ entityId: caseId }),
    });

    const currentIndex = WORKFLOW_STAGES.findIndex(s => s.slug === run?.currentStageSlug);
    const requestedIndex = WORKFLOW_STAGES.findIndex(s => s.slug === urlSlug);

    // Block skipping ahead — redirect to the actual current stage
    if (requestedIndex > currentIndex) {
      throw redirect({
        to: `/cases/${caseId}/stage/${run?.currentStageSlug ?? WORKFLOW_STAGES[0].slug}`,
      });
    }
  },

  component: WorkflowWizardLayout,
});

// ─── Layout Component ─────────────────────────────────────────────────────────

function WorkflowWizardLayout() {
  const { caseId } = useParams({ from: "/cases/$caseId/_workflowLayout" });
  const navigate = useNavigate();

  const { data: run } = useSuspenseQuery({
    queryKey: ["workflowRun", caseId],
    queryFn: () => trpc.workflow.getRun.query({ entityId: caseId }),
  });

  // Determine current stage from URL
  // TanStack Router exposes useMatch / location — derive from window for simplicity
  const urlSlug = window.location.pathname.split("/stage/")[1]?.split("/")[0];
  const currentIndex = urlSlug
    ? WORKFLOW_STAGES.findIndex(s => s.slug === urlSlug)
    : WORKFLOW_STAGES.findIndex(s => s.slug === run?.currentStageSlug);

  const safeIndex = currentIndex === -1 ? 0 : currentIndex;
  const currentStage = WORKFLOW_STAGES[safeIndex];
  const completedUpToSlug = run?.currentStageSlug ?? null;
  const completedUpToIndex = WORKFLOW_STAGES.findIndex(s => s.slug === completedUpToSlug);

  const goToStage = (slug: string) => {
    const targetIndex = WORKFLOW_STAGES.findIndex(s => s.slug === slug);
    // Only allow navigating to completed or current stages
    if (targetIndex <= completedUpToIndex) {
      navigate({ to: `/cases/${caseId}/stage/${slug}` });
    }
  };

  const goBack = () => {
    if (safeIndex > 0) {
      navigate({ to: `/cases/${caseId}/stage/${WORKFLOW_STAGES[safeIndex - 1].slug}` });
    }
  };

  const wizardCtx: WizardContextValue = {
    stages: WORKFLOW_STAGES,
    currentStage,
    currentIndex: safeIndex,
    isFirst: safeIndex === 0,
    isLast: safeIndex === WORKFLOW_STAGES.length - 1,
    goToStage,
    goBack,
    entityId: caseId,
    completedUpToSlug,
  };

  return (
    <WizardContext.Provider value={wizardCtx}>
      <div className="min-h-screen bg-gray-50">
        {/* ── Stepper Header ── */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
              Case #{caseId}
            </p>
            <WizardStepper
              stages={WORKFLOW_STAGES}
              currentIndex={safeIndex}
              completedUpToIndex={completedUpToIndex}
              onStepClick={goToStage}
            />
          </div>
        </div>

        {/* ── Stage Content ── */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{currentStage.title}</h1>
            {currentStage.description && (
              <p className="text-sm text-gray-500 mt-1">{currentStage.description}</p>
            )}
          </div>
          <Outlet />
        </div>
      </div>
    </WizardContext.Provider>
  );
}

// ─── Stepper UI ───────────────────────────────────────────────────────────────

interface WizardStepperProps {
  stages: WorkflowStage[];
  currentIndex: number;
  completedUpToIndex: number;
  onStepClick: (slug: string) => void;
}

function WizardStepper({ stages, currentIndex, completedUpToIndex, onStepClick }: WizardStepperProps) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center gap-0">
        {stages.map((stage, idx) => {
          const isCompleted = idx < completedUpToIndex;
          const isCurrent = idx === currentIndex;
          const isClickable = idx <= completedUpToIndex;

          return (
            <li key={stage.slug} className="flex items-center flex-1 last:flex-none">
              {/* Step circle */}
              <button
                onClick={() => isClickable && onStepClick(stage.slug)}
                disabled={!isClickable}
                className={`
                  flex items-center gap-2.5 group
                  ${isClickable ? "cursor-pointer" : "cursor-default"}
                `}
              >
                <span
                  className={`
                    flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold
                    transition-all duration-200
                    ${isCompleted
                      ? "bg-blue-600 text-white"
                      : isCurrent
                      ? "border-2 border-blue-600 bg-white text-blue-600"
                      : "border-2 border-gray-300 bg-white text-gray-400"
                    }
                  `}
                >
                  {isCompleted ? <CheckIcon className="h-4 w-4" /> : idx + 1}
                </span>
                <span
                  className={`
                    text-sm font-medium whitespace-nowrap
                    ${isCurrent ? "text-blue-600" : isCompleted ? "text-gray-700" : "text-gray-400"}
                  `}
                >
                  {stage.title}
                </span>
              </button>

              {/* Connector line */}
              {idx < stages.length - 1 && (
                <div
                  className={`
                    h-0.5 flex-1 mx-3 rounded-full transition-all duration-300
                    ${idx < completedUpToIndex ? "bg-blue-600" : "bg-gray-200"}
                  `}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

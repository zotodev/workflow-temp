/**
 * stage.review.tsx  (route: /cases/$caseId/stage/review)
 *
 * Final stage — shows all previously saved data for review.
 * The WizardNavBar automatically renders "Finish" instead of "Save & Continue"
 * because isLast === true in the wizard context.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { useWizard } from "../../context/WizardContext";
import { WizardNavBar } from "../../components/WizardNavBar";
import { useStageForm } from "../../hooks/useStageForm";
import { trpc } from "../../lib/trpc";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";

// Review stage has its own (minimal) data — just a confirmation checkbox
const reviewSchema = z.object({
  confirmed: z.literal(true, { errorMap: () => ({ message: "You must confirm to proceed" }) }),
});
type ReviewData = z.infer<typeof reviewSchema>;

export const Route = createFileRoute("/cases/$caseId/stage/review")({
  component: ReviewStage,
});

function ReviewStage() {
  const { entityId } = useWizard();
  const navigate = useNavigate();

  // Fetch all prior stage data to display a summary
  const [basicInfo, parties, documents] = useQueries({
    queries: [
      {
        queryKey: ["stepCompletion", entityId, "basic-info"],
        queryFn: () => trpc.workflow.getStepCompletion.query({ entityId, stageSlug: "basic-info" }),
      },
      {
        queryKey: ["stepCompletion", entityId, "parties"],
        queryFn: () => trpc.workflow.getStepCompletion.query({ entityId, stageSlug: "parties" }),
      },
      {
        queryKey: ["stepCompletion", entityId, "documents"],
        queryFn: () => trpc.workflow.getStepCompletion.query({ entityId, stageSlug: "documents" }),
      },
    ],
  });

  const { form, submitStage, isSubmitting } = useStageForm<ReviewData>({
    stageSlug: "review",
    defaultValues: { confirmed: undefined as unknown as true },
    onFinish: (entityId) => {
      navigate({ to: `/cases/${entityId}`, search: { submitted: true } });
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = form;

  const isConfirmed = watch("confirmed");

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <SummaryCard
        title="Basic Info"
        stageSlug="basic-info"
        data={basicInfo.data?.data}
        entityId={entityId}
        isLoading={basicInfo.isLoading}
      />
      <SummaryCard
        title="Parties"
        stageSlug="parties"
        data={parties.data?.data}
        entityId={entityId}
        isLoading={parties.isLoading}
      />
      <SummaryCard
        title="Documents"
        stageSlug="documents"
        data={documents.data?.data}
        entityId={entityId}
        isLoading={documents.isLoading}
      />

      {/* Confirmation */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register("confirmed")}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            I confirm that all information provided is accurate and complete. I understand this
            submission will be processed by the case management team.
          </span>
        </label>
        {errors.confirmed && (
          <p className="mt-2 text-xs text-red-500">{errors.confirmed.message}</p>
        )}
      </div>

      {/* WizardNavBar — isLast=true so "Finish" renders automatically */}
      <WizardNavBar
        onSubmit={handleSubmit(submitStage)}
        isSubmitting={isSubmitting}
        disableSubmit={!isConfirmed}
        finishLabel="Submit Case"
        hideSaveDraft // review stage doesn't need save draft
      />
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  title: string;
  stageSlug: string;
  data: Record<string, unknown> | undefined;
  entityId: string;
  isLoading: boolean;
}

function SummaryCard({ title, stageSlug, data, entityId, isLoading }: SummaryCardProps) {
  const { goToStage } = useWizard();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        </div>
        <button
          type="button"
          onClick={() => goToStage(stageSlug)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          Edit
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 w-3/4 bg-gray-100 rounded" />
          <div className="h-3 w-1/2 bg-gray-100 rounded" />
        </div>
      ) : data ? (
        <dl className="space-y-1">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex gap-2 text-sm">
              <dt className="text-gray-500 capitalize min-w-[120px]">
                {key.replace(/([A-Z])/g, " $1")}:
              </dt>
              <dd className="text-gray-800 font-medium">{String(value ?? "—")}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-gray-400 italic">No data recorded</p>
      )}
    </div>
  );
}

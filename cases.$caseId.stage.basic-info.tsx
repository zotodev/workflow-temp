/**
 * stage.basic-info.tsx  (route: /cases/$caseId/stage/basic-info)
 *
 * Example stage page showing the full developer pattern:
 *  1. Define a zod schema
 *  2. Call useStageForm with defaultValues + resolver
 *  3. Render form fields
 *  4. Render <WizardNavBar> passing the handlers from the hook
 */

import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useStageForm } from "../../hooks/useStageForm";
import { WizardNavBar } from "../../components/WizardNavBar";

// ─── 1. Schema ────────────────────────────────────────────────────────────────

const basicInfoSchema = z.object({
  caseTitle: z.string().min(3, "Title must be at least 3 characters"),
  caseType: z.enum(["civil", "criminal", "corporate", "family"], {
    required_error: "Select a case type",
  }),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  description: z.string().min(10, "Description must be at least 10 characters"),
  filingDate: z.string().min(1, "Filing date is required"),
});

type BasicInfoData = z.infer<typeof basicInfoSchema>;

// ─── 2. Route ─────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/cases/$caseId/stage/basic-info")({
  component: BasicInfoStage,
});

// ─── 3. Component ─────────────────────────────────────────────────────────────

function BasicInfoStage() {
  const { form, submitStage, saveDraft, isSubmitting, isSavedDataLoading } =
    useStageForm<BasicInfoData>({
      stageSlug: "basic-info",
      defaultValues: {
        caseTitle: "",
        caseType: undefined,
        priority: "medium",
        description: "",
        filingDate: "",
      },
      resolver: zodResolver(basicInfoSchema),
    });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  if (isSavedDataLoading) {
    return <StageLoadingSkeleton />;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="space-y-5">

        {/* Case Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Case Title <span className="text-red-500">*</span>
          </label>
          <input
            {...register("caseTitle")}
            placeholder="e.g. Smith v. Acme Corp"
            className={inputClass(!!errors.caseTitle)}
          />
          {errors.caseTitle && <FieldError message={errors.caseTitle.message} />}
        </div>

        {/* Case Type + Priority (2-col) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Case Type <span className="text-red-500">*</span>
            </label>
            <select {...register("caseType")} className={inputClass(!!errors.caseType)}>
              <option value="">Select type…</option>
              <option value="civil">Civil</option>
              <option value="criminal">Criminal</option>
              <option value="corporate">Corporate</option>
              <option value="family">Family</option>
            </select>
            {errors.caseType && <FieldError message={errors.caseType.message} />}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Priority
            </label>
            <select {...register("priority")} className={inputClass(false)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Filing Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Filing Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            {...register("filingDate")}
            className={inputClass(!!errors.filingDate)}
          />
          {errors.filingDate && <FieldError message={errors.filingDate.message} />}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register("description")}
            rows={4}
            placeholder="Brief summary of the case…"
            className={`${inputClass(!!errors.description)} resize-none`}
          />
          {errors.description && <FieldError message={errors.description.message} />}
        </div>
      </div>

      {/* ── Nav Bar ── */}
      <WizardNavBar
        onSaveDraft={saveDraft}
        onSubmit={handleSubmit(submitStage)}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputClass = (hasError: boolean) =>
  `w-full rounded-lg border px-3 py-2 text-sm text-gray-900 outline-none
   focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all
   ${hasError ? "border-red-400 bg-red-50" : "border-gray-300 bg-white hover:border-gray-400"}`;

function FieldError({ message }: { message?: string }) {
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

function StageLoadingSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i}>
          <div className="h-3 w-24 bg-gray-200 rounded mb-2" />
          <div className="h-9 w-full bg-gray-100 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

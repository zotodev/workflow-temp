/**
 * WizardNavBar.tsx
 *
 * Flexible bottom navigation bar for every stage page.
 * Automatically shows:
 *   - "Back" (hidden on first stage)
 *   - "Save Draft" (always, unless hideSaveDraft prop)
 *   - "Save & Continue" OR "Finish" (on last stage)
 *
 * Props let developers override labels, add extra actions, or hide buttons.
 *
 * Usage:
 *   <WizardNavBar
 *     onBack={goBack}
 *     onSaveDraft={saveDraft}
 *     onSubmit={form.handleSubmit(submitStage)}
 *     isSubmitting={isSubmitting}
 *   />
 */

import { useWizard } from "../context/WizardContext";
import { Loader2, ChevronLeft, Save, ArrowRight, CheckCircle2 } from "lucide-react";

interface WizardNavBarProps {
  /** Called when Back is clicked. Defaults to wizard goBack(). */
  onBack?: () => void;
  /** Called when Save Draft is clicked. */
  onSaveDraft?: () => void;
  /** Called when Save & Continue / Finish is clicked. */
  onSubmit: () => void;
  /** Disable all buttons while a mutation is in flight. */
  isSubmitting?: boolean;
  /** Whether save draft is running specifically */
  isSavingDraft?: boolean;
  /** Override the continue button label */
  continueLabel?: string;
  /** Override the finish button label */
  finishLabel?: string;
  /** Override the back button label */
  backLabel?: string;
  /** Override the save draft button label */
  saveDraftLabel?: string;
  /** Hide the Save Draft button */
  hideSaveDraft?: boolean;
  /** Render extra actions to the left of the main CTA group */
  extraActions?: React.ReactNode;
  /** Disable the submit button (e.g. form not dirty / invalid) */
  disableSubmit?: boolean;
}

export function WizardNavBar({
  onBack,
  onSaveDraft,
  onSubmit,
  isSubmitting = false,
  isSavingDraft = false,
  continueLabel = "Save & Continue",
  finishLabel = "Finish",
  backLabel = "Back",
  saveDraftLabel = "Save Draft",
  hideSaveDraft = false,
  extraActions,
  disableSubmit = false,
}: WizardNavBarProps) {
  const { isFirst, isLast, goBack } = useWizard();

  const handleBack = onBack ?? goBack;
  const isLoading = isSubmitting || isSavingDraft;

  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      <div className="flex items-center justify-between gap-4">
        {/* ── Left: Back ── */}
        <div className="flex items-center gap-3">
          {!isFirst && (
            <button
              type="button"
              onClick={handleBack}
              disabled={isLoading}
              className="
                inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium
                text-gray-600 bg-white border border-gray-300 rounded-lg
                hover:bg-gray-50 hover:text-gray-800
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-150
              "
            >
              <ChevronLeft className="h-4 w-4" />
              {backLabel}
            </button>
          )}
        </div>

        {/* ── Right: Save Draft + Submit ── */}
        <div className="flex items-center gap-3">
          {extraActions}

          {!hideSaveDraft && onSaveDraft && (
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={isLoading}
              className="
                inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium
                text-gray-600 bg-white border border-gray-300 rounded-lg
                hover:bg-gray-50 hover:text-gray-800
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-150
              "
            >
              {isSavingDraft ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saveDraftLabel}
            </button>
          )}

          <button
            type="button"
            onClick={onSubmit}
            disabled={isLoading || disableSubmit}
            className={`
              inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold
              rounded-lg transition-all duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isLast
                ? "bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-200"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200"
              }
            `}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isLast ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            {isLast ? finishLabel : continueLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

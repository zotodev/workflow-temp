import { createContext, useContext } from "react";
import type { WizardContextValue } from "../types/workflow";
import type { FieldValues } from "react-hook-form";

export const WizardContext = createContext<WizardContextValue | null>(null);

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error("useWizard must be used within a WorkflowWizardLayout");
  }
  return ctx;
}

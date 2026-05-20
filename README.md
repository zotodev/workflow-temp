# Workflow Wizard — File Map & Developer Guide

## File Structure

```
workflow-wizard/
├── types/
│   └── workflow.ts              # All shared types & interfaces
├── context/
│   └── WizardContext.ts         # React context + useWizard() hook
├── hooks/
│   └── useStageForm.ts          # ★ Core hook — use this in every stage page
├── components/
│   └── WizardNavBar.tsx         # ★ Bottom nav — Back / Save Draft / Continue / Finish
├── routes/
│   ├── cases.$caseId._workflowLayout.tsx  # Layout route: stepper + guards
│   ├── cases.$caseId.stage.basic-info.tsx # Example stage 1
│   └── cases.$caseId.stage.review.tsx     # Example final stage
├── server/
│   └── workflow.router.ts       # tRPC router (server)
└── db/
    └── schema.ts                # Drizzle schema
```

---

## Adding a New Stage — 3 Steps

### Step 1 — Register in WORKFLOW_STAGES
In `routes/cases.$caseId._workflowLayout.tsx`:
```ts
export const WORKFLOW_STAGES: WorkflowStage[] = [
  { slug: "basic-info", title: "Basic Info" },
  { slug: "parties",    title: "Parties" },      // ← add here, order matters
  { slug: "documents",  title: "Documents" },
  { slug: "review",     title: "Review" },
];
```

### Step 2 — Create the route file
`routes/cases.$caseId.stage.parties.tsx`:
```tsx
import { createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useStageForm } from "../../hooks/useStageForm";
import { WizardNavBar } from "../../components/WizardNavBar";

const schema = z.object({
  plaintiffName: z.string().min(1),
  defendantName: z.string().min(1),
});
type PartiesData = z.infer<typeof schema>;

export const Route = createFileRoute("/cases/$caseId/stage/parties")({
  component: PartiesStage,
});

function PartiesStage() {
  const { form, submitStage, saveDraft, isSubmitting } = useStageForm<PartiesData>({
    stageSlug: "parties",
    defaultValues: { plaintiffName: "", defendantName: "" },
    resolver: zodResolver(schema),
  });

  const { register, handleSubmit, formState: { errors } } = form;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* your fields */}
      <input {...register("plaintiffName")} />

      <WizardNavBar
        onSaveDraft={saveDraft}
        onSubmit={handleSubmit(submitStage)}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
```

### Step 3 — Done.
The layout, guards, stepper, and back/continue/finish buttons all work automatically.

---

## WizardNavBar Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSubmit` | `() => void` | required | Called on Save & Continue / Finish |
| `onSaveDraft` | `() => void` | — | Called on Save Draft; omit to hide button |
| `onBack` | `() => void` | `goBack()` | Override back navigation |
| `isSubmitting` | `boolean` | `false` | Disables all buttons, shows spinner |
| `isSavingDraft` | `boolean` | `false` | Shows spinner on Save Draft only |
| `continueLabel` | `string` | `"Save & Continue"` | Override continue button text |
| `finishLabel` | `string` | `"Finish"` | Override finish button text |
| `hideSaveDraft` | `boolean` | `false` | Hide the Save Draft button |
| `disableSubmit` | `boolean` | `false` | Disable the main CTA (e.g. form invalid) |
| `extraActions` | `ReactNode` | — | Inject extra buttons left of the CTA group |

---

## useStageForm Options

| Option | Type | Description |
|--------|------|-------------|
| `stageSlug` | `string` | Must match the slug in WORKFLOW_STAGES |
| `defaultValues` | `DefaultValues<T>` | Fallback values before saved data loads |
| `resolver` | `Resolver` | Pass `zodResolver(schema)` for validation |
| `onFinish` | `(entityId) => void` | Override navigation after final stage |

### Returns

| Value | Description |
|-------|-------------|
| `form` | Full `UseFormReturn<T>` — spread into your fields |
| `submitStage` | Pass to `handleSubmit(submitStage)` on the form submit |
| `saveDraft` | Already wrapped in `handleSubmit` — pass directly to `onSaveDraft` |
| `isSubmitting` | `true` while any mutation is in flight |
| `isSavedDataLoading` | `true` while fetching saved data — show skeleton |
| `savedData` | The previously saved data for this stage |

---

## Data Flow

```
User fills form
      │
      ▼
handleSubmit(submitStage)
      │
      ├─ saveStepCompletion (tRPC) → upserts step_completions row
      │
      ├─ advanceStage (tRPC) → updates workflow_runs.current_stage_slug
      │
      └─ navigate to next stage
             │
             ▼
       Stage page mounts
             │
             ▼
       useStageForm fetches getStepCompletion
             │
             ▼
       RHF hydrated with saved data  ← back-nav works automatically
```

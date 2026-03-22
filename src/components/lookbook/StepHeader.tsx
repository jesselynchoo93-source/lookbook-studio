"use client";

const STEPS = [
  { num: 1, label: "Campaign Inputs" },
  { num: 2, label: "Master Shoot DNA" },
  { num: 3, label: "Lookbook Plan" },
  { num: 4, label: "Export" },
];

interface StepHeaderProps {
  currentStep: number;
}

export default function StepHeader({ currentStep }: StepHeaderProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {STEPS.map((step, i) => (
        <div key={step.num} className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
              currentStep === step.num
                ? "bg-[--text-primary] text-[--text-inverted] font-medium"
                : currentStep > step.num
                ? "bg-[--surface-inset] text-[--text-primary]"
                : "bg-[--surface-page] text-[--text-tertiary]"
            }`}
          >
            <span className="text-xs font-mono">{step.num}</span>
            <span className="hidden sm:inline">{step.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`w-8 h-px ${
                currentStep > step.num ? "bg-[--text-tertiary]" : "bg-[--border-default]"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

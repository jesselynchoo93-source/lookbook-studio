"use client";

export type WorkflowMode = "setup" | "plan" | "generate" | "finalise";

interface ModeNavigatorProps {
  mode: WorkflowMode;
  onModeChange: (mode: WorkflowMode) => void;
  hasPlan: boolean;
  hasTracker: boolean;
}

const TABS: { id: WorkflowMode; label: string }[] = [
  { id: "setup", label: "Setup" },
  { id: "plan", label: "Plan" },
  { id: "generate", label: "Generate" },
  { id: "finalise", label: "Finalise" },
];

export default function ModeNavigator({
  mode,
  onModeChange,
  hasPlan,
  hasTracker,
}: ModeNavigatorProps) {
  function isEnabled(tab: WorkflowMode): boolean {
    if (tab === "setup") return true;
    if (tab === "plan") return hasPlan;
    if (tab === "generate") return hasPlan && hasTracker;
    if (tab === "finalise") return hasPlan && hasTracker;
    return false;
  }

  return (
    <nav className="bg-[--surface-inset] p-1 rounded-xl flex mb-6">
      {TABS.map((tab) => {
        const enabled = isEnabled(tab.id);
        const active = mode === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => enabled && onModeChange(tab.id)}
            disabled={!enabled}
            className={`flex-1 px-5 py-2 text-sm rounded-lg transition-all ${
              active
                ? "bg-[--text-primary] text-[--text-inverted] font-medium"
                : enabled
                  ? "text-[--text-secondary] hover:text-[--text-primary]"
                  : "text-[--text-tertiary] opacity-50 cursor-not-allowed"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

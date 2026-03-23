"use client";

import type {
  CampaignGoal,
  TargetStyle,
  GenderPresentation,
  LogoVisibilityPriority,
  CreativityLevel,
  ProductFamily,
  SettingsDriver,
} from "@/lib/lookbook/types";
import {
  GOAL_LABELS,
  STYLE_LABELS,
  GENDER_LABELS,
  LOGO_LABELS,
  CREATIVITY_LABELS,
} from "@/lib/lookbook/types";
import type { RecommendedSettings, SettingsWarning } from "@/lib/lookbook/recommendSettings";
import { getRecommendedSettings, getSettingsWarnings } from "@/lib/lookbook/recommendSettings";
import { useMemo } from "react";

// ── Dropdown option descriptions ──

const GOAL_DESCRIPTIONS: Record<CampaignGoal, string> = {
  product_clarity: "Best for clean selling images",
  premium_branding: "Best when brand visibility matters",
  silhouette: "Best for shape and outline emphasis",
  movement: "Best for dynamic product behaviour",
  mood: "Best for atmospheric brand storytelling",
  detail_focus: "Best for craftsmanship and close-up shots",
  styling_story: "Best for mood, identity, and lookbook feel",
};

const LOGO_DESCRIPTIONS: Record<LogoVisibilityPriority, string> = {
  low: "Branding can stay subtle or partially hidden",
  medium: "Branding should appear naturally when visible",
  high: "Branding should remain clearly readable in multiple shots",
};

const CREATIVITY_DESCRIPTIONS: Record<CreativityLevel, string> = {
  safe: "Cleaner, more reliable commercial poses",
  balanced: "Mix of commercial and editorial",
  directional: "More fashion-forward, higher risk",
};

// ── Driver badge labels and styles ──

const DRIVER_BADGE: Record<SettingsDriver, { label: string; hint: string; className: string }> = {
  preset: {
    label: "Creative Direction",
    hint: "Settings locked to your chosen preset",
    className: "bg-[--status-info-bg] text-[--status-info-text]",
  },
  ai_recommended: {
    label: "AI Recommended",
    hint: "Auto-tuned for your product and style",
    className: "bg-[--status-success-bg] text-[--status-success-text]",
  },
  custom: {
    label: "Custom",
    hint: "You set these manually",
    className: "bg-[--status-warning-bg] text-[--status-warning-text]",
  },
  modified_preset: {
    label: "Modified Preset",
    hint: "Started from a preset, then adjusted",
    className: "bg-purple-50 text-purple-700",
  },
};

// ── Props ──

interface CampaignGoalSelectorProps {
  goal: CampaignGoal;
  style: TargetStyle;
  gender: GenderPresentation;
  logo: LogoVisibilityPriority;
  creativity: CreativityLevel;
  productFamily: ProductFamily;
  specificItem?: string;
  settingsDriver: SettingsDriver;
  selectedPresetId?: string;
  pendingRecommendation: RecommendedSettings | null;
  onGoalChange: (v: CampaignGoal) => void;
  onStyleChange: (v: TargetStyle) => void;
  onGenderChange: (v: GenderPresentation) => void;
  onLogoChange: (v: LogoVisibilityPriority) => void;
  onCreativityChange: (v: CreativityLevel) => void;
  onApplyRecommendation: (rec: RecommendedSettings) => void;
  onKeepPreset: () => void;
}

// ── Generic Select Field with descriptions ──

function SelectField<T extends string>({
  label,
  helperText,
  value,
  options,
  labels,
  descriptions,
  onChange,
}: {
  label: string;
  helperText: string;
  value: T;
  options: T[];
  labels: Record<T, string>;
  descriptions?: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[--text-primary] mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full bg-[--surface-card] border border-[--border-default] rounded-lg px-3 py-2 text-[--text-primary] text-sm focus:outline-none focus:border-[--text-tertiary]"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {labels[opt]}
          </option>
        ))}
      </select>
      {descriptions && descriptions[value] && (
        <p className="mt-1 text-xs text-[--text-secondary]">{descriptions[value]}</p>
      )}
      <p className="mt-1 text-xs text-[--text-tertiary]">{helperText}</p>
    </div>
  );
}

// ── Options arrays ──

const goalOptions = Object.keys(GOAL_LABELS) as CampaignGoal[];
const styleOptions = Object.keys(STYLE_LABELS) as TargetStyle[];
const genderOptions = Object.keys(GENDER_LABELS) as GenderPresentation[];
const logoOptions = Object.keys(LOGO_LABELS) as LogoVisibilityPriority[];
const creativityOptions = Object.keys(CREATIVITY_LABELS) as CreativityLevel[];

// ── Active Recommendation Card (currently applied) ──

function ActiveRecommendationCard({
  recommendation,
}: {
  recommendation: RecommendedSettings;
}) {
  return (
    <div
      className="bg-[--surface-card] border border-[--border-default] rounded-xl p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-sm font-medium text-[--text-primary]">
          {recommendation.title}
        </p>
        <span className="shrink-0 text-xs text-[--status-success-text] font-medium px-2 py-1">
          Active
        </span>
      </div>

      <div className="flex gap-4 text-xs text-[--text-secondary] mb-2">
        <span>Goal: <span className="text-[--text-primary]">{GOAL_LABELS[recommendation.campaignGoal]}</span></span>
        <span>Branding: <span className="text-[--text-primary]">{LOGO_LABELS[recommendation.logoVisibilityPriority]}</span></span>
        <span>Creativity: <span className="text-[--text-primary]">{CREATIVITY_LABELS[recommendation.creativityLevel]}</span></span>
      </div>

      <p className="text-xs text-[--text-secondary] leading-relaxed">
        {recommendation.reason}
      </p>
    </div>
  );
}

// ── Pending Recommendation Card (suggestion with keep/apply buttons) ──

function PendingRecommendationCard({
  recommendation,
  onApply,
  onKeep,
}: {
  recommendation: RecommendedSettings;
  onApply: () => void;
  onKeep: () => void;
}) {
  return (
    <div className="bg-[--status-success-bg] border border-[--status-success-text]/20 rounded-xl p-4">
      <div className="mb-2">
        <p className="text-xs text-[--status-success-text] uppercase tracking-wider mb-1">
          Suggestion for this product
        </p>
        <p className="text-sm font-medium text-[--text-primary]">
          {recommendation.title}
        </p>
      </div>

      <div className="flex gap-4 text-xs text-[--text-secondary] mb-2">
        <span>Goal: <span className="text-[--text-primary]">{GOAL_LABELS[recommendation.campaignGoal]}</span></span>
        <span>Branding: <span className="text-[--text-primary]">{LOGO_LABELS[recommendation.logoVisibilityPriority]}</span></span>
        <span>Creativity: <span className="text-[--text-primary]">{CREATIVITY_LABELS[recommendation.creativityLevel]}</span></span>
      </div>

      <p className="text-xs text-[--text-secondary] leading-relaxed mb-3">
        {recommendation.reason}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onApply}
          className="text-xs bg-[--text-primary] text-[--text-inverted] font-medium px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={onKeep}
          className="text-xs border border-[--border-default] text-[--text-secondary] font-medium px-3 py-1.5 rounded-md hover:text-[--text-primary] transition-colors"
        >
          Keep current
        </button>
      </div>
    </div>
  );
}

// ── Passive Recommendation (shown when driver is custom/modified and no pending) ──

function PassiveRecommendationHint({
  recommendation,
  onApply,
}: {
  recommendation: RecommendedSettings;
  onApply: () => void;
}) {
  return (
    <div className="bg-[--surface-inset] rounded-lg p-3 flex items-center justify-between gap-3">
      <p className="text-xs text-[--text-tertiary] min-w-0">
        AI would suggest: <span className="text-[--text-secondary]">{recommendation.title}</span>
      </p>
      <button
        type="button"
        onClick={onApply}
        className="shrink-0 text-xs text-[--text-secondary] hover:text-[--text-primary] transition-colors underline underline-offset-2"
      >
        Apply
      </button>
    </div>
  );
}

// ── Warning Display ──

function WarningList({ warnings }: { warnings: SettingsWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {warnings.map((w, i) => (
        <p key={i} className="text-xs text-[--status-warning-text] leading-relaxed">
          {w.message}
        </p>
      ))}
    </div>
  );
}

// ── Main Component ──

export default function CampaignGoalSelector({
  goal,
  style,
  gender,
  logo,
  creativity,
  productFamily,
  specificItem,
  settingsDriver,
  selectedPresetId,
  pendingRecommendation,
  onGoalChange,
  onStyleChange,
  onGenderChange,
  onLogoChange,
  onCreativityChange,
  onApplyRecommendation,
  onKeepPreset,
}: CampaignGoalSelectorProps) {
  const recommendation = useMemo(
    () => getRecommendedSettings({ productFamily, specificItem, genderPresentation: gender, targetStyle: style }),
    [productFamily, specificItem, gender, style],
  );

  const warnings = useMemo(
    () => getSettingsWarnings(goal, logo, creativity, productFamily),
    [goal, logo, creativity, productFamily],
  );

  const isRecommendationActive =
    settingsDriver === "ai_recommended" &&
    goal === recommendation.campaignGoal &&
    logo === recommendation.logoVisibilityPriority &&
    creativity === recommendation.creativityLevel;

  const showPendingCard = pendingRecommendation !== null;
  const showActiveCard = isRecommendationActive && !showPendingCard;
  const showPassiveHint = !showPendingCard && !showActiveCard &&
    (settingsDriver === "custom" || settingsDriver === "modified_preset");

  const badge = DRIVER_BADGE[settingsDriver];

  return (
    <div className="space-y-5">
      {/* Settings driver badge */}
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${badge.className}`}>
          {badge.label}
        </span>
        <span className="text-xs text-[--text-tertiary]">
          {badge.hint}
        </span>
      </div>

      {/* Gender + Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField
          label="Gender Presentation"
          helperText="The model's presentation style. Affects pose and styling."
          value={gender}
          options={genderOptions}
          labels={GENDER_LABELS}
          onChange={onGenderChange}
        />
        <SelectField
          label="Target Style"
          helperText="The visual style of your lookbook."
          value={style}
          options={styleOptions}
          labels={STYLE_LABELS}
          onChange={onStyleChange}
        />
      </div>

      {/* Recommendation cards (mutually exclusive) */}
      {showPendingCard && (
        <PendingRecommendationCard
          recommendation={pendingRecommendation!}
          onApply={() => onApplyRecommendation(pendingRecommendation!)}
          onKeep={onKeepPreset}
        />
      )}

      {showActiveCard && (
        <ActiveRecommendationCard recommendation={recommendation} />
      )}

      {showPassiveHint && (
        <PassiveRecommendationHint
          recommendation={recommendation}
          onApply={() => onApplyRecommendation(recommendation)}
        />
      )}

      {/* Goal / Logo / Creativity fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField
          label="What do you want this set to do?"
          helperText="Choose what the shoot should prioritise most: selling the product clearly, highlighting branding, focusing on detail, or creating a stronger mood."
          value={goal}
          options={goalOptions}
          labels={GOAL_LABELS}
          descriptions={GOAL_DESCRIPTIONS}
          onChange={onGoalChange}
        />
        <SelectField
          label="How important is visible branding?"
          helperText="Pick high only if logos or brand marks need to stay consistently readable across multiple shots."
          value={logo}
          options={logoOptions}
          labels={LOGO_LABELS}
          descriptions={LOGO_DESCRIPTIONS}
          onChange={onLogoChange}
        />
      </div>

      <SelectField
        label="How experimental should the poses be?"
        helperText="Safe = cleaner commercial poses. Balanced = mix of clean and editorial. Directional = stronger fashion energy with more risk."
        value={creativity}
        options={creativityOptions}
        labels={CREATIVITY_LABELS}
        descriptions={CREATIVITY_DESCRIPTIONS}
        onChange={onCreativityChange}
      />

      {/* Warnings for risky combinations */}
      <WarningList warnings={warnings} />
    </div>
  );
}

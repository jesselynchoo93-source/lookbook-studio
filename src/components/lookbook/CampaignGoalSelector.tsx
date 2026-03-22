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

const DRIVER_BADGE: Record<SettingsDriver, { label: string; className: string }> = {
  preset: {
    label: "Preset Active",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  ai_recommended: {
    label: "AI Recommended",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  custom: {
    label: "Custom",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  modified_preset: {
    label: "Modified from Preset",
    className: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
};

// ── Props ──

interface CampaignGoalSelectorProps {
  goal: CampaignGoal;
  style: TargetStyle;
  gender: GenderPresentation;
  logo: LogoVisibilityPriority;
  creativity: CreativityLevel;
  notes: string;
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
  onNotesChange: (v: string) => void;
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
      <label className="block text-sm font-medium text-gray-200 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {labels[opt]}
          </option>
        ))}
      </select>
      {descriptions && descriptions[value] && (
        <p className="mt-1 text-xs text-gray-400">{descriptions[value]}</p>
      )}
      <p className="mt-1 text-xs text-gray-500">{helperText}</p>
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
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
            Recommended Settings for This Product
          </p>
          <p className="text-sm font-medium text-white">
            {recommendation.title}
          </p>
        </div>
        <span className="shrink-0 text-xs text-emerald-400 font-medium px-3 py-1.5">
          Active
        </span>
      </div>

      <div className="flex gap-4 text-xs text-gray-300 mb-2">
        <span>Goal: <span className="text-white">{GOAL_LABELS[recommendation.campaignGoal]}</span></span>
        <span>Branding: <span className="text-white">{LOGO_LABELS[recommendation.logoVisibilityPriority]}</span></span>
        <span>Creativity: <span className="text-white">{CREATIVITY_LABELS[recommendation.creativityLevel]}</span></span>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        Based on your selected product, style, and model presentation.
      </p>
      <p className="text-xs text-gray-400 leading-relaxed mt-1">
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
    <div className="bg-emerald-950/30 border border-emerald-700/40 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">
            Recommended Settings for This Product
          </p>
          <p className="text-sm font-medium text-white">
            {recommendation.title}
          </p>
        </div>
      </div>

      <div className="flex gap-4 text-xs text-gray-300 mb-2">
        <span>Goal: <span className="text-white">{GOAL_LABELS[recommendation.campaignGoal]}</span></span>
        <span>Branding: <span className="text-white">{LOGO_LABELS[recommendation.logoVisibilityPriority]}</span></span>
        <span>Creativity: <span className="text-white">{CREATIVITY_LABELS[recommendation.creativityLevel]}</span></span>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed mb-1">
        Based on your selected product, style, and model presentation.
      </p>
      <p className="text-xs text-gray-400 leading-relaxed mb-3">
        <span className="text-emerald-400/80">Why: </span>{recommendation.reason}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onApply}
          className="text-xs bg-white text-gray-900 font-medium px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
        >
          Apply recommendation
        </button>
        <button
          type="button"
          onClick={onKeep}
          className="text-xs bg-gray-700 text-gray-300 font-medium px-3 py-1.5 rounded-md hover:bg-gray-600 transition-colors"
        >
          Keep current settings
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
    <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs text-gray-500">
          AI suggestion: <span className="text-gray-400">{recommendation.title}</span>
          {" "}&mdash;{" "}{GOAL_LABELS[recommendation.campaignGoal]}, {LOGO_LABELS[recommendation.logoVisibilityPriority].toLowerCase()} branding, {CREATIVITY_LABELS[recommendation.creativityLevel].toLowerCase()} creativity
        </p>
      </div>
      <button
        type="button"
        onClick={onApply}
        className="shrink-0 text-xs text-gray-400 hover:text-white transition-colors underline underline-offset-2"
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
        <p key={i} className="text-xs text-amber-400/80 leading-relaxed">
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
  notes,
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
  onNotesChange,
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

  // Determine which recommendation card to show
  const showPendingCard = pendingRecommendation !== null;
  const showActiveCard = isRecommendationActive && !showPendingCard;
  const showPassiveHint = !showPendingCard && !showActiveCard &&
    (settingsDriver === "custom" || settingsDriver === "modified_preset");

  const badge = DRIVER_BADGE[settingsDriver];

  return (
    <div className="space-y-5">
      {/* Settings driver badge */}
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border ${badge.className}`}>
          {badge.label}
        </span>
        {settingsDriver === "modified_preset" && selectedPresetId && (
          <span className="text-xs text-gray-500">
            Started from preset, then customised
          </span>
        )}
        {settingsDriver === "custom" && (
          <span className="text-xs text-gray-500">
            Manually configured
          </span>
        )}
      </div>

      {/* Gender + Style (context selectors, outside the recommendation scope) */}
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

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-1">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="e.g. 'Focus on the back panel detail' or 'Model should feel relaxed, not stiff'"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500 min-h-[60px] resize-y"
        />
        <p className="mt-1 text-xs text-gray-500">Any specific direction or constraints for this lookbook.</p>
      </div>
    </div>
  );
}

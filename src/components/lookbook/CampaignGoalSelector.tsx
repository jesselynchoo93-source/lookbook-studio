"use client";

import type {
  CampaignGoal,
  TargetStyle,
  GenderPresentation,
  LogoVisibilityPriority,
  CreativityLevel,
  ProductFamily,
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
  hasManualOverride: boolean;
  onGoalChange: (v: CampaignGoal) => void;
  onStyleChange: (v: TargetStyle) => void;
  onGenderChange: (v: GenderPresentation) => void;
  onLogoChange: (v: LogoVisibilityPriority) => void;
  onCreativityChange: (v: CreativityLevel) => void;
  onNotesChange: (v: string) => void;
  onApplyRecommendation: (rec: RecommendedSettings) => void;
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

// ── Recommendation Card ──

function RecommendationCard({
  recommendation,
  isActive,
  onApply,
}: {
  recommendation: RecommendedSettings;
  isActive: boolean;
  onApply: () => void;
}) {
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
            Suggested settings
          </p>
          <p className="text-sm font-medium text-white">
            {recommendation.title}
          </p>
        </div>
        {!isActive && (
          <button
            type="button"
            onClick={onApply}
            className="shrink-0 text-xs bg-white text-gray-900 font-medium px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
          >
            Use suggested
          </button>
        )}
        {isActive && (
          <span className="shrink-0 text-xs text-green-400 font-medium px-3 py-1.5">
            Applied
          </span>
        )}
      </div>

      <div className="flex gap-4 text-xs text-gray-300 mb-2">
        <span>Goal: <span className="text-white">{GOAL_LABELS[recommendation.campaignGoal]}</span></span>
        <span>Branding: <span className="text-white">{LOGO_LABELS[recommendation.logoVisibilityPriority]}</span></span>
        <span>Creativity: <span className="text-white">{CREATIVITY_LABELS[recommendation.creativityLevel]}</span></span>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">
        {recommendation.reason}
      </p>
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
  hasManualOverride,
  onGoalChange,
  onStyleChange,
  onGenderChange,
  onLogoChange,
  onCreativityChange,
  onNotesChange,
  onApplyRecommendation,
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
    goal === recommendation.campaignGoal &&
    logo === recommendation.logoVisibilityPriority &&
    creativity === recommendation.creativityLevel;

  return (
    <div className="space-y-5">
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

      {/* Recommendation Card */}
      <RecommendationCard
        recommendation={recommendation}
        isActive={isRecommendationActive}
        onApply={() => onApplyRecommendation(recommendation)}
      />

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

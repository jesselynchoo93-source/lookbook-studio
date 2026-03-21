"use client";

import type {
  CampaignGoal,
  TargetStyle,
  GenderPresentation,
  LogoVisibilityPriority,
  CreativityLevel,
} from "@/lib/lookbook/types";
import {
  GOAL_LABELS,
  STYLE_LABELS,
  GENDER_LABELS,
  LOGO_LABELS,
  CREATIVITY_LABELS,
} from "@/lib/lookbook/types";
import InfoTooltip from "./InfoTooltip";

interface CampaignGoalSelectorProps {
  goal: CampaignGoal;
  style: TargetStyle;
  gender: GenderPresentation;
  logo: LogoVisibilityPriority;
  creativity: CreativityLevel;
  notes: string;
  onGoalChange: (v: CampaignGoal) => void;
  onStyleChange: (v: TargetStyle) => void;
  onGenderChange: (v: GenderPresentation) => void;
  onLogoChange: (v: LogoVisibilityPriority) => void;
  onCreativityChange: (v: CreativityLevel) => void;
  onNotesChange: (v: string) => void;
}

function SelectField<T extends string>({
  label,
  tooltip,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  tooltip: string;
  value: T;
  options: T[];
  labels: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-300 mb-1.5">
        {label}
        <InfoTooltip text={tooltip} />
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
    </div>
  );
}

const goalOptions = Object.keys(GOAL_LABELS) as CampaignGoal[];
const styleOptions = Object.keys(STYLE_LABELS) as TargetStyle[];
const genderOptions = Object.keys(GENDER_LABELS) as GenderPresentation[];
const logoOptions = Object.keys(LOGO_LABELS) as LogoVisibilityPriority[];
const creativityOptions = Object.keys(CREATIVITY_LABELS) as CreativityLevel[];

export default function CampaignGoalSelector({
  goal,
  style,
  gender,
  logo,
  creativity,
  notes,
  onGoalChange,
  onStyleChange,
  onGenderChange,
  onLogoChange,
  onCreativityChange,
  onNotesChange,
}: CampaignGoalSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField
          label="Gender Presentation"
          tooltip="The model's presentation style. Affects pose and styling recommendations."
          value={gender}
          options={genderOptions}
          labels={GENDER_LABELS}
          onChange={onGenderChange}
        />
        <SelectField
          label="Target Style"
          tooltip="The visual style of your lookbook. Luxury prioritises premium finish; editorial allows more creative angles."
          value={style}
          options={styleOptions}
          labels={STYLE_LABELS}
          onChange={onStyleChange}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField
          label="Campaign Goal"
          tooltip="What matters most for this lookbook. Product clarity shows the garment clearly; mood creates brand atmosphere."
          value={goal}
          options={goalOptions}
          labels={GOAL_LABELS}
          onChange={onGoalChange}
        />
        <SelectField
          label="Logo Visibility"
          tooltip="How important is it that brand logos and text remain visible? High = every shot preserves branding."
          value={logo}
          options={logoOptions}
          labels={LOGO_LABELS}
          onChange={onLogoChange}
        />
      </div>

      <SelectField
        label="Creativity Level"
        tooltip="Safe = proven shot types with high reliability. Balanced = mix of safe and interesting. Directional = more editorial risk."
        value={creativity}
        options={creativityOptions}
        labels={CREATIVITY_LABELS}
        onChange={onCreativityChange}
      />

      <div>
        <label className="block text-sm text-gray-300 mb-1.5">
          Notes (optional)
          <InfoTooltip text="Any specific direction or constraints for this lookbook." />
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="e.g. 'Focus on the back panel detail' or 'Model should feel relaxed, not stiff'"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500 min-h-[60px] resize-y"
        />
      </div>
    </div>
  );
}

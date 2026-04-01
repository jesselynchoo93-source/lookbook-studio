"use client";

import { useCallback } from "react";
import type { StudioEngine } from "@/lib/lookbook/types";

interface EngineSelectorProps {
  recommended?: StudioEngine;
  onSelect: (engine: StudioEngine) => void;
}

const ENGINE_CARDS: {
  engine: StudioEngine;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
}[] = [
  {
    engine: "editorial",
    title: "Editorial / Campaign Lookbook",
    subtitle: "Mood, world, story, coordinated fashion shots",
    description:
      "Best for brand campaigns, editorial features, and luxury lookbooks. " +
      "Full creative control over world-building, taste, and editorial beats.",
    features: [
      "World-building and taste controls",
      "Editorial beat sequencing",
      "Mood and lighting direction",
      "Styling story coordination",
    ],
  },
  {
    engine: "commerce",
    title: "Product / Commerce Lookbook",
    subtitle: "Clean product-selling imagery, reference-locked",
    description:
      "Best for e-commerce, catalog, wholesale, and PDP support. " +
      "Reference-locked poses with direct, literal prompt control.",
    features: [
      "Template family selection",
      "Reference-locked poses and lighting",
      "Direct garment swap control",
      "Studio-clean backgrounds",
    ],
  },
];

export default function EngineSelector({
  recommended,
  onSelect,
}: EngineSelectorProps) {
  const handleSelect = useCallback(
    (engine: StudioEngine) => {
      onSelect(engine);
    },
    [onSelect],
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h2 className="text-xl font-semibold text-[--text-primary] mb-2">
        Choose your studio mode
      </h2>
      <p className="text-sm text-[--text-secondary] mb-8">
        Each mode is optimised for a different job. You can always create
        another project in the other mode.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ENGINE_CARDS.map((card) => {
          const isRecommended = recommended === card.engine;

          return (
            <button
              key={card.engine}
              onClick={() => handleSelect(card.engine)}
              className={`
                relative text-left p-6 rounded-xl border transition-all
                hover:shadow-[--shadow-card] hover:border-[--text-tertiary]
                ${isRecommended
                  ? "border-[--accent-warm] bg-[--surface-card]"
                  : "border-[--border-subtle] bg-[--surface-card]"
                }
              `}
            >
              {isRecommended && (
                <span className="absolute top-3 right-3 text-[10px] font-medium uppercase tracking-wider text-[--accent-warm] bg-[--status-amber-bg] px-2 py-0.5 rounded-full">
                  Recommended
                </span>
              )}

              <h3 className="text-base font-semibold text-[--text-primary] mb-1">
                {card.title}
              </h3>
              <p className="text-sm text-[--text-secondary] mb-3">
                {card.subtitle}
              </p>
              <p className="text-xs text-[--text-tertiary] mb-4 leading-relaxed">
                {card.description}
              </p>

              <ul className="space-y-1.5">
                {card.features.map((feature) => (
                  <li
                    key={feature}
                    className="text-xs text-[--text-secondary] flex items-start gap-2"
                  >
                    <span className="text-[--text-tertiary] mt-0.5 shrink-0">
                      &bull;
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
}

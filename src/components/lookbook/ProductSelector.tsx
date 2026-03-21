"use client";

import type { ProductFamily } from "@/lib/lookbook/types";
import { PRODUCT_FAMILY_LABELS } from "@/lib/lookbook/types";
import { PRODUCT_ITEMS } from "@/lib/lookbook/taxonomy";
import InfoTooltip from "./InfoTooltip";

interface ProductSelectorProps {
  family: ProductFamily;
  specificItem?: string;
  onFamilyChange: (family: ProductFamily) => void;
  onItemChange: (item: string) => void;
}

const families = Object.keys(PRODUCT_FAMILY_LABELS) as ProductFamily[];

export default function ProductSelector({
  family,
  specificItem,
  onFamilyChange,
  onItemChange,
}: ProductSelectorProps) {
  const items = PRODUCT_ITEMS[family];

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm text-gray-300 mb-1.5">
          Product Family
          <InfoTooltip text="The broad category of your product. This helps the system choose appropriate shot types." />
        </label>
        <select
          value={family}
          onChange={(e) => {
            onFamilyChange(e.target.value as ProductFamily);
            onItemChange("");
          }}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
        >
          {families.map((f) => (
            <option key={f} value={f}>
              {PRODUCT_FAMILY_LABELS[f]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1.5">
          Specific Item
          <InfoTooltip text="Optional. Choosing a specific item helps tailor shot recommendations to your exact product." />
        </label>
        <select
          value={specificItem || ""}
          onChange={(e) => onItemChange(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
        >
          <option value="">Any / not specified</option>
          {items.map((item) => (
            <option key={item} value={item}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

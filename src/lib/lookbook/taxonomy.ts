import type { ProductFamily } from "./types";

export const PRODUCT_ITEMS: Record<ProductFamily, string[]> = {
  apparel: [
    "t-shirt", "shirt", "polo", "knitwear", "blazer", "suit jacket",
    "bomber", "leather jacket", "coat", "trench", "hoodie", "sweatshirt",
    "dress", "skirt", "trousers", "jeans", "shorts",
  ],
  footwear: ["sneakers", "loafers", "derby shoes", "boots", "heels", "sandals"],
  bags: ["tote", "shoulder bag", "crossbody", "clutch", "backpack"],
  jewelry: ["earrings", "necklace", "bracelet", "ring"],
  eyewear: ["sunglasses", "optical glasses"],
  watches: ["dress watch", "sport watch"],
  headwear: ["cap", "beanie", "hat"],
  belts: ["leather belt", "statement belt"],
  scarves: ["silk scarf", "knit scarf"],
  small_accessories: ["wallet", "cardholder", "charm", "phone case"],
  full_look: ["multiple pieces styled together"],
};

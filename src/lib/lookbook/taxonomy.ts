import type { ProductFamily } from "./types";

export const PRODUCT_ITEMS: Record<ProductFamily, string[]> = {
  apparel: [
    "t-shirt", "shirt", "polo", "knitwear", "blazer", "suit jacket",
    "bomber", "leather jacket", "coat", "trench", "hoodie", "sweatshirt",
    "dress", "skirt", "trousers", "jeans", "shorts", "cardigan", "vest",
    "jumpsuit", "overcoat", "parka",
  ],
  footwear: ["sneakers", "loafers", "derby shoes", "boots", "heels", "sandals", "mules", "slides"],
  bags: ["tote", "shoulder bag", "crossbody", "clutch", "backpack", "sling bag", "bucket bag", "mini bag", "hobo"],
  jewelry: ["earrings", "necklace", "bracelet", "ring", "brooch", "anklet", "cufflinks"],
  eyewear: ["sunglasses", "optical glasses"],
  watches: ["dress watch", "sport watch", "chronograph", "diver watch"],
  headwear: ["cap", "beanie", "hat", "bucket hat", "fedora", "sun hat", "wide brim hat", "beret"],
  belts: ["leather belt", "statement belt", "chain belt", "woven belt"],
  scarves: ["silk scarf", "knit scarf", "wool scarf", "bandana"],
  small_accessories: ["wallet", "cardholder", "card holder", "charm", "phone case", "key holder", "coin purse"],
  full_look: ["multiple pieces styled together"],
};

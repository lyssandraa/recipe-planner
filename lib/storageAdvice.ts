import type { IngredientCategory } from "@prisma/client";

// Fixed set of facts, no API, no search, no LLM. Keyed by the canonical
// singular form, matched against an ingredient's name (or any single word
// within it, so "Fresh Ginger" still finds "ginger") allowing simple
// plurals. Category fallbacks apply when nothing more specific matches.
const HERB_ADVICE = "Stems in a glass of water, bag over the top, in the fridge.";
const BERRY_ADVICE = "Don't wash until eating, single layer, in the fridge.";
const RED_MEAT_ADVICE = "Fridge on the bottom shelf, use within the date on the pack, or freeze.";
const DRY_GOODS_ADVICE = "Airtight container somewhere cool and dry.";

const BY_NAME: Record<string, string> = {
  potato: "Cool, dark, dry, out of the fridge, away from onions.",
  onion: "Dry and airy, not in a sealed bag, away from potatoes.",
  tomato: "Room temperature, never the fridge, stem side down.",
  parsley: HERB_ADVICE,
  coriander: HERB_ADVICE,
  mint: HERB_ADVICE,
  dill: HERB_ADVICE,
  chives: HERB_ADVICE,
  basil: "Room temperature like a cut flower, not the fridge, it hates the cold.",
  celery: "Wrap tightly in foil rather than the plastic bag it comes in.",
  banana: "Separate from other fruit, they ripen everything nearby.",
  strawberry: BERRY_ADVICE,
  raspberry: BERRY_ADVICE,
  blueberry: BERRY_ADVICE,
  blackberry: BERRY_ADVICE,
  mushroom: "Paper bag, never plastic.",
  bread: "Room temperature in a bag, or frozen, never the fridge.",
  garlic: "Cool, dark and dry, out of the fridge, in an open container.",
  ginger: "Whole and unpeeled in the fridge, or freeze it and grate from frozen.",
  lemon: "Room temperature for a few days, or in the fridge for longer.",
  lime: "Room temperature for a few days, or in the fridge for longer.",
  avocado: "Room temperature to ripen, then the fridge once soft to slow it down.",
  cucumber: "Fridge, ideally wrapped, it's sensitive to cold damage below about 10C.",
  lettuce: "Fridge, wrapped loosely with a paper towel to absorb moisture.",
  spinach: "Fridge, in a bag with a paper towel to stop it going slimy.",
  carrot: "Fridge, with the leafy tops removed if still attached.",
  apple: "Fridge, away from other produce, they release ripening gas too.",
  cheese: "Wrapped in wax or greaseproof paper rather than cling film, in the fridge.",
  butter: "Fridge, or a covered butter dish at room temperature for a few days.",
  milk: "Fridge, towards the back where it's coldest, not in the door.",
  yoghurt: "Fridge, tightly sealed.",
  yogurt: "Fridge, tightly sealed.",
  egg: "Fridge, pointed end down, in the box rather than the door.",
  cream: "Fridge, use promptly once opened.",
  chicken: "Fridge on the bottom shelf, use within a couple of days, or freeze.",
  beef: RED_MEAT_ADVICE,
  lamb: RED_MEAT_ADVICE,
  fish: "Fridge on the bottom shelf, ideally use the day you buy it, or freeze.",
  sausage: "Fridge on the bottom shelf, use within the date on the pack, or freeze.",
  rice: DRY_GOODS_ADVICE,
  pasta: DRY_GOODS_ADVICE,
  spaghetti: DRY_GOODS_ADVICE,
  flour: "Airtight container somewhere cool and dry, away from strong smells.",
  sugar: DRY_GOODS_ADVICE,
  oat: DRY_GOODS_ADVICE,
  lentil: DRY_GOODS_ADVICE,
  honey: "Room temperature, sealed. It doesn't need the fridge and lasts almost indefinitely.",
  nut: "Airtight container in a cool place, or the fridge or freezer to stop them going rancid.",
  chocolate: "Cool and dry, not the fridge if you can help it, it can pick up odours and bloom.",
  cabbage: "Fridge, whole and unwashed until needed.",
  broccoli: "Fridge, unwashed, use within a few days.",
  cauliflower: "Fridge, unwashed, use within a few days.",
  "bell pepper": "Fridge, in the crisper drawer.",
  courgette: "Fridge, in the crisper drawer, use within a few days.",
  aubergine: "Fridge, in the crisper drawer, or a cool room if using soon.",
  leek: "Fridge, wrapped, or a cool dark place for a day or two.",
  beetroot: "Fridge, with any leafy tops removed.",
  "sweet potato": "Cool, dark and dry, like a regular potato, not the fridge.",
  squash: "Cool, dark and dry, it keeps for weeks unlike most fresh produce.",
  pumpkin: "Cool, dark and dry, it keeps for weeks unlike most fresh produce.",
  "olive oil": "Cool, dark cupboard, away from the stove. Light and heat degrade it.",
  parmesan: "Wrapped in wax or greaseproof paper rather than cling film, in the fridge.",
  cheddar: "Wrapped in wax or greaseproof paper rather than cling film, in the fridge.",
  mozzarella: "In its liquid, in the fridge, use within a couple of days of opening.",
};

const BY_CATEGORY: Partial<Record<IngredientCategory, string>> = {
  PRODUCE:
    "Most fresh produce keeps best in the fridge crisper drawer, but check first, some things (tomatoes, bananas, potatoes, onions) hate the cold.",
  MEAT_FISH: RED_MEAT_ADVICE,
  DAIRY: "Fridge, tightly sealed or wrapped.",
  DRY_GOODS: DRY_GOODS_ADVICE,
  TINS_JARS: "Cool cupboard unopened, fridge once opened.",
  SPICES: "Airtight container away from light and heat, they lose flavour fast in the sun.",
  FROZEN: "Keep frozen until you're ready to use it.",
};

function namesMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a === `${b}s` || b === `${a}s`) return true;
  if (a === `${b}es` || b === `${a}es`) return true;
  if (a.endsWith("ies") && `${a.slice(0, -3)}y` === b) return true;
  if (b.endsWith("ies") && `${b.slice(0, -3)}y` === a) return true;
  return false;
}

export function getStaticStorageAdvice(
  name: string,
  category: IngredientCategory
): string | null {
  const lower = name.toLowerCase().trim();
  const words = lower.split(/\s+/);

  for (const [key, advice] of Object.entries(BY_NAME)) {
    if (namesMatch(lower, key)) return advice;
    if (words.some((w) => namesMatch(w, key))) return advice;
  }

  return BY_CATEGORY[category] ?? null;
}

import type { Cuisine, Mood, Protein, CookMethod, Season } from "@prisma/client";
import { isoToFlagEmoji } from "./countries";

// Label and emoji for each value in each of the five independent tag
// dimensions. Kept together per dimension (rather than one big lookup)
// since each dimension is rendered as its own chip group in the recipe
// form and filter panel, in this declared order.

export const CUISINE_ORDER: Cuisine[] = [
  "BRITISH",
  "ITALIAN",
  "FRENCH",
  "GREEK",
  "MIDDLE_EASTERN",
  "PERSIAN",
  "NORTH_AFRICAN",
  "INDIAN",
  "CHINESE",
  "THAI",
  "JAPANESE",
  "MEXICAN",
  "SPANISH",
  "AMERICAN",
  "OTHER",
];

export const CUISINE_LABELS: Record<Cuisine, string> = {
  BRITISH: "British",
  ITALIAN: "Italian",
  FRENCH: "French",
  GREEK: "Greek",
  MIDDLE_EASTERN: "Middle Eastern",
  PERSIAN: "Persian",
  NORTH_AFRICAN: "North African",
  INDIAN: "Indian",
  CHINESE: "Chinese",
  THAI: "Thai",
  JAPANESE: "Japanese",
  MEXICAN: "Mexican",
  SPANISH: "Spanish",
  AMERICAN: "American",
  OTHER: "Other",
};

// Flag emoji where a cuisine maps to one obvious country; a generic emoji
// for the regional or catch-all ones that don't.
export const CUISINE_EMOJI: Record<Cuisine, string> = {
  BRITISH: isoToFlagEmoji("GB"),
  ITALIAN: isoToFlagEmoji("IT"),
  FRENCH: isoToFlagEmoji("FR"),
  GREEK: isoToFlagEmoji("GR"),
  MIDDLE_EASTERN: "🧆",
  PERSIAN: isoToFlagEmoji("IR"),
  NORTH_AFRICAN: "🫘",
  INDIAN: isoToFlagEmoji("IN"),
  CHINESE: isoToFlagEmoji("CN"),
  THAI: isoToFlagEmoji("TH"),
  JAPANESE: isoToFlagEmoji("JP"),
  MEXICAN: isoToFlagEmoji("MX"),
  SPANISH: isoToFlagEmoji("ES"),
  AMERICAN: isoToFlagEmoji("US"),
  OTHER: "🌍",
};

export const MOOD_ORDER: Mood[] = [
  "COMFORTING",
  "FRESH_LIGHT",
  "HEARTY",
  "SPICY",
  "WARMING",
  "COOLING",
  "INDULGENT",
  "QUICK_SIMPLE",
];

export const MOOD_LABELS: Record<Mood, string> = {
  COMFORTING: "Comforting",
  FRESH_LIGHT: "Fresh and light",
  HEARTY: "Hearty",
  SPICY: "Spicy",
  WARMING: "Warming",
  COOLING: "Cooling",
  INDULGENT: "Indulgent",
  QUICK_SIMPLE: "Quick and simple",
};

export const MOOD_EMOJI: Record<Mood, string> = {
  COMFORTING: "🍲",
  FRESH_LIGHT: "🥗",
  HEARTY: "🍖",
  SPICY: "🌶️",
  WARMING: "🔥",
  COOLING: "🧊",
  INDULGENT: "🍫",
  QUICK_SIMPLE: "⚡",
};

// Tint background + matching deep text, one per mood, for the dashboard's
// mood row. Cycles through the warm palette rather than reusing one colour
// for every chip.
export const MOOD_CHIP_CLASS: Record<Mood, string> = {
  COMFORTING: "bg-amber-tint text-amber-text",
  FRESH_LIGHT: "bg-lime-tint text-green-deep",
  HEARTY: "bg-terracotta-tint text-terracotta-text",
  SPICY: "bg-terracotta-tint text-terracotta-text",
  WARMING: "bg-amber-tint text-amber-text",
  COOLING: "bg-teal-tint text-ink",
  INDULGENT: "bg-pink-tint text-ink",
  QUICK_SIMPLE: "bg-lime-tint text-green-deep",
};

export const PROTEIN_ORDER: Protein[] = [
  "LAMB",
  "CHICKEN",
  "BEEF",
  "FISH",
  "SEAFOOD",
  "EGGS",
  "VEGETARIAN",
  "VEGAN",
];

export const PROTEIN_LABELS: Record<Protein, string> = {
  LAMB: "Lamb",
  CHICKEN: "Chicken",
  BEEF: "Beef",
  FISH: "Fish",
  SEAFOOD: "Seafood",
  EGGS: "Eggs",
  VEGETARIAN: "Vegetarian",
  VEGAN: "Vegan",
};

export const PROTEIN_EMOJI: Record<Protein, string> = {
  LAMB: "🐑",
  CHICKEN: "🍗",
  BEEF: "🥩",
  FISH: "🐟",
  SEAFOOD: "🦐",
  EGGS: "🥚",
  VEGETARIAN: "🥦",
  VEGAN: "🌱",
};

export const COOK_METHOD_ORDER: CookMethod[] = [
  "BRAISED",
  "ROASTED",
  "GRILLED",
  "FRIED",
  "ONE_PAN",
  "NO_COOK",
  "SLOW_COOKER",
  "PRESSURE_COOKER",
  "BAKED",
];

export const COOK_METHOD_LABELS: Record<CookMethod, string> = {
  BRAISED: "Braised",
  ROASTED: "Roasted",
  GRILLED: "Grilled",
  FRIED: "Fried",
  ONE_PAN: "One-pan",
  NO_COOK: "No-cook",
  SLOW_COOKER: "Slow cooker",
  PRESSURE_COOKER: "Pressure cooker",
  BAKED: "Baked",
};

export const COOK_METHOD_EMOJI: Record<CookMethod, string> = {
  BRAISED: "🍲",
  ROASTED: "🔥",
  GRILLED: "🍖",
  FRIED: "🍳",
  ONE_PAN: "🍳",
  NO_COOK: "🥗",
  SLOW_COOKER: "⏲️",
  PRESSURE_COOKER: "⏲️",
  BAKED: "🍞",
};

export const SEASON_ORDER: Season[] = ["SPRING", "SUMMER", "AUTUMN", "WINTER", "ALL_YEAR"];

export const SEASON_LABELS: Record<Season, string> = {
  SPRING: "Spring",
  SUMMER: "Summer",
  AUTUMN: "Autumn",
  WINTER: "Winter",
  ALL_YEAR: "All year",
};

export const SEASON_EMOJI: Record<Season, string> = {
  SPRING: "🌱",
  SUMMER: "☀️",
  AUTUMN: "🍂",
  WINTER: "❄️",
  ALL_YEAR: "🔄",
};

// One tag dimension's worth of data, generic over its enum, so a single
// chip-group component can render any of the five without repeating itself.
export type TagDimension<T extends string> = {
  key: "cuisines" | "moods" | "proteins" | "methods" | "seasons";
  label: string;
  order: T[];
  labels: Record<T, string>;
  emoji: Record<T, string>;
};

export const TAG_DIMENSIONS = [
  { key: "cuisines", label: "Cuisine", order: CUISINE_ORDER, labels: CUISINE_LABELS, emoji: CUISINE_EMOJI },
  { key: "moods", label: "Mood", order: MOOD_ORDER, labels: MOOD_LABELS, emoji: MOOD_EMOJI },
  { key: "proteins", label: "Protein", order: PROTEIN_ORDER, labels: PROTEIN_LABELS, emoji: PROTEIN_EMOJI },
  { key: "methods", label: "Method", order: COOK_METHOD_ORDER, labels: COOK_METHOD_LABELS, emoji: COOK_METHOD_EMOJI },
  { key: "seasons", label: "Season", order: SEASON_ORDER, labels: SEASON_LABELS, emoji: SEASON_EMOJI },
] as const;

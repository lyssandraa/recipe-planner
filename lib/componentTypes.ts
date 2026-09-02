import type { ComponentType } from "@prisma/client";

export const COMPONENT_TYPE_ORDER: ComponentType[] = [
  "MARINADE",
  "SPICE_MIX",
  "DRESSING",
  "SAUCE",
  "PICKLE",
  "STOCK",
  "OTHER",
];

export const COMPONENT_TYPE_LABELS: Record<ComponentType, string> = {
  MARINADE: "Marinade",
  SPICE_MIX: "Spice mix",
  DRESSING: "Dressing",
  SAUCE: "Sauce",
  PICKLE: "Pickle",
  STOCK: "Stock",
  OTHER: "Other",
};

export const COMPONENT_TYPE_EMOJI: Record<ComponentType, string> = {
  MARINADE: "🫙",
  SPICE_MIX: "🧂",
  DRESSING: "🍶",
  SAUCE: "🥫",
  PICKLE: "🥒",
  STOCK: "🍲",
  OTHER: "🍽️",
};

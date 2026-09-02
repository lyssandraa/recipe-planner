// Deterministic pick from a small palette so a given id (a recipe, a
// product) always gets the same colour block when it has no image.
// A simple string hash, not cryptographic, just stable.
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

const CARD_COLORS = ["bg-terracotta", "bg-amber", "bg-lime", "bg-green-deep"] as const;

export function getCardColorClass(id: string): string {
  return CARD_COLORS[hashString(id) % CARD_COLORS.length];
}

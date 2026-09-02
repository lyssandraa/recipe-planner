// Shape of a full data export/import. Every reference between entities is
// by a stable, human-meaningful key (ingredient name, recipe title,
// product barcode), never a database id, so a restore into a brand new
// database (different ids for everything) still wires itself back together
// correctly. Bump BACKUP_VERSION on any breaking shape change and branch
// on it in the importer rather than assuming the newest shape.
export const BACKUP_VERSION = 1;

export type BackupIngredient = {
  name: string;
  plural: string | null;
  isStaple: boolean;
  category: string;
  storageAdvice: string | null;
  sortOrder: number;
  isHighFibre: boolean;
  isWholegrain: boolean;
  isLegume: boolean;
  isLeafyGreen: boolean;
  isOilyFish: boolean;
  synonyms: string[];
  // Names of other ingredients this one satisfies, e.g. "Butter" for
  // "Unsalted Butter".
  satisfies: string[];
};

export type BackupIngredientInfo = {
  ingredientName: string;
  functionLabel: string | null;
  plainEnglish: string | null;
  eNumber: string | null;
};

export type BackupRecipeIngredient = {
  ingredientName: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  optional: boolean;
};

export type BackupRecipeComponent = {
  componentRecipeTitle: string;
  note: string | null;
};

export type BackupRecipe = {
  title: string;
  description: string | null;
  servings: number | null;
  // Raw stored instructions JSON string, exported as-is rather than
  // re-parsed, so step shape (timers, ingredient refs) round-trips exactly.
  instructions: string;
  totalTimeMins: number | null;
  activeTimeMins: number | null;
  batchFriendly: boolean;
  leftoverNote: string | null;
  mealType: string;
  componentType: string | null;
  source: string | null;
  imageUrl: string | null;
  ingredients: BackupRecipeIngredient[];
  cuisines: string[];
  moods: string[];
  proteins: string[];
  methods: string[];
  seasons: string[];
  components: BackupRecipeComponent[];
};

export type BackupPantryItem = {
  ingredientName: string;
  stockLevel: string;
  productBarcode: string | null;
};

export type BackupShoppingListItem = {
  name: string;
  quantityText: string | null;
  overrideQuantityText: string | null;
  origin: string;
  checked: boolean;
  ingredientName: string | null;
  sortOrder: number;
};

export type BackupCookLogEntry = {
  recipeTitle: string;
  cookedAt: string;
};

export type BackupProductIngredient = {
  position: number;
  rawText: string;
  ingredientName: string | null;
  eNumber: string | null;
  percentage: number | null;
  functionLabel: string | null;
};

export type BackupProductClaim = {
  claimText: string;
  claimType: string;
  explanation: string | null;
};

export type BackupProductSnapshot = {
  capturedAt: string;
  rawIngredientsText: string | null;
  nutritionPer100g: unknown;
  sourceRevision: string | null;
};

export type BackupProduct = {
  barcode: string;
  name: string;
  brand: string | null;
  rawIngredientsText: string | null;
  ingredientsLanguage: string | null;
  ingredientOrigin: string | null;
  manufacturingPlace: string | null;
  soldIn: string | null;
  originOverride: string | null;
  nutritionPer100g: unknown;
  imageUrl: string | null;
  source: string;
  firstScannedAt: string;
  lastScannedAt: string;
  ingredients: BackupProductIngredient[];
  claims: BackupProductClaim[];
  snapshots: BackupProductSnapshot[];
};

export type BackupFile = {
  version: number;
  exportedAt: string;
  ingredients: BackupIngredient[];
  ingredientInfo: BackupIngredientInfo[];
  recipes: BackupRecipe[];
  pantry: BackupPantryItem[];
  shoppingList: BackupShoppingListItem[];
  cookLog: BackupCookLogEntry[];
  products: BackupProduct[];
};

// Structural check only, not full schema validation, this is a personal
// single-user tool, not a public upload endpoint: is it shaped enough like
// a backup file to be worth attempting an import, so a completely wrong
// file gets rejected before its counts (all zero or garbage) end up in the
// confirmation screen.
export function isBackupFile(data: unknown): data is BackupFile {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.version === "number" &&
    typeof d.exportedAt === "string" &&
    Array.isArray(d.ingredients) &&
    Array.isArray(d.recipes) &&
    Array.isArray(d.pantry) &&
    Array.isArray(d.shoppingList) &&
    Array.isArray(d.cookLog) &&
    Array.isArray(d.products)
  );
}

export type BackupSummary = {
  ingredients: number;
  recipes: number;
  pantry: number;
  shoppingList: number;
  cookLog: number;
  products: number;
  claims: number;
};

export function summarizeBackup(file: BackupFile): BackupSummary {
  return {
    ingredients: file.ingredients.length,
    recipes: file.recipes.length,
    pantry: file.pantry.length,
    shoppingList: file.shoppingList.length,
    cookLog: file.cookLog.length,
    products: file.products.length,
    claims: file.products.reduce((sum, p) => sum + p.claims.length, 0),
  };
}

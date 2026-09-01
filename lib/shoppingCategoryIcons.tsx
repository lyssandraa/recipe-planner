import type { JSX } from "react";
import {
  IconBasket,
  IconBottle,
  IconCarrot,
  IconMeat,
  IconMilk,
  IconPepper,
  IconSnowflake,
  IconWheat,
} from "@tabler/icons-react";
import type { IngredientCategory } from "@prisma/client";

export type ShoppingCategoryIconProps = {
  size?: number;
  stroke?: number;
  className?: string;
};

// Icon per category for the shopping list's group headers. Kept separate
// from lib/categoryIcons.tsx (the pantry's row icons) since "Other" reads
// better here as a basket than a box, and Tabler has no jar icon, a
// bottle is the closest stand-in for tins and jars.
export function renderShoppingCategoryIcon(
  category: IngredientCategory,
  props: ShoppingCategoryIconProps
): JSX.Element {
  switch (category) {
    case "PRODUCE":
      return <IconCarrot {...props} />;
    case "MEAT_FISH":
      return <IconMeat {...props} />;
    case "DAIRY":
      return <IconMilk {...props} />;
    case "DRY_GOODS":
      return <IconWheat {...props} />;
    case "TINS_JARS":
      return <IconBottle {...props} />;
    case "SPICES":
      return <IconPepper {...props} />;
    case "FROZEN":
      return <IconSnowflake {...props} />;
    case "OTHER":
      return <IconBasket {...props} />;
  }
}

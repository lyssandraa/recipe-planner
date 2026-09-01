import type { JSX } from "react";
import {
  IconBottle,
  IconBox,
  IconCarrot,
  IconMeat,
  IconMilk,
  IconPepper,
  IconSnowflake,
  IconWheat,
} from "@tabler/icons-react";
import type { IngredientCategory } from "@prisma/client";

export type CategoryIconProps = {
  size?: number;
  stroke?: number;
  className?: string;
};

// Renders directly, rather than returning the component reference, so
// callers never assign a runtime-picked component to a variable and use it
// as a JSX tag (mirrors the pattern in lib/recipeVisuals.tsx).
export function renderCategoryIcon(
  category: IngredientCategory,
  props: CategoryIconProps
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
      return <IconBox {...props} />;
  }
}

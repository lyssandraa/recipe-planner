"use client";

import { useState } from "react";
import Link from "next/link";
import { IconChefHat, IconClock, IconMinus, IconPlus } from "@tabler/icons-react";
import type { IngredientCategory, Unit } from "@prisma/client";
import { scaleQuantity } from "@/lib/servingScale";
import { formatQuantityUnit } from "@/lib/units";
import { getStaticStorageAdvice } from "@/lib/storageAdvice";
import { formatTimer, getStepIngredientIds, type RecipeStep } from "@/lib/instructions";
import DetailCard from "@/app/components/detail-card";
import StorageAdviceToggle from "@/app/components/storage-advice-toggle";
import CookButton from "./cook-button";

export type StepIngredientData = {
  id: string;
  ingredientId: string;
  quantity: number | null;
  unit: Unit | null;
  note: string | null;
  optional: boolean;
  ingredient: {
    name: string;
    plural: string | null;
    isStaple: boolean;
    storageAdvice: string | null;
    category: IngredientCategory;
  };
};

export default function RecipeServingsAndSteps({
  recipeId,
  originalServings,
  ingredients,
  steps,
  substitutions,
  pantryIngredientIds,
  leftoverNote,
}: {
  recipeId: string;
  originalServings: number | null;
  ingredients: StepIngredientData[];
  steps: RecipeStep[];
  // ingredientId -> the pantry substitute quietly standing in for it, e.g.
  // { "<butter's id>": "unsalted butter" }.
  substitutions: Record<string, string>;
  pantryIngredientIds: string[];
  leftoverNote: string | null;
}) {
  const [servings, setServings] = useState(originalServings ?? 1);
  const canScale = originalServings != null && originalServings > 0;
  const factor = canScale ? servings / originalServings! : 1;

  const ingredientLookup = new Map(ingredients.map((ri) => [ri.ingredientId, ri]));
  const namesForMatching = ingredients.map((ri) => ({
    id: ri.ingredientId,
    name: ri.ingredient.name,
  }));
  const pantrySet = new Set(pantryIngredientIds);

  const mainIngredients = ingredients.filter((ri) => !ri.ingredient.isStaple);
  const staples = ingredients.filter((ri) => ri.ingredient.isStaple);

  // Stagger index only counts cards that actually render, so Method sits
  // right behind Ingredients (80ms) when there's no leftover note.
  let nextDelay = 0;
  const ingredientsDelay = nextDelay++;
  const leftoverDelay = leftoverNote ? nextDelay++ : null;
  const methodDelay = nextDelay++;

  return (
    <>
      <div className="flex gap-2.5">
        <Link
          href={`/recipes/${recipeId}/cook?servings=${servings}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-green-deep px-4 py-3 text-sm font-medium text-white"
        >
          <IconChefHat size={18} stroke={1.75} />
          Cook
        </Link>
        <CookButton recipeId={recipeId} />
      </div>

      <DetailCard
        emoji="🥕"
        title="Ingredients"
        borderClassName="border-lime"
        meta={
          canScale && (
            <div className="flex items-center gap-2 rounded-full bg-cream-grey py-1 pr-1 pl-2">
              <button
                type="button"
                onClick={() => setServings((s) => Math.max(1, s - 1))}
                aria-label="Fewer servings"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-green-deep shadow-sm"
              >
                <IconMinus size={13} stroke={2} />
              </button>
              <span className="w-4 text-center text-sm font-semibold text-ink">
                {servings}
              </span>
              <button
                type="button"
                onClick={() => setServings((s) => s + 1)}
                aria-label="More servings"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-green-deep text-white"
              >
                <IconPlus size={13} stroke={2} />
              </button>
            </div>
          )
        }
        className="motion-safe:animate-fade-up-sm"
        style={{ animationDelay: `${ingredientsDelay * 80}ms` }}
      >
        {canScale && (
          <p className="-mt-2 mb-2 text-[11px] text-ink-soft">original: {originalServings}</p>
        )}

        <ul className="flex flex-col divide-y divide-border-soft">
          {mainIngredients.map((ri) => {
            const scaledQty = canScale ? scaleQuantity(ri.quantity, ri.unit, factor) : ri.quantity;
            const isCountable = ri.unit == null || ri.unit === "piece";
            const displayName =
              isCountable && scaledQty != null && scaledQty !== 1 && ri.ingredient.plural
                ? ri.ingredient.plural
                : ri.ingredient.name;
            const amount = formatQuantityUnit(scaledQty, ri.unit);
            const inPantry = pantrySet.has(ri.ingredientId) || !!substitutions[ri.ingredientId];
            const resolvedAdvice =
              ri.ingredient.storageAdvice ??
              getStaticStorageAdvice(ri.ingredient.name, ri.ingredient.category);

            return (
              <li key={ri.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="w-[66px] shrink-0 text-sm font-semibold text-green-deep">
                  {amount}
                </span>
                <span className="min-w-0 flex-1 text-sm text-ink">
                  {displayName}
                  {ri.note && <span className="ml-1 text-xs text-ink-soft">, {ri.note}</span>}
                  {ri.optional && <span className="ml-1 text-xs text-ink-soft">(optional)</span>}
                  {substitutions[ri.ingredientId] && (
                    <span className="ml-1 text-xs text-ink-soft">
                      (using {substitutions[ri.ingredientId]})
                    </span>
                  )}
                  <StorageAdviceToggle
                    ingredientId={ri.ingredientId}
                    advice={resolvedAdvice}
                    hasCustom={ri.ingredient.storageAdvice != null}
                  />
                </span>
                <span
                  className={`h-[7px] w-[7px] shrink-0 rounded-full ${
                    inPantry ? "bg-lime" : "bg-border-soft"
                  }`}
                />
              </li>
            );
          })}
        </ul>

        {staples.length > 0 && (
          <div className="mt-3 border-t border-border-soft pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-ink-soft">Store cupboard:</span>
              {staples.map((ri) => {
                const scaledQty = canScale
                  ? scaleQuantity(ri.quantity, ri.unit, factor)
                  : ri.quantity;
                const amount = formatQuantityUnit(scaledQty, ri.unit);
                return (
                  <span
                    key={ri.id}
                    className="rounded-full bg-cream-grey px-2 py-0.5 text-xs text-ink"
                  >
                    {amount ? `${amount} ` : ""}
                    {ri.ingredient.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </DetailCard>

      {leftoverNote && (
        <div
          className="motion-safe:animate-fade-up-sm rounded-2xl bg-lime-tint p-4 shadow-sm"
          style={{ animationDelay: `${(leftoverDelay ?? 0) * 80}ms` }}
        >
          <div className="mb-1 flex items-center gap-1.5">
            <span className="text-sm">🍱</span>
            <span className="text-sm font-bold text-green-deep">Leftovers</span>
          </div>
          <p className="text-sm text-green-deep">{leftoverNote}</p>
        </div>
      )}

      <DetailCard
        emoji="👣"
        title="Method"
        borderClassName="border-amber"
        meta={
          <span className="text-xs text-ink-soft">
            {steps.length} step{steps.length === 1 ? "" : "s"}
          </span>
        }
        className="motion-safe:animate-fade-up-sm"
        style={{ animationDelay: `${methodDelay * 80}ms` }}
      >
        <ol className="flex flex-col">
          {steps.map((step, i) => {
            const stepIngredientIds = getStepIngredientIds(step, namesForMatching);
            const stepIngredients = stepIngredientIds
              .map((sid) => ingredientLookup.get(sid))
              .filter((x): x is StepIngredientData => !!x);
            const isLast = i === steps.length - 1;

            return (
              <li key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime-tint text-xs font-semibold text-green-deep">
                    {i + 1}
                  </span>
                  {!isLast && <span className="mt-1 w-[1.5px] flex-1 bg-border-soft" />}
                </div>
                <div className={`min-w-0 flex-1 ${isLast ? "" : "pb-5"}`}>
                  <p className="text-sm leading-[1.5] text-ink">{step.text}</p>
                  {(stepIngredients.length > 0 || step.timerSeconds != null) && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {step.timerSeconds != null && (
                        <span className="flex items-center gap-1 rounded-[6px] bg-amber-tint px-2 py-1 text-xs text-amber-text">
                          <IconClock size={12} stroke={1.75} />
                          {formatTimer(step.timerSeconds)}
                        </span>
                      )}
                      {stepIngredients.map((si) => {
                        const scaledQty = canScale
                          ? scaleQuantity(si.quantity, si.unit, factor)
                          : si.quantity;
                        return (
                          <span
                            key={si.id}
                            className="rounded-[6px] bg-lime-tint px-2 py-1 text-xs text-green-deep"
                          >
                            {formatQuantityUnit(scaledQty, si.unit)} {si.ingredient.name}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </DetailCard>
    </>
  );
}

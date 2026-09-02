import { notFound } from "next/navigation";
import { IconLanguage } from "@tabler/icons-react";
import { prisma } from "@/lib/prisma";
import { languageName } from "@/lib/languages";
import { getNutritionSummary } from "@/lib/nutrition";
import { getStaticStorageAdvice } from "@/lib/storageAdvice";
import { resolveIngredientId } from "@/lib/resolveIngredient";
import { getCardColorClass } from "@/lib/colorBlock";
import DetailHero from "@/app/components/detail-hero";
import StatsStrip, { type StatCell } from "@/app/components/stats-strip";
import DetailCard from "@/app/components/detail-card";
import StorageAdviceToggle from "@/app/components/storage-advice-toggle";
import AddToPantryButton from "./add-to-pantry-button";
import IngredientInfoRow from "./ingredient-info-row";
import CompositionBar from "./composition-bar";
import ClaimsCard from "./claims-card";
import OriginCard from "./origin-card";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      ingredients: {
        orderBy: { position: "asc" },
        include: { ingredient: { include: { info: true } } },
      },
      claims: { orderBy: { claimText: "asc" } },
    },
  });
  if (!product) notFound();

  const nutrition = getNutritionSummary(product.nutritionPer100g);

  const resolvedIngredientId = await resolveIngredientId(product.name);
  const resolvedIngredient = resolvedIngredientId
    ? await prisma.ingredient.findUnique({ where: { id: resolvedIngredientId } })
    : null;
  const resolvedAdvice = resolvedIngredient
    ? (resolvedIngredient.storageAdvice ??
      getStaticStorageAdvice(resolvedIngredient.name, resolvedIngredient.category))
    : null;

  const heroSubtitle = product.brand ?? "";

  const statCells: StatCell[] = nutrition.map((n) => ({ value: n.value, label: n.label }));

  // Purely descriptive, no score or judgement, just a heads-up that some of
  // what's on the pack is marketing language rather than a legal or
  // audited claim.
  const noLegalDefinitionCount = product.claims.filter(
    (c) => c.claimType === "UNREGULATED" || c.claimType === "UNRECOGNISED"
  ).length;
  const claimsMeta =
    product.claims.length === 0
      ? null
      : noLegalDefinitionCount > 0
        ? `${product.claims.length} claim${product.claims.length === 1 ? "" : "s"}, ${noLegalDefinitionCount} with no legal definition`
        : `${product.claims.length} claim${product.claims.length === 1 ? "" : "s"}`;

  const showStorage = !!(resolvedIngredient && resolvedAdvice);
  let nextDelay = 0;
  const storageDelay = showStorage ? nextDelay++ : null;
  const originDelay = nextDelay++;
  const compositionDelay = nextDelay++;
  const ingredientsDelay = nextDelay++;
  const claimsDelay = nextDelay++;

  return (
    <div>
      <DetailHero
        imageUrl={product.imageUrl}
        colorBlockClass={getCardColorClass(product.id)}
        emoji="🛒"
        accentClassName="bg-terracotta"
        title={product.name}
        subtitle={heroSubtitle || null}
        backFallbackHref="/scan"
      />

      <StatsStrip cells={statCells} />

      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-cream-grey px-2 py-1 text-xs text-cream-grey-text">
            {product.source === "OPEN_FOOD_FACTS" ? "Open Food Facts" : "Added manually"}
          </span>
        </div>

        {product.ingredientsLanguage && (
          <p className="flex items-center gap-2 rounded-lg bg-amber-tint p-3 text-sm text-amber-text">
            <IconLanguage size={16} stroke={1.75} className="shrink-0" />
            This label&apos;s ingredient text is in {languageName(product.ingredientsLanguage)},
            not English, so matching against your ingredient catalog will likely miss.
          </p>
        )}

        {showStorage && (
          <DetailCard
            emoji="🧊"
            title="Storage"
            borderClassName="border-teal-tint"
            meta={
              <StorageAdviceToggle
                ingredientId={resolvedIngredient!.id}
                advice={resolvedAdvice}
                hasCustom={resolvedIngredient!.storageAdvice != null}
              />
            }
            className="motion-safe:animate-fade-up-sm"
            style={{ animationDelay: `${(storageDelay ?? 0) * 80}ms` }}
          />
        )}

        <OriginCard
          productId={product.id}
          barcode={product.barcode}
          ingredientOrigin={product.ingredientOrigin}
          manufacturingPlace={product.manufacturingPlace}
          soldIn={product.soldIn}
          originOverride={product.originOverride}
          className="motion-safe:animate-fade-up-sm"
          style={{ animationDelay: `${originDelay * 80}ms` }}
        />

        <DetailCard
          emoji="🥧"
          title="Composition"
          borderClassName="border-amber"
          className="motion-safe:animate-fade-up-sm"
          style={{ animationDelay: `${compositionDelay * 80}ms` }}
        >
          <CompositionBar
            ingredients={product.ingredients.map((pi) => ({
              name: pi.ingredient?.name ?? pi.rawText,
              percentage: pi.percentage,
            }))}
          />
        </DetailCard>

        <DetailCard
          emoji="📋"
          title="Ingredients"
          borderClassName="border-terracotta"
          meta={
            <span className="text-xs text-ink-soft">
              {product.ingredients.length} item{product.ingredients.length === 1 ? "" : "s"}
            </span>
          }
          className="motion-safe:animate-fade-up-sm"
          style={{ animationDelay: `${ingredientsDelay * 80}ms` }}
        >
          {product.ingredients.length === 0 ? (
            <p className="text-sm text-ink-soft">No ingredients list recorded.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border-soft">
              {(() => {
                let displayPosition = 0;
                return product.ingredients.map((pi) => {
                  const isFunctionOnly =
                    pi.functionLabel != null && pi.rawText === pi.functionLabel;
                  if (!isFunctionOnly) displayPosition += 1;
                  return (
                    <IngredientInfoRow
                      key={pi.id}
                      position={displayPosition}
                      rawText={pi.rawText}
                      percentage={pi.percentage}
                      eNumber={pi.eNumber}
                      parsedFunctionLabel={pi.functionLabel}
                      ingredientId={pi.ingredientId}
                      ingredientName={pi.ingredient?.name ?? null}
                      info={pi.ingredient?.info ?? null}
                    />
                  );
                });
              })()}
            </ul>
          )}
        </DetailCard>

        <DetailCard
          emoji="🏅"
          title="Front of pack claims"
          borderClassName="border-lime"
          meta={claimsMeta && <span className="text-xs text-ink-soft">{claimsMeta}</span>}
          className="motion-safe:animate-fade-up-sm"
          style={{ animationDelay: `${claimsDelay * 80}ms` }}
        >
          <ClaimsCard productId={product.id} claims={product.claims} />
        </DetailCard>

        <AddToPantryButton productId={product.id} productName={product.name} />
      </div>
    </div>
  );
}

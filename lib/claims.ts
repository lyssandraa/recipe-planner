export type ClaimType = "CERTIFIED" | "REGULATED" | "UNREGULATED";

export type ClaimDefinition = {
  // Lowercase substring to match against labels_tags (with the "xx:" prefix
  // and dashes stripped) and the product name.
  term: string;
  label: string;
  claimType: ClaimType;
  explanation: string;
};

// UK-relevant set. Easy to extend: add an entry, it's picked up by
// matchClaims and the product page's claim picker automatically. No
// scoring here, just what a term actually means, or doesn't.
export const KNOWN_CLAIMS: ClaimDefinition[] = [
  // CERTIFIED: audited by a named third-party body against a published standard.
  {
    term: "fairtrade",
    label: "Fairtrade",
    claimType: "CERTIFIED",
    explanation: "Audited by the Fairtrade Foundation against their trading and production standards.",
  },
  {
    term: "rainforest alliance",
    label: "Rainforest Alliance",
    claimType: "CERTIFIED",
    explanation: "Audited by the Rainforest Alliance against their sustainable agriculture standard.",
  },
  {
    term: "soil association organic",
    label: "Soil Association Organic",
    claimType: "CERTIFIED",
    explanation: "Certified by the Soil Association, the UK's largest organic certification body.",
  },
  {
    term: "rspca assured",
    label: "RSPCA Assured",
    claimType: "CERTIFIED",
    explanation: "Audited by RSPCA Assured against farm animal welfare standards.",
  },
  {
    term: "msc",
    label: "MSC",
    claimType: "CERTIFIED",
    explanation: "Certified by the Marine Stewardship Council as coming from a sustainable fishery.",
  },
  {
    term: "red tractor",
    label: "Red Tractor",
    claimType: "CERTIFIED",
    explanation: "Audited by Red Tractor against UK food safety, animal welfare and environmental standards.",
  },
  {
    term: "vegan society",
    label: "Vegan Society",
    claimType: "CERTIFIED",
    explanation: "Audited by The Vegan Society against their trademark standard, covering the whole supply chain, not just the final ingredients list.",
  },
  {
    term: "vegetarian society",
    label: "Vegetarian Society Approved",
    claimType: "CERTIFIED",
    explanation: "Audited by the Vegetarian Society against their approved trademark standard.",
  },

  // REGULATED: has a legal definition under UK or retained EU law, but
  // nobody independently audits an individual pack against it.
  {
    term: "organic",
    label: "Organic",
    claimType: "REGULATED",
    explanation: "Legally defined under UK organic regulations. Production must be certified by an approved body.",
  },
  {
    term: "free range",
    label: "Free Range",
    claimType: "REGULATED",
    explanation: "Legally defined minimum space and outdoor access requirements under UK law.",
  },
  {
    term: "wholegrain",
    label: "Wholegrain",
    claimType: "REGULATED",
    explanation: "Legally defined composition requirement. The grain must retain bran, germ and endosperm.",
  },
  {
    term: "pdo",
    label: "PDO",
    claimType: "REGULATED",
    explanation: "Protected Designation of Origin, a legally protected geographic and production standard.",
  },
  {
    term: "pgi",
    label: "PGI",
    claimType: "REGULATED",
    explanation: "Protected Geographical Indication, a legally protected geographic standard.",
  },
  {
    term: "reduced fat",
    label: "Reduced Fat",
    claimType: "REGULATED",
    explanation: "Legally requires at least 30% less fat than a standard comparable product.",
  },
  {
    term: "source of fibre",
    label: "Source of Fibre",
    claimType: "REGULATED",
    explanation: "Legally requires at least 3g of fibre per 100g under UK nutrition claim rules.",
  },
  {
    term: "no added sugar",
    label: "No Added Sugar",
    claimType: "REGULATED",
    explanation: "Legally means no sugars or sugar-containing ingredients were added during production. The product can still contain sugars naturally present in it, so this is not the same claim as \"sugar free\".",
  },
  {
    term: "sugar free",
    label: "Sugar Free",
    claimType: "REGULATED",
    explanation: "Legally requires no more than 0.5g of sugar per 100g or 100ml, a stricter bar than \"no added sugar\", which only concerns what was added.",
  },
  {
    term: "low fat",
    label: "Low Fat",
    claimType: "REGULATED",
    explanation: "Legally requires no more than 3g of fat per 100g for solids, or 1.5g per 100ml for liquids.",
  },
  {
    term: "low sugar",
    label: "Low Sugar",
    claimType: "REGULATED",
    explanation: "Legally requires no more than 5g of sugar per 100g for solids, or 2.5g per 100ml for liquids.",
  },
  {
    term: "low salt",
    label: "Low Salt",
    claimType: "REGULATED",
    explanation: "Legally requires no more than 0.3g of sodium per 100g, equivalent to about 0.75g of salt.",
  },
  {
    term: "high in fibre",
    label: "High in Fibre",
    claimType: "REGULATED",
    explanation: "Legally requires at least 6g of fibre per 100g, double the bar for \"source of fibre\".",
  },
  {
    term: "high protein",
    label: "High Protein",
    claimType: "REGULATED",
    explanation: "Legally requires at least 20% of the product's energy to come from protein.",
  },
  {
    term: "gluten free",
    label: "Gluten Free",
    claimType: "REGULATED",
    explanation: "Legally requires no more than 20 parts per million of gluten, the threshold generally considered safe for coeliac disease.",
  },

  // UNREGULATED: no legal definition, no auditing body, marketing text only.
  {
    term: "natural",
    label: "Natural",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. Highly processed products can carry this term as long as no artificial additives were used.",
  },
  {
    term: "artisan",
    label: "Artisan",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. Says nothing about scale, it appears on factory-made products as often as genuinely small-batch ones.",
  },
  {
    term: "wholesome",
    label: "Wholesome",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. A feel-good word with no bearing on nutritional content.",
  },
  {
    term: "farm fresh",
    label: "Farm Fresh",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. The product doesn't have to come from a named farm, or even be recently made.",
  },
  {
    term: "premium",
    label: "Premium",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. Signals pricing and positioning, not ingredient quality or sourcing.",
  },
  {
    term: "clean",
    label: "Clean",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. Says nothing about what is or isn't in the product.",
  },
  {
    term: "superfood",
    label: "Superfood",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. Not recognised by any nutrition authority, and EU rules actually restrict using it without separately substantiating a specific health claim.",
  },
  {
    term: "no nasties",
    label: "No Nasties",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. Doesn't say which ingredients were excluded or why they'd be considered a \"nasty\" in the first place.",
  },
  {
    term: "real",
    label: "Real",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. Implies authenticity without specifying what would make the product \"unreal\".",
  },
  {
    term: "goodness",
    label: "Goodness",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. Vague enough to sit on virtually any product regardless of what's actually in it.",
  },
  {
    term: "farmhouse",
    label: "Farmhouse",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. Describes a style of product, not an actual place or method of production.",
  },
  {
    term: "traditional",
    label: "Traditional",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. Doesn't require the recipe or process to match any specific historical version.",
  },
  {
    term: "authentic",
    label: "Authentic",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. A claim about feel rather than a verifiable fact about origin or method.",
  },
  {
    term: "handcrafted",
    label: "Handcrafted",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. Most \"handcrafted\" food is still made on production lines with mechanical assistance somewhere in the process.",
  },
  {
    term: "pure",
    label: "Pure",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. Doesn't mean single-ingredient or unprocessed, it appears freely alongside long ingredient lists.",
  },
  {
    term: "simple",
    label: "Simple",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. Describes the marketing, not necessarily the length of the ingredients list.",
  },
  {
    term: "honest",
    label: "Honest",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. Sets a tone rather than making a claim that can be checked against anything.",
  },
  {
    term: "nothing artificial",
    label: "Nothing Artificial",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. There's no fixed legal list of which additives count as \"artificial\", so this is the manufacturer's own judgement call.",
  },
  {
    term: "lightly",
    label: "Lightly",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. Common on \"lightly salted\" or \"lightly sweetened\" products, it gives no actual quantity, unlike the legally defined \"low\" claims.",
  },
  {
    term: "freshly",
    label: "Freshly",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. \"Freshly baked\" or \"freshly prepared\" doesn't say how long ago, or whether the product was frozen afterwards.",
  },
];

export type MatchedClaim = {
  claimText: string;
  claimType: ClaimType;
  explanation: string;
};

// Matches known claim terms against a product's labels_tags (Open Food
// Facts style "en:fairtrade" tags) and its name. Each definition matches at
// most once even if it appears in both places.
export function matchClaims(input: { labelsTags: string[]; name: string }): MatchedClaim[] {
  const haystacks = [
    ...input.labelsTags.map((t) => t.replace(/^[a-z]{2}:/, "").replace(/-/g, " ")),
    input.name,
  ].map((s) => s.toLowerCase());

  const matched: MatchedClaim[] = [];
  for (const def of KNOWN_CLAIMS) {
    if (haystacks.some((h) => h.includes(def.term))) {
      matched.push({
        claimText: def.label,
        claimType: def.claimType,
        explanation: def.explanation,
      });
    }
  }
  return matched;
}

// Substring match in either direction, case-insensitive, so typing "nat"
// finds "Natural" (query inside the term) and typing "all natural finish"
// also finds it (term inside the query, the way a claim might actually be
// worded on a pack). Used by the product page's claim picker to search and
// to auto-detect a match from free-typed text.
export function findClaimMatches(query: string): ClaimDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return KNOWN_CLAIMS;
  return KNOWN_CLAIMS.filter(
    (def) => def.term.includes(q) || q.includes(def.term) || def.label.toLowerCase().includes(q)
  );
}

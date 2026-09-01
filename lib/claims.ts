export type ClaimType = "CERTIFIED" | "REGULATED" | "UNREGULATED";

export type ClaimDefinition = {
  // Lowercase substring to match against labels_tags (with the "xx:" prefix
  // and dashes stripped) and the product name.
  term: string;
  label: string;
  claimType: ClaimType;
  explanation: string;
};

// UK-relevant starting set. Easy to extend: add an entry, it's picked up by
// matchClaims automatically. No scoring here, just what a term actually means.
export const KNOWN_CLAIMS: ClaimDefinition[] = [
  // CERTIFIED: audited by a named third-party body.
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

  // UNREGULATED: no legal definition, no auditing body, marketing text only.
  {
    term: "natural",
    label: "Natural",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. This is a marketing term.",
  },
  {
    term: "artisan",
    label: "Artisan",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. This is a marketing term.",
  },
  {
    term: "wholesome",
    label: "Wholesome",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. This is a marketing term.",
  },
  {
    term: "farm fresh",
    label: "Farm Fresh",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. This is a marketing term.",
  },
  {
    term: "premium",
    label: "Premium",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. This is a marketing term.",
  },
  {
    term: "clean",
    label: "Clean",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. This is a marketing term.",
  },
  {
    term: "superfood",
    label: "Superfood",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. This is a marketing term.",
  },
  {
    term: "no nasties",
    label: "No Nasties",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. This is a marketing term.",
  },
  {
    term: "real",
    label: "Real",
    claimType: "UNREGULATED",
    explanation: "No legal definition and no auditing body. This is a marketing term.",
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

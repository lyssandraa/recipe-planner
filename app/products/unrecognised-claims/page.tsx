import Link from "next/link";
import { IconHelpOctagon } from "@tabler/icons-react";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/app/components/page-header";
import EmptyState from "@/app/components/empty-state";

export const dynamic = "force-dynamic";

// A plain list, nothing automated: claims that didn't match lib/claims.ts
// when added, across every product, so it's easy to see what's actually
// worth adding to the static table next.
export default async function UnrecognisedClaimsPage() {
  const claims = await prisma.productClaim.findMany({
    where: { claimType: "UNRECOGNISED" },
    include: { product: { select: { id: true, name: true } } },
    orderBy: { claimText: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Unrecognised claims"
        icon={<IconHelpOctagon size={24} stroke={1.75} />}
        backFallbackHref="/scan"
        accents={["terracotta", "amber"]}
      />
      <div className="p-4">
        {claims.length === 0 ? (
          <EmptyState
            emoji="🏷️"
            message="No unrecognised claims yet."
            hint="Claims you save that don't match the known claims table show up here."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border-soft rounded-2xl border-b-[3px] border-cream-grey bg-card">
            {claims.map((claim) => (
              <li key={claim.id} className="px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-ink">{claim.claimText}</span>
                  <Link
                    href={`/products/${claim.product.id}`}
                    className="shrink-0 text-xs text-green-deep underline"
                  >
                    {claim.product.name}
                  </Link>
                </div>
                {claim.explanation && (
                  <p className="mt-1 text-xs text-ink-soft">{claim.explanation}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

import { IconScan } from "@tabler/icons-react";
import PageHeader from "@/app/components/page-header";
import BarcodeScanner from "./barcode-scanner";

export default function ScanPage() {
  return (
    <div>
      <PageHeader
        title="Scan a product"
        icon={<IconScan size={24} stroke={1.75} />}
        accents={["terracotta", "amber"]}
      />
      <div className="p-4">
        <div className="mb-4 flex flex-col gap-2 rounded-2xl bg-card p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm text-ink">
            <span className="shrink-0 text-base">🌍</span>
            Looks up the barcode against Open Food Facts.
          </p>
          <p className="flex items-center gap-2 text-sm text-ink">
            <span className="shrink-0 text-base">📋</span>
            Shows the ingredients, origin and nutrition for the product.
          </p>
          <p className="flex items-center gap-2 text-sm text-ink">
            <span className="shrink-0 text-base">🧺</span>
            Lets you add it straight to your pantry.
          </p>
        </div>
        <BarcodeScanner />
      </div>
    </div>
  );
}

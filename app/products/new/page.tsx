import { IconBarcode } from "@tabler/icons-react";
import PageHeader from "@/app/components/page-header";
import ManualProductForm from "./manual-product-form";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ barcode?: string }>;
}) {
  const { barcode } = await searchParams;

  return (
    <div>
      <PageHeader
        title="Add product"
        icon={<IconBarcode size={24} stroke={1.75} />}
        backFallbackHref="/scan"
      />
      <div className="p-4">
        <p className="mb-4 text-sm text-text-muted">
          {barcode
            ? "Couldn't find that barcode on Open Food Facts, enter the details by hand."
            : "Enter the product details by hand."}
        </p>
        <ManualProductForm barcode={barcode ?? ""} />
      </div>
    </div>
  );
}

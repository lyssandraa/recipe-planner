import { IconReceipt } from "@tabler/icons-react";
import PageHeader from "@/app/components/page-header";
import { getMonthStart, parseMonthParam, formatMonthParam } from "@/lib/month";
import { getShoppingTripsForMonth, getShoppingListCostEstimate } from "../actions";
import TrackerView from "./tracker-view";

export const dynamic = "force-dynamic";
// Sets the timeout for every Server Action used on this page, including
// parseReceiptImage. A cold Tesseract worker (downloading the OCR engine
// and language model from CDN, then actually recognising the image) can
// easily exceed a platform's default ~10s function timeout, especially on
// the first request after a deploy or idle period.
export const maxDuration = 60;

export default async function ShoppingTrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const monthStart = month ? parseMonthParam(month) : getMonthStart();
  const [summary, listEstimate] = await Promise.all([
    getShoppingTripsForMonth(monthStart),
    getShoppingListCostEstimate(),
  ]);

  return (
    <div>
      <PageHeader
        title="Shopping tracker"
        icon={<IconReceipt size={24} stroke={1.75} />}
        backFallbackHref="/shopping-list"
        accents={["amber", "lime"]}
      />
      <div className="p-4">
        <TrackerView
          monthParam={formatMonthParam(monthStart)}
          summary={summary}
          listEstimate={listEstimate}
        />
      </div>
    </div>
  );
}

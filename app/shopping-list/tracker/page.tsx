import { IconReceipt } from "@tabler/icons-react";
import PageHeader from "@/app/components/page-header";
import { getMonthStart, parseMonthParam, formatMonthParam } from "@/lib/month";
import { getShoppingTripsForMonth } from "../actions";
import TrackerView from "./tracker-view";

export const dynamic = "force-dynamic";

export default async function ShoppingTrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const monthStart = month ? parseMonthParam(month) : getMonthStart();
  const summary = await getShoppingTripsForMonth(monthStart);

  return (
    <div>
      <PageHeader
        title="Shopping tracker"
        icon={<IconReceipt size={24} stroke={1.75} />}
        backFallbackHref="/shopping-list"
        accents={["amber", "lime"]}
      />
      <div className="p-4">
        <TrackerView monthParam={formatMonthParam(monthStart)} summary={summary} />
      </div>
    </div>
  );
}

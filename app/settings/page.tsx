import { IconSettings } from "@tabler/icons-react";
import PageHeader from "@/app/components/page-header";
import SettingsView from "./settings-view";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        icon={<IconSettings size={24} stroke={1.75} />}
        backFallbackHref="/"
        accents={["lime", "terracotta"]}
      />
      <div className="p-4">
        <SettingsView />
      </div>
    </div>
  );
}

import { getWebsiteSettings } from "@/lib/data/settings";
import { SettingsManager } from "@/components/admin/settings-manager";

export default async function AdminSettingsPage() {
  const settings = await getWebsiteSettings();

  return (
    <div>
      <h1 className="mb-7 text-2xl font-bold">Settings</h1>
      <SettingsManager initialSettings={settings} />
    </div>
  );
}

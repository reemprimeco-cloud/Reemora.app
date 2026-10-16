import type { Metadata } from "next";
import { getWebsiteSettings } from "@/lib/data/settings";
import { SettingsManager } from "@/components/admin/settings-manager";
import { PushNotificationsToggle } from "@/components/admin/push-notifications-toggle";
import { InstallAdminApp } from "@/components/admin/install-admin-app";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const settings = await getWebsiteSettings();

  return (
    <div>
      <h1 className="mb-7 text-2xl font-bold">Settings</h1>
      <div className="mb-6 rounded-2xl border border-border-c bg-surface p-7">
        <h2 className="mb-1.5 font-bold">Reemora Admin on your phone</h2>
        <p className="mb-4 text-sm text-ink-soft">
          Add the admin panel to your home screen as its own app. It opens straight into the dashboard and is what lets your phone receive admin alerts.
        </p>
        <InstallAdminApp />
      </div>
      <div className="mb-6 rounded-2xl border border-border-c bg-surface p-7">
        <h2 className="mb-1.5 font-bold">Push Notifications</h2>
        <p className="mb-4 text-sm text-ink-soft">
          Get notified on this device the moment someone registers or pays for a course, applies to the Lounge, or reports content — even when the app isn&apos;t open.
        </p>
        <PushNotificationsToggle />
      </div>
      <SettingsManager initialSettings={settings} />
    </div>
  );
}

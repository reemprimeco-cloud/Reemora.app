"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import type { WebsiteSettings } from "@/lib/types";

export function SettingsManager({ initialSettings }: { initialSettings: WebsiteSettings }) {
  const [settings, setSettings] = React.useState(initialSettings);
  const [saving, setSaving] = React.useState(false);
  const [alert, setAlert] = React.useState<{ type: "error" | "success"; message: string } | null>(null);

  const [newPassword, setNewPassword] = React.useState("");
  const [pwSaving, setPwSaving] = React.useState(false);
  const [pwAlert, setPwAlert] = React.useState<{ type: "error" | "success"; message: string } | null>(null);

  function update<K extends keyof WebsiteSettings>(key: K, value: WebsiteSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAlert(null);
    const supabase = createClient();

    const rows = Object.entries(settings).map(([key, value]) => ({ key, value }));
    const { error } = await supabase.from("website_settings").upsert(rows, { onConflict: "key" });

    setSaving(false);
    setAlert(error ? { type: "error", message: error.message } : { type: "success", message: "Settings saved." });
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPwAlert({ type: "error", message: "Password must be at least 6 characters." });
      return;
    }
    setPwSaving(true);
    setPwAlert(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwSaving(false);
    setPwAlert(error ? { type: "error", message: error.message } : { type: "success", message: "Password updated." });
    if (!error) setNewPassword("");
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-border-c bg-surface p-7">
        <h3 className="mb-5 font-bold">Site Settings</h3>
        {alert && (
          <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${alert.type === "error" ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300" : "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"}`}>
            {alert.message}
          </div>
        )}
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Site Name" value={settings.site_name} onChange={(v) => update("site_name", v)} />
          <Field label="Tagline" value={settings.tagline} onChange={(v) => update("tagline", v)} />
          <Field label="Contact Email" value={settings.contact_email} onChange={(v) => update("contact_email", v)} type="email" />
          <Field label="Contact Phone" value={settings.contact_phone} onChange={(v) => update("contact_phone", v)} />
          <Field label="Address" value={settings.address} onChange={(v) => update("address", v)} />
          <Field label="CV URL" value={settings.cv_url} onChange={(v) => update("cv_url", v)} />
          <Field label="LinkedIn URL" value={settings.social_links.linkedin ?? ""} onChange={(v) => update("social_links", { ...settings.social_links, linkedin: v })} />
          <Field label="Instagram URL" value={settings.social_links.instagram ?? ""} onChange={(v) => update("social_links", { ...settings.social_links, instagram: v })} />
          <Field label="X / Twitter URL" value={settings.social_links.twitter ?? ""} onChange={(v) => update("social_links", { ...settings.social_links, twitter: v })} />
          <button type="submit" disabled={saving} className="w-full rounded-full border-2 border-transparent bg-blue-500 py-3.5 text-[15px] font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-border-c bg-surface p-7">
        <h3 className="mb-5 font-bold">Change Admin Password</h3>
        {pwAlert && (
          <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${pwAlert.type === "error" ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300" : "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"}`}>
            {pwAlert.message}
          </div>
        )}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13.5px] font-semibold">New Password</label>
            <input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} />
          </div>
          <button type="submit" disabled={pwSaving} className="w-full rounded-full border-2 border-transparent bg-navy-800 py-3.5 text-[15px] font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60">
            {pwSaving ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-border-c bg-surface-alt px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-surface";

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[13.5px] font-semibold">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </div>
  );
}

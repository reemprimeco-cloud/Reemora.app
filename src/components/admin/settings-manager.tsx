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
        <h2 className="mb-5 font-bold">Site Settings</h2>
        {alert && (
          <div role="alert" className={`mb-4 rounded-lg border px-4 py-3 text-sm ${alert.type === "error" ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300" : "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"}`}>
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

          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
            <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">Payment Method</p>
            <div className="space-y-2.5">
              <label className="flex items-start gap-2.5 text-sm">
                <input
                  type="radio"
                  name="payment_mode"
                  className="mt-0.5"
                  checked={settings.payment_mode === "myfatoorah"}
                  onChange={() => update("payment_mode", "myfatoorah")}
                />
                <span>
                  <strong>MyFatoorah checkout</strong> — students pay online by card immediately after registering.
                </span>
              </label>
              <label className="flex items-start gap-2.5 text-sm">
                <input
                  type="radio"
                  name="payment_mode"
                  className="mt-0.5"
                  checked={settings.payment_mode === "whatsapp_manual"}
                  onChange={() => update("payment_mode", "whatsapp_manual")}
                />
                <span>
                  <strong>WhatsApp (manual)</strong> — after registering, students are redirected to WhatsApp with their order total pre-filled. You send the payment link yourself.
                </span>
              </label>
            </div>
            {settings.payment_mode === "whatsapp_manual" && (
              <div className="mt-3">
                <Field
                  label="Payment WhatsApp Number (optional — defaults to Contact Phone)"
                  value={settings.payment_whatsapp_number}
                  onChange={(v) => update("payment_whatsapp_number", v)}
                />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border-c bg-surface-alt p-4">
            <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-blue-600">Homepage Stats</p>
            <div className="space-y-4">
              <Field label="Courses Live (e.g. 4+)" value={settings.stat_courses_count} onChange={(v) => update("stat_courses_count", v)} />
              <Field label="Students Trained (e.g. 500+)" value={settings.stat_students_count} onChange={(v) => update("stat_students_count", v)} />
              <Field label="Satisfaction Rate (e.g. 98%)" value={settings.stat_satisfaction_rate} onChange={(v) => update("stat_satisfaction_rate", v)} />
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              Shown in the hero banner and the stats strip on the homepage. Years of experience comes from the trainer profile instead — edit it on the Trainer &amp; Certificates page.
            </p>
          </div>
          <Field label="LinkedIn URL" value={settings.social_links.linkedin ?? ""} onChange={(v) => update("social_links", { ...settings.social_links, linkedin: v })} />
          <Field label="Instagram URL" value={settings.social_links.instagram ?? ""} onChange={(v) => update("social_links", { ...settings.social_links, instagram: v })} />
          <Field label="X / Twitter URL" value={settings.social_links.twitter ?? ""} onChange={(v) => update("social_links", { ...settings.social_links, twitter: v })} />
          <button type="submit" disabled={saving} className="w-full rounded-full border-2 border-transparent bg-blue-500 py-3.5 text-[15px] font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-border-c bg-surface p-7">
        <h2 className="mb-5 font-bold">Change Admin Password</h2>
        {pwAlert && (
          <div role="alert" className={`mb-4 rounded-lg border px-4 py-3 text-sm ${pwAlert.type === "error" ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300" : "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"}`}>
            {pwAlert.message}
          </div>
        )}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-[13.5px] font-semibold">New Password</label>
            <input id="new-password" type="password" required minLength={6} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} />
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
  const id = React.useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13.5px] font-semibold">{label}</label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </div>
  );
}

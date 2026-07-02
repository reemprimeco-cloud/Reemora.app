"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function ContactForm() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [alert, setAlert] = React.useState<{ type: "error" | "success"; message: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlert(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlert({ type: "error", message: data.error || "Something went wrong. Please try again." });
        return;
      }
      setAlert({ type: "success", message: "Thanks — your message has been sent. We'll get back to you soon." });
      setName("");
      setEmail("");
      setPhone("");
      setSubject("");
      setMessage("");
    } catch {
      setAlert({ type: "error", message: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-[22px] border border-border-c bg-surface p-7 sm:p-10">
      {alert && (
        <div
          className={cn(
            "mb-5 rounded-xl border px-4.5 py-3.5 text-sm",
            alert.type === "error"
              ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
              : "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
          )}
        >
          {alert.message}
        </div>
      )}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[13.5px] font-semibold">Full Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Your name" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13.5px] font-semibold">Email Address</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@example.com" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13.5px] font-semibold">Phone <span className="font-normal text-ink-soft">(optional)</span></label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+965 XXXX XXXX" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13.5px] font-semibold">Subject <span className="font-normal text-ink-soft">(optional)</span></label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} placeholder="How can we help?" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-[13.5px] font-semibold">Message</label>
          <textarea required value={message} onChange={(e) => setMessage(e.target.value)} className={cn(inputClass, "min-h-[140px]")} placeholder="Tell us what you need..." />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full border-2 border-transparent bg-blue-500 py-3.5 text-[15px] font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60 sm:w-auto sm:px-10"
          >
            {submitting ? "Sending..." : "Send Message"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-border-c bg-surface-alt px-4 py-3 text-[14.5px] outline-none transition focus:border-blue-400 focus:bg-surface";

"use client";

import * as React from "react";
import { Mail, MailOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ContactMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast-provider";

export function MessageInbox({ initialMessages }: { initialMessages: ContactMessage[] }) {
  const [messages, setMessages] = React.useState(initialMessages);
  const { showToast } = useToast();

  async function toggleRead(m: ContactMessage) {
    const supabase = createClient();
    const { error } = await supabase.from("contact_messages").update({ is_read: !m.is_read }).eq("id", m.id);
    if (error) {
      showToast("error", error.message);
      return;
    }
    setMessages((prev) => prev.map((item) => (item.id === m.id ? { ...item, is_read: !item.is_read } : item)));
  }

  return (
    <div className="space-y-3">
      {messages.length ? (
        messages.map((m) => (
          <div key={m.id} className={cn("rounded-2xl border p-5", m.is_read ? "border-border-c bg-surface" : "border-blue-400 bg-blue-100")}>
            <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold">{m.name} <span className="font-normal text-ink-soft">— {m.email}</span></p>
                {m.subject && <p className="text-sm font-semibold text-blue-600">{m.subject}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-ink-soft">{new Date(m.created_at).toLocaleString()}</span>
                <button onClick={() => toggleRead(m)} aria-label={m.is_read ? `Mark message from ${m.name} as unread` : `Mark message from ${m.name} as read`} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-c bg-surface hover:border-blue-400 hover:text-blue-600" title={m.is_read ? "Mark unread" : "Mark read"}>
                  {m.is_read ? <MailOpen size={14} /> : <Mail size={14} />}
                </button>
              </div>
            </div>
            <p className="text-sm text-ink-soft">{m.message}</p>
            {m.phone && <p className="mt-2 text-xs text-ink-soft">Phone: {m.phone}</p>}
          </div>
        ))
      ) : (
        <p className="text-center text-ink-soft">No messages yet.</p>
      )}
    </div>
  );
}

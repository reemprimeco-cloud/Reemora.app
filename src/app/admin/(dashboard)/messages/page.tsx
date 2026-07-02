import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import type { ContactMessage } from "@/lib/types";
import { MessageInbox } from "@/components/admin/message-inbox";

export const metadata: Metadata = { title: "Contact Messages" };

export default async function AdminMessagesPage() {
  let messages: ContactMessage[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
    messages = data ?? [];
  }

  return (
    <div>
      <h1 className="mb-7 text-2xl font-bold">Contact Messages</h1>
      <MessageInbox initialMessages={messages} />
    </div>
  );
}

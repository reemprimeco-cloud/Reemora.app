import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedPage } from "@/lib/lounge/server";
import { getLang, getDict } from "@/lib/i18n/get-lang";
import { ChatRoom, type ChatMessage } from "@/components/lounge/chat-room";
import { PageHeader } from "@/components/lounge/page-header";

export const metadata: Metadata = { title: "Lounge Chat" };

export default async function ChatPage() {
  const viewer = await requireApprovedPage("/lounge/chat");
  const lang = await getLang();
  const t = getDict(lang).lounge.chat;

  const supabase = await createClient();
  const { data } = await supabase
    .from("lounge_chat_messages")
    .select("id, author_id, body, reply_to_id, is_hidden, created_at, author:lounge_members!lounge_chat_messages_author_id_fkey(user_id, display_name, avatar_url, is_verified, badge_label)")
    .order("created_at", { ascending: false })
    .limit(50);

  const messages = ((data ?? []) as unknown as ChatMessage[]).reverse();
  const mutedUntil = viewer.member?.chat_muted_until;
  const muted = Boolean(mutedUntil && new Date(mutedUntil) > new Date());

  return (
    <div>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <ChatRoom initialMessages={messages} viewerId={viewer.user!.id} muted={muted} />
    </div>
  );
}

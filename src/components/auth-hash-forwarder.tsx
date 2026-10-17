"use client";

import * as React from "react";

/** Safety net for Supabase email links. When Supabase does not recognise
 *  the return address it sends the browser to the project's Site URL (the
 *  homepage) with the session in the URL fragment, where nothing would
 *  read it. This spots such a fragment on any page and hands it to
 *  /auth/finish, which stores the session. Password-recovery links go on
 *  to /reset, which picks the admin or the Lounge reset page. */
export function AuthHashForwarder() {
  React.useEffect(() => {
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw || window.location.pathname.startsWith("/auth/")) return;
    const hash = new URLSearchParams(raw);
    if (!hash.get("access_token") || !hash.get("refresh_token")) return;
    const next = hash.get("type") === "recovery" ? "/reset" : "/lounge";
    window.location.replace(`/auth/finish?next=${encodeURIComponent(next)}#${raw}`);
  }, []);
  return null;
}

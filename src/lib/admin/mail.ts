/** Email hand-off helpers shared by the admin inboxes (Seat Reservations,
 *  Course Inquiries). Nothing here sends mail: every action opens the
 *  admin's own email program with a pre-filled draft, so no email service
 *  or domain setup is needed. */

export interface AnnounceCourse {
  id: string;
  title: string;
  slug: string;
  short_description: string;
}

/** Which program opens when an admin taps an email button. "gmail" uses
 *  Gmail's compose URL (the Gmail app on iPhone/Android, Gmail web on a
 *  desktop); "default" is a plain mailto: handled by whatever the device
 *  has (Apple Mail on iPhone). Remembered per device. */
export type MailClient = "gmail" | "default";
const MAIL_CLIENT_KEY = "admin.mailClient";

export function readMailClient(): MailClient {
  try {
    return window.localStorage.getItem(MAIL_CLIENT_KEY) === "gmail" ? "gmail" : "default";
  } catch {
    return "default";
  }
}

export function storeMailClient(next: MailClient) {
  try {
    window.localStorage.setItem(MAIL_CLIENT_KEY, next);
  } catch {
    /* private mode */
  }
}

export type ComposeOpts = { to: string; bcc?: string[]; subject: string; body: string };

/** Gmail web compose: desktop browsers open Gmail; on Android the Gmail
 *  app claims mail.google.com links. */
export function gmailHref(opts: ComposeOpts): string {
  const params = new URLSearchParams({ view: "cm", fs: "1", to: opts.to, su: opts.subject, body: opts.body });
  if (opts.bcc?.length) params.set("bcc", opts.bcc.join(","));
  return `https://mail.google.com/mail/?${params.toString().replace(/\+/g, "%20")}`;
}

/** The Gmail iOS app's own compose scheme. Safari does not hand
 *  mail.google.com links to the app, so this is the only way to land in a
 *  new Gmail draft on iPhone/iPad. */
export function gmailAppHref(opts: ComposeOpts): string {
  const q = [`to=${encodeURIComponent(opts.to)}`, `subject=${encodeURIComponent(opts.subject)}`, `body=${encodeURIComponent(opts.body)}`];
  if (opts.bcc?.length) q.push(`bcc=${encodeURIComponent(opts.bcc.join(","))}`);
  return `googlegmail://co?${q.join("&")}`;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
}

/** Opens a Gmail compose for the given draft. On iOS it tries the Gmail
 *  app first and falls back to Gmail web if nothing took the hand-off
 *  (the page stayed visible); elsewhere it opens Gmail web in a new tab. */
export function openGmail(opts: ComposeOpts) {
  const web = gmailHref(opts);
  if (!isIos()) {
    window.open(web, "_blank", "noopener");
    return;
  }
  let handedOff = false;
  const onHide = () => {
    handedOff = true;
    document.removeEventListener("visibilitychange", onHide);
  };
  document.addEventListener("visibilitychange", onHide);
  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onHide);
    if (!handedOff && document.visibilityState === "visible") window.location.href = web;
  }, 1800);
  window.location.href = gmailAppHref(opts);
}

export function mailtoHref(email: string, subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body });
  return `mailto:${email}?${params.toString().replace(/\+/g, "%20")}`;
}

/** Bulk-announce version of mailtoHref: recipients go in bcc so they don't
 *  see each other's addresses, with the site's own contact address as "to"
 *  (most webmail, Gmail included, refuses a bcc-only draft with no "to"). */
export function mailtoAllHref(to: string, emails: string[], subject: string, body: string): string {
  const params = new URLSearchParams({ bcc: emails.join(","), subject, body });
  return `mailto:${to}?${params.toString().replace(/\+/g, "%20")}`;
}

export function digitsOnly(phone: string): string {
  return phone.replace(/\D+/g, "");
}

export function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  const first = trimmed.split(/\s+/)[0] ?? trimmed;
  return first || trimmed;
}

/** "Registration is open" announcement for everyone who showed interest in
 *  a course: one email draft (BCC) and a WhatsApp line per person. */
export function buildAnnouncement(course: AnnounceCourse, siteUrl: string) {
  const link = `${siteUrl}/register/${course.slug}`;
  const subject = `🎉 ${course.title} is now open for registration`;
  const emailBody = [
    "Hi there,",
    "",
    `Great news — the course you were interested in, "${course.title}", is now open for registration!`,
    "",
    course.short_description,
    "",
    "Reserve your seat here:",
    link,
    "",
    "See you soon,",
    "Reemora Training",
  ].join("\n");
  const waTemplate = (name: string) =>
    `Hi ${name}, great news! Our course "${course.title}" is now open for registration. Reserve your seat here: ${link}`;
  return { subject, emailBody, waTemplate };
}

/** Personal reply to one person who asked about a course. */
export function buildCourseReply(fullName: string, siteUrl: string, course: AnnounceCourse | null): { subject: string; body: string } {
  const name = firstName(fullName);
  if (course) {
    const link = `${siteUrl}/register/${course.slug}`;
    return {
      subject: `Reemora — ${course.title} is open for registration`,
      body: [
        `Hi ${name},`,
        "",
        `Thanks for asking about "${course.title}" — registration is now open!`,
        "",
        course.short_description,
        "",
        "Register and pay securely here:",
        link,
        "",
        "If you have any questions before registering, just reply to this email.",
        "",
        "See you soon,",
        "Reemora Training",
      ].join("\n"),
    };
  }
  return {
    subject: "Reemora — Your course inquiry",
    body: [
      `Hi ${name},`,
      "",
      "Thanks for reaching out to Reemora — happy to help you pick the right course.",
      "",
      "You can browse everything that is open for registration here:",
      `${siteUrl}/courses`,
      "",
      "Reply to this email if you'd like a personal recommendation and we'll follow up.",
      "",
      "See you soon,",
      "Reemora Training",
    ].join("\n"),
  };
}

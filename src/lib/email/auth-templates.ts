/** Branded, bilingual (English + Arabic) emails for account links: the
 *  Lounge welcome ("set your password") and password reset. Plain inline
 *  styles and tables so they render in Outlook/Hotmail and Gmail alike. */

export type AuthEmailKind = "welcome" | "reset";

function esc(v: string): string {
  return v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const COPY = {
  welcome: {
    subject: "Reemora Lounge — set your password | ريمورا — اختر كلمة المرور",
    en: {
      heading: "Welcome to the Reemora Lounge",
      body: "You've been invited by the Reemora team and your membership is already approved. Tap the button to sign in and choose your password.",
      button: "Set my password",
    },
    ar: {
      heading: "أهلاً بك في مجتمع ريمورا",
      body: "تمت دعوتك من فريق ريمورا وعضويتك معتمدة. اضغط على الزر لتسجيل الدخول واختيار كلمة المرور.",
      button: "اختيار كلمة المرور",
    },
  },
  reset: {
    subject: "Reemora — reset your password | ريمورا — إعادة تعيين كلمة المرور",
    en: {
      heading: "Reset your password",
      body: "We received a request to reset the password for your Reemora account. Tap the button to choose a new one.",
      button: "Reset password",
    },
    ar: {
      heading: "إعادة تعيين كلمة المرور",
      body: "وصلنا طلب لإعادة تعيين كلمة المرور لحسابك في ريمورا. اضغط على الزر لاختيار كلمة مرور جديدة.",
      button: "إعادة تعيين كلمة المرور",
    },
  },
} as const;

const FOOT_EN = "The link works once. If it has expired, request a new one from the sign-in page. If you didn't expect this email, you can ignore it.";
const FOOT_AR = "الرابط يعمل مرة واحدة. إذا انتهت صلاحيته، اطلب رابطاً جديداً من صفحة تسجيل الدخول. إذا لم تتوقع هذه الرسالة، يمكنك تجاهلها.";

function button(link: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 6px"><tr><td style="border-radius:999px;background:#2563eb"><a href="${esc(link)}" style="display:inline-block;padding:13px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px">${esc(label)}</a></td></tr></table>`;
}

export function buildAuthEmail(kind: AuthEmailKind, opts: { link: string; name?: string | null; siteUrl: string }) {
  const c = COPY[kind];
  const first = (opts.name ?? "").trim().split(/\s+/)[0] ?? "";
  const hiEn = first ? `Hi ${esc(first)},` : "Hi,";
  const hiAr = first ? `مرحباً ${esc(first)}،` : "مرحباً،";
  const logo = `${opts.siteUrl}/images/logo.png`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.en.heading)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td style="height:6px;background:#2563eb;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:24px 28px 4px"><img src="${esc(logo)}" alt="Reemora" height="30" style="display:block;height:30px;border:0"></td></tr>
<tr><td style="padding:28px 28px 8px;font-family:Arial,Helvetica,sans-serif;color:#0f172a" dir="ltr" align="left">
<h1 style="margin:0 0 14px;font-size:21px;line-height:1.3">${esc(c.en.heading)}</h1>
<p style="margin:0 0 6px;font-size:15px;line-height:1.6">${hiEn}</p>
<p style="margin:0;font-size:15px;line-height:1.6;color:#334155">${esc(c.en.body)}</p>
${button(opts.link, c.en.button)}
</td></tr>
<tr><td style="padding:0 28px"><hr style="border:0;border-top:1px solid #e2e8f0;margin:18px 0"></td></tr>
<tr><td style="padding:0 28px 8px;font-family:Tahoma,Arial,sans-serif;color:#0f172a" dir="rtl" align="right">
<h2 style="margin:0 0 14px;font-size:20px;line-height:1.4">${esc(c.ar.heading)}</h2>
<p style="margin:0 0 6px;font-size:15px;line-height:1.8">${hiAr}</p>
<p style="margin:0;font-size:15px;line-height:1.8;color:#334155">${esc(c.ar.body)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right" style="margin:22px 0 6px"><tr><td style="border-radius:999px;background:#2563eb"><a href="${esc(opts.link)}" style="display:inline-block;padding:13px 30px;font-family:Tahoma,Arial,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px">${esc(c.ar.button)}</a></td></tr></table>
</td></tr>
<tr><td style="padding:22px 28px 26px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#64748b">
<p style="margin:0 0 4px" dir="ltr">${esc(FOOT_EN)}</p>
<p style="margin:0" dir="rtl" align="right">${esc(FOOT_AR)}</p>
<p style="margin:12px 0 0">Reemora · <a href="${esc(opts.siteUrl)}" style="color:#2563eb;text-decoration:none">${esc(opts.siteUrl.replace(/^https?:\/\//, ""))}</a></p>
</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    c.en.heading,
    "",
    first ? `Hi ${first},` : "Hi,",
    c.en.body,
    "",
    `${c.en.button}: ${opts.link}`,
    "",
    FOOT_EN,
    "",
    "———",
    "",
    c.ar.heading,
    "",
    first ? `مرحباً ${first}،` : "مرحباً،",
    c.ar.body,
    "",
    `${c.ar.button}: ${opts.link}`,
    "",
    FOOT_AR,
    "",
    "Reemora",
  ].join("\n");

  return { subject: c.subject, html, text };
}

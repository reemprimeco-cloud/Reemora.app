---
name: Reemora
description: Build Apps with AI — a navy-and-blue studio where founders learn by shipping.
colors:
  midnight-navy: "#0b1730"
  deep-navy: "#0f1e3c"
  slate-navy: "#142a4f"
  signal-blue: "#4f7fbf"
  signal-blue-deep: "#3f6bb0"
  signal-blue-light: "#6f9bd4"
  blue-tint: "#e7effa"
  blue-haze: "#f4f8fd"
  ink: "#182437"
  ink-soft: "#55637a"
  surface: "#ffffff"
  surface-alt: "#f4f8fd"
  hairline: "#e4e9f1"
  night-ground: "#0b1220"
  night-surface: "#101a30"
  night-surface-alt: "#0e1729"
  night-hairline: "#223251"
  night-ink: "#e6ecf7"
  night-ink-soft: "#93a1bd"
typography:
  display:
    fontFamily: "Poppins, Inter, sans-serif"
    fontSize: "clamp(34px, 5vw, 58px)"
    fontWeight: 700
    lineHeight: 1.15
  headline:
    fontFamily: "Poppins, Inter, sans-serif"
    fontSize: "clamp(24px, 3vw, 36px)"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Poppins, Inter, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  lead:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  metric:
    fontFamily: "Poppins, Inter, sans-serif"
    fontSize: "clamp(28px, 3vw, 36px)"
    fontWeight: 700
    lineHeight: 1.1
  label:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    letterSpacing: "0.05em"
  arabic:
    fontFamily: "Tajawal, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.7
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  card: "22px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  section: "64px"
  section-lg: "96px"
components:
  button-primary:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "14px 28px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.deep-navy}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
  button-navy:
    backgroundColor: "{colors.deep-navy}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "14px 28px"
  button-navy-hover:
    backgroundColor: "{colors.signal-blue-deep}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "14px 28px"
  button-ghost-hover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.signal-blue-deep}"
    rounded: "{rounded.pill}"
  button-outline-on-dark:
    backgroundColor: "transparent"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "14px 28px"
  chip-eyebrow:
    backgroundColor: "{colors.blue-tint}"
    textColor: "{colors.signal-blue-deep}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
    typography: "{typography.label}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "22px"
  input:
    backgroundColor: "{colors.surface-alt}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
    typography: "{typography.body}"
---

# Design System: Reemora

## Overview

**Creative North Star: "The Builder's Studio"**

Reemora looks like a well-lit workshop run by someone who ships. Deep navy is the ground the studio stands on: it carries the hero, the footer, the admin frame and every dark-mode surface, and it signals seriousness without coldness. One blue does all the pointing. It is the only colour that asks for a click, so when it appears the eye already knows what to do. Everything else is white, haze-blue panels and hairline borders, which keeps the member's own work (screenshots, projects, chat) as the brightest thing on the page.

The system is tactile and confident. Controls are pills with real weight that lift a few pixels on hover; cards sit flat on the page and rise with a soft shadow only when touched. Density is comfortable rather than tight: sections breathe at 64 to 96 pixels, content maxes out at 1180 pixels, and body copy never drops below 15 pixels. Arabic is a first-class rendering, not a translation layer: the whole page switches to Tajawal with extra line height and mirrors through logical properties.

Inferred rather than user-confirmed: the North Star name, the colour names below, and the "tactile and confident" component stance. All three were read from PRODUCT.md and the shipped code; change any of them here and the rest of the file still holds.

**Key Characteristics:**
- Midnight navy ground, one Signal Blue for action, white and haze panels for content.
- Pill-shaped controls everywhere; 22px radius for cards, 12px for inputs and small panels.
- Flat at rest, lifted on interaction: shadows are a response, never a default.
- Poppins headings, Inter body, Tajawal for Arabic, with RTL handled by logical properties.
- Comfortable rhythm: 1180px container, 64/96px section padding, 44px minimum touch targets.
- Dark mode is a re-skin of the same tokens, not a second design.

## Colors

A two-colour brand (navy ground, blue signal) on a white-and-haze canvas, with semantic greens, ambers and reds used only as status.

### Primary
- **Signal Blue** (`{colors.signal-blue}`, #4f7fbf): the one action colour. Primary buttons, active tab, selected filter, links on hover, the verified badge fill. Darkens to **Signal Blue Deep** (#3f6bb0) for text-on-light links and the eyebrow chip text, and lightens to **Signal Blue Light** (#6f9bd4) for the hero accent word and focus borders.
- **Blue Tint** (#e7effa) and **Blue Haze** (#f4f8fd): the quiet companions. Tint is the eyebrow chip and active-nav background; Haze is the alternating section background and every input's resting fill.

### Secondary
- **Midnight Navy** (#0b1730), **Deep Navy** (#0f1e3c), **Slate Navy** (#142a4f): the ground. Hero and CTA gradients run Midnight → Deep → Signal Blue; the footer and dark-mode page are Midnight; the "navy" button is Deep Navy and hovers to Signal Blue Deep. Navy is never used for body text on light surfaces; that is Ink's job.

### Neutral
- **Ink** (#182437): all body and heading text on light surfaces.
- **Ink Soft** (#55637a): secondary text, meta lines, placeholders, icon-only controls at rest.
- **Surface** (#ffffff) and **Surface Alt** (#f4f8fd): card and page layers; Surface Alt doubles as Blue Haze.
- **Hairline** (#e4e9f1): every border, divider and resting input stroke.
- **Night tokens** (#0b1220 ground, #101a30 surface, #0e1729 surface-alt, #223251 hairline, #e6ecf7 ink, #93a1bd ink-soft): the dark theme swaps these in under the same names; blue-tint becomes #16233d and blue-haze #0f1830.

### Status (not brand)
Green (approved, paid, helpful), amber (pending, needs work, muted), red (rejected, suspended, destructive), purple (milestone, design feedback). Each uses a 100-tint background with a 700 text in light mode and a 950 background with a 300 text in dark mode.

### Named Rules
**The One Signal Rule.** Signal Blue is the only colour that means "act". It never decorates: no blue section backgrounds on light pages, no blue body text, no blue icons at rest.

**The Navy Ground Rule.** Navy is a surface, not a text colour. Dark panels (hero, CTA band, footer, link covers) carry white text and blue accents; light panels carry Ink.

## Typography

**Display Font:** Poppins (with Inter, sans-serif)
**Body Font:** Inter (with Arial, sans-serif)
**Arabic Font:** Tajawal (both headings and body when `lang="ar"`)

**Character:** Geometric, friendly headings over a neutral, highly legible body. Poppins at 700 gives headlines a rounded confidence; Inter keeps forms, feeds and chat quiet. In Arabic the pairing collapses to Tajawal alone, with line height raised to 1.7 so the script breathes.

### Hierarchy
- **Display** (700, clamp 34→46→58px, line-height 1.15): the hero headline only, with one accent word in Signal Blue Light.
- **Headline** (700, 24px → 30px → 36px, line-height 1.2): section titles, always preceded by an eyebrow chip.
- **Title** (700, 17–19px, line-height 1.3): card titles, post titles, profile names.
- **Body** (400, 15px, line-height 1.6): all running text; max measure about 65 characters (`max-w-[520px]` to `[640px]`).
- **Lead** (400, 17px, line-height 1.6): the one paragraph under a section headline and the course description.
- **Metric** (700, 28px → 36px, Poppins): the numbers in the stats band and the floating experience badge; always paired with a 13px Ink Soft label.
- **Label** (700, 11–13px, letter-spacing 0.05em, uppercase for eyebrows): eyebrow chips, legends, tiny status pills.
- **Meta** (400–600, 11.5–13px, Ink Soft): timestamps, counts, hints under inputs.

### Named Rules
**The Eyebrow Rule.** Every section headline on a marketing page is announced by an uppercase label chip (Blue Tint background, Signal Blue Deep text) above it. The chip, not a rule line or icon, is the section marker.

**The 16px Input Rule.** Inputs render at 16px on phones so iOS never zooms the viewport; visual sizes below that are allowed only above 640px.

## Layout

Content lives in a centred container capped at 1180px with 20–24px side gutters. Marketing sections stack with 64px vertical padding (96px from 640px up) and alternate between Surface and Surface Alt backgrounds so the page reads as bands without rule lines. The fixed header is 68px on phones and 78px above; anchors and in-page targets scroll with that offset.

Grids are simple: two columns at phone width for stats, three for course cards from 1024px, a 1.1 / 0.9 split for the hero. The Lounge uses an app frame instead: a 220px sticky sidebar from 768px, a five-tab bottom bar below it, and a 640px reading column for the feed. Admin is a 250px sidebar plus a fluid main column.

Spacing follows an 8px rhythm with half-steps where Tailwind allows (14px, 18px, 22px). Related items sit 8–12px apart, groups 16–24px, sections 40px+. RTL is handled with logical utilities (`ms-`, `pe-`, `text-start`) so Arabic mirrors without a second stylesheet.

## Elevation & Depth

Flat by default, lifted on interaction. Surfaces separate by tone (Surface on Surface Alt, hairline borders) rather than by shadow. Shadows appear in exactly three situations: a primary button carries a faint `shadow-sm` to read as pressable, a card lifts with `shadow-xl` and a 6px translate on hover, and a floating stat badge on the About section sits on `shadow-lg` to show it overlaps the photo. Dark surfaces (hero, CTA band) get depth from blurred, slowly drifting blue orbs behind the content, not from shadows.

### Shadow Vocabulary
- **Pressable** (`box-shadow: 0 1px 2px rgba(0,0,0,0.05)`): primary CTA buttons at rest.
- **Lifted** (`box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)`): course and portfolio cards on hover, paired with `translateY(-6px)`.
- **Floating** (`box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)`): a small overlapping badge or stat card.

### Named Rules
**The Flat-By-Default Rule.** No card, panel or input has a shadow at rest. Depth is earned by hover, focus or overlap.

## Shapes

Two silhouettes carry the system: the pill and the soft rectangle. Every button, chip, filter, badge and avatar is a full pill (9999px). Containers step down by role: 22px for cards and hero-level panels, 16px for Lounge post cards and secondary panels, 12px for inputs, chat bubbles and small callouts, 8px for admin table controls and nav links. Borders are 1px Hairline at rest; buttons use a 2px border so outline and filled variants share one box size. Chat bubbles cut one corner to 6px on the sender's side to show direction. Images are clipped by their container, never given their own radius.

## Components

### Buttons
- **Shape:** full pill, 2px border (transparent on filled variants), 44–52px minimum height on marketing pages, 40px minimum in app UI.
- **Primary:** Signal Blue background, white text, 14px × 28px padding at 15px/600; hover turns Deep Navy and lifts 2px; `shadow-sm` at rest.
- **Navy:** Deep Navy background, white text; hover Signal Blue Deep with the same lift. Used for the header CTA and secondary marketing actions.
- **Ghost:** Surface background, Ink text, Hairline border; hover border and text turn Signal Blue. The default for "back", "details", filters that are not selected.
- **Outline on dark:** transparent with a white 2px border; hover fills white with Deep Navy text. Only on navy panels.
- **Danger:** red-500 fill, used only for irreversible admin actions.
- **Icon-only:** 40px circular hit area, Ink Soft at rest, Surface Alt wash on hover; the pressed state (like, bookmark) fills the icon and recolours it (red for like, blue for save).
- **Active:** `scale(0.98)` on press for primary actions.

### Chips
- **Eyebrow:** Blue Tint background, Signal Blue Deep text, 13px/700 uppercase with 0.05em tracking, 6px × 14px padding. Marks every marketing section.
- **Filter / tab:** pill with Hairline border and Surface background; selected state is Deep Navy fill with white text (Lounge) or Blue Tint with Signal Blue text (admin).
- **Status:** 11px/700 pill in the semantic tint for the state (green approved, amber pending, red suspended, purple milestone).
- **Feedback category:** six fixed chips (like, needs work, suggestion, code, design, tip) each with its own tint and icon; the selected one gains a 2px blue focus ring.

### Cards / Containers
- **Corner Style:** 22px for course, portfolio and hero-level cards; 16px for Lounge post cards and admin panels.
- **Background:** Surface on a Surface Alt band, or Surface Alt inside a Surface card for nested panels (comment bubbles, form fieldsets).
- **Shadow Strategy:** none at rest; Lifted on hover for cards that are links.
- **Border:** 1px Hairline always, so cards hold their edge in dark mode too.
- **Internal Padding:** 20–24px (`p-5` / `p-5.5` / `p-6`); media is full-bleed inside the card and the text block carries the padding.
- **Media-first post card:** author row, full-bleed screenshot or gradient link cover, icon action row, like count, caption. The gradient cover is keyed by project category and carries the host name and title in white.

### Inputs / Fields
- **Style:** Surface Alt fill, 1px Hairline stroke, 12px radius, 14px × 16px padding, 15px text (16px on phones).
- **Focus:** stroke turns Signal Blue Light, fill turns Surface, and a 4px ring at 15% Signal Blue Light appears.
- **Error:** stroke turns red-400 and a 12px red message sits under the field; hints are 12px Ink Soft and give way to the error.
- **Prefixed input:** a fixed grey prefix (`instagram.com/`) sits inside the field so members type only a handle.

### Navigation
- **Site header:** fixed, 68/78px tall, Surface at 95% with backdrop blur once scrolled; links are 15px/600 Ink with a Blue Tint pill for the active route; a Deep Navy pill CTA on the right; the mobile menu is a bordered sheet with 15px rows.
- **Lounge shell:** sidebar links are 14px/600 with an icon, Blue Tint pill when active, unread count in a Signal Blue dot; the phone tab bar is five 56px columns with 20px icons and 10.5px labels, Signal Blue when active.
- **Admin sidebar:** 250px, same pill-active pattern, grouped by area.

### Signature: the Navy band
A full-width gradient panel (Midnight → Deep Navy → Signal Blue, top-left to bottom-right) with two or three blurred blue orbs drifting behind it on a 14-second float. It carries the hero, the final CTA, profile headers and link covers. Text is white, the accent word Signal Blue Light, buttons are Primary or Outline-on-dark. It is the one place the system allows atmosphere.

## Do's and Don'ts

### Do:
- **Do** use Signal Blue for exactly one action per view; everything else is Ghost or Navy.
- **Do** keep every interactive element a pill, 44px tall on marketing pages and 40px in app UI.
- **Do** start marketing sections with an eyebrow chip, then a Headline, then a 17px lead paragraph capped near 65 characters.
- **Do** separate surfaces by tone and a 1px Hairline, and reserve shadows for hover and overlap.
- **Do** write layout with logical properties so Arabic mirrors correctly, and test every surface in both languages and both themes.
- **Do** let member work be the brightest thing on the page: full-bleed screenshots, white cards, muted chrome.

### Don't:
- **Don't** add a blue section background, blue body text or blue icons at rest on light pages.
- **Don't** put a shadow on a card, panel or input at rest.
- **Don't** introduce a third brand colour or a new accent for emphasis; use weight, size and Signal Blue.
- **Don't** mix corner radii inside one component; images take the container's clip, never their own radius.
- **Don't** drop body copy below 15px or inputs below 16px on phones.
- **Don't** use a second display face or decorative type; Poppins and Inter (Tajawal in Arabic) are the full set.

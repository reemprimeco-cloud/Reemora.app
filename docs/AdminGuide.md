# Admin Guide

This guide is for whoever manages the Reemora website day-to-day — no coding knowledge required. It covers everything available at `/admin`.

## Signing in

Go to `https://reemora.app/admin` (or `/admin/login` directly). Sign in with the email and password your developer created for you in Supabase. If you're not signed in, any `/admin` page automatically redirects you to the login screen and brings you back to where you were after signing in.

To sign out, use the **Log Out** button at the bottom of the sidebar.

> Forgot your password? Ask your developer to reset it from the Supabase dashboard (**Authentication → Users**), or add a "forgot password" flow later — it isn't built yet.

## Dashboard

The landing page after login. Shows at a glance:

- **Total Courses** — how many courses exist (published or not)
- **Upcoming Cohorts** — how many course dates are scheduled and open
- **Recent Registrations** and **Seats Booked** — activity from your 5 most recent sign-ups

Below that, a table of the 5 most recent registrations with student name, course, seat count, amount paid, status, and date.

## Courses

**Add Course** to create a new course. You'll set:

- **Course Title** — used to generate the page URL automatically (e.g. "AI App Bootcamp" → `/courses/ai-app-bootcamp`)
- **Category** and **Level** (Beginner / Intermediate / Advanced)
- **Price** and **Currency**
- **Duration (weeks)**
- **Instructor**
- **Published** checkbox — unpublished courses are hidden from the public site and catalog, but still visible to you in this list
- **Short Description** (shown on course cards) and **Full Description** (shown on the course detail page)
- **Curriculum** — one topic per line; each line becomes a numbered item on the course detail page
- **Course Image** — optional upload. If you don't upload one, a branded placeholder graphic is shown automatically — you don't need to provide an image before publishing.

When you create a new course, a placeholder cohort (dates "TBA", 20 seats) is added automatically so the course is immediately registrable — go to **Scheduling** to fill in real dates.

Click the pencil icon to edit a course, or the trash icon to delete it (you'll be asked to confirm — deleting a course also removes its scheduled cohorts and any linked registrations, so use this carefully for a course that already has real sign-ups).

## Categories

Manage the category tags courses are grouped under (e.g. "AI Development", "Prompt Engineering", "No-Code"). Type a name and click **Add Category** — the URL-friendly slug is generated for you. Deleting a category doesn't delete its courses; they just become uncategorized.

## Scheduling

Every course can have multiple **cohorts** (specific run dates), each with its own seat count and status. Use the **+ Add Cohort to Course...** dropdown to add a new cohort to an existing course, or click the calendar icon on an existing row to edit it.

Fields per cohort:

- **Start Date** / **End Date**
- **Session Days** (free text, e.g. "Sun, Tue") and **Session Time** (e.g. "6:00 PM - 9:00 PM")
- **Total Seats**
- **Status** — Upcoming, Ongoing, Completed, or Cancelled. Cancelled and Completed cohorts stop accepting new registrations automatically (the registration page will reject sign-ups for them), so set this instead of deleting a cohort once it's run.

Seats remaining are tracked automatically as people register and pay — you don't edit "seats available" directly; it's derived from total seats minus confirmed registrations.

## Registrations

A read-only table of everyone who has registered for a course: student name, email, phone, course, seat count, amount, payment status, and date. Use this to follow up with students or reconcile payments. This list is not editable from the admin panel by design — registrations and payments are only ever written by the secure payment flow, never edited by hand, to keep the financial record trustworthy.

## Trainer & Certificates

Manages the "About Your Trainer" section on the homepage and the instructor shown on course pages.

- **Trainer Profile**: full name, title, years of experience, and bio.
- **Certificates**: add/remove the credentials shown in the "International Certified Trainer" section. Each certificate has a title, an optional issuing body, and (once uploaded) an image.

If no trainer profile exists yet, save one first — certificates can't be added until there's a profile to attach them to.

## Testimonials

Add student testimonials (name, role/company, quote) shown in the homepage's "What our students say" slider. Use the eye icon to publish/unpublish a testimonial without deleting it, or the trash icon to remove it permanently. If there are zero published testimonials, that entire section is automatically hidden from the homepage rather than showing an empty slider.

## Contact Messages

Your inbox for the public **Contact** page. Unread messages are highlighted. Click the mail icon to toggle a message between read/unread. There's no reply-from-admin feature — reply from your own email client using the sender's address shown on the message.

## Settings

Two independent forms:

**Site Settings** — site name, tagline, contact email/phone/address, CV download URL, and social links (LinkedIn, Instagram, X/Twitter). These feed the footer and homepage automatically — no code changes needed when you update them.

**Change Admin Password** — update your own login password (minimum 6 characters). This only changes the password for the account you're currently signed in as.

## Content to replace before launch

- **Trainer CV**: either upload a real PDF to replace `public/cv/reemora-cv.pdf`, or point the **CV URL** setting (in Settings) at a hosted PDF elsewhere.
- **Certificate images**: uploaded per-certificate from **Trainer & Certificates**.
- **Course images**: uploaded per-course from **Courses** — optional, a placeholder is used until you do.
- **Placeholder phone/address**: update via **Settings** before going live.

## Notifications & confirmations

Every save/create/update/delete action in the admin panel shows a small toast message in the bottom-right corner confirming success or explaining an error — nothing happens silently. Destructive actions (deleting a course, category, testimonial, or certificate) always show a confirmation dialog first, so you can't delete something by mis-click.

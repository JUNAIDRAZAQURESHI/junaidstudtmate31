# AI StudyMate Pro — Premium SaaS Upgrade

Scope is large. I'll ship it in phased commits so each phase is verifiable. Each phase ends with a working preview.

## Phase 1 — Design system polish + Landing/About/Pricing/Contact

- Refresh `src/styles.css`: add particle canvas utility, refined glass tokens, premium typography (Space Grotesk + Inter via `<link>` in `__root`), smoother easings, floating icon keyframes.
- Reusable components: `ParticleField`, `FloatingIcon`, `SectionHeading`, `PricingCard`, `GradientButton`.
- Pages (public):
  - `/` landing — hero with particles, feature grid, tool showcase, testimonials, CTA.
  - `/about` — story, mission, tech stack.
  - `/pricing` — Free / Pro Monthly $1 / Pro Yearly $10 cards with CTA → `/payment`.
  - `/contact` — form (saves to `contact_messages` table) + brand contact info.
- Add nav bar on public routes, keep footer "Developed by Junaid Raza Qureshi".
- Unique SEO `head()` per route.

## Phase 2 — Backend: subscriptions, payments, usage, admin

Single migration:
- `subscription_plans` (seeded: free, pro_monthly, pro_yearly with limits + price).
- `user_subscriptions` (user_id, plan, status, started_at, expires_at).
- `payment_requests` (user_id, plan, method, sender_name, sender_number, screenshot_path, status pending/approved/rejected, admin_notes).
- `usage_events` (user_id, kind, created_at) — for analytics + free-tier limits.
- `contact_messages` (name, email, subject, message).
- `payment_settings` (single-row: account_name, account_number, contact, support_email, methods jsonb) — editable in Supabase, seeded with Junaid's details.
- `app_role` enum + `user_roles` table + `has_role()` SECURITY DEFINER.
- Storage bucket `payment-screenshots` (private) + RLS.
- All tables: GRANTs, RLS, owner policies, admin override via `has_role`.

Server functions (`src/lib/*.functions.ts`):
- `billing.functions.ts`: `getMySubscription`, `getPaymentSettings`, `submitPaymentRequest`, `listMyPaymentRequests`.
- `admin.functions.ts`: `listPendingPayments`, `approvePayment` (activates subscription), `rejectPayment` — all gated by admin role.
- `usage.functions.ts`: `logUsage`, `getMyUsageSummary` (counts by kind, remaining free credits).
- Hook `logUsage` into chat/pdf/notes/mcq/quiz/translate/resume/portfolio/grammar server calls.

## Phase 3 — AI Workspace upgrades

- Chat (`/chat`): streaming via existing `streamLovableAI`, markdown + code highlight (`react-syntax-highlighter`), Copy/Regenerate/Stop, Web Speech API voice input + `speechSynthesis` output, image upload (data URL → Gemini vision message), file upload (PDF/DOCX/TXT → extracted text prepended), drag-and-drop, auto-scroll, typing indicator, language-mirror system prompt.
- New tools:
  - `/resume` — form → AI-generated ATS resume → live preview (2 templates) → PDF export via `jspdf` + `html2canvas`.
  - `/portfolio` — form → AI generates HTML/CSS single-page portfolio → live iframe preview → download `.html`.
  - `/grammar` — text in → corrected text + diff explanations.
- Keep existing PDF/Notes/MCQ/Quiz/Translate; wire them through `logUsage`.

## Phase 4 — Dashboard, Profile, Settings, Payment page, Admin

- `/dashboard`: analytics cards (Total Chats, PDFs, Notes, CVs, Portfolios, Remaining Free Credits) from `getMyUsageSummary` + `getMySubscription`; quick-launch tool grid; upgrade banner when on free.
- `/payment`: pulls `payment_settings` from DB, shows EasyPaisa / JazzCash / NayaPay cards with copy-to-clipboard, plan selector, screenshot upload → `submitPaymentRequest`, request status list.
- `/profile`, `/settings`: keep + polish, add plan badge and sign-out.
- `/admin` (visible only to admins): pending payments queue with approve/reject.

## Phase 5 — QA pass

- Typecheck, fix all errors, remove dead code/TODOs.
- Manual smoke test via preview scripts on each route.
- Verify RLS by querying as authenticated user.

## Notes / decisions

- Payments are manual-approval (as specified) — no Stripe/Paddle. Pro is activated by admin approval writing to `user_subscriptions`.
- Free tier limits enforced server-side in each tool function via `usage_events` count for the day.
- Admin seeding: after migration I'll instruct you to run one SQL insert to grant your user the `admin` role (I don't know your user id).
- Bootstrapping first admin (chicken-and-egg): I'll add a one-time server fn `claimFirstAdmin` that only succeeds when no admin exists yet, so you can self-promote from the UI.

Approve and I'll start Phase 1.

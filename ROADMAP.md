# OrgHub Roadmap

Living inventory of unfinished work, known gaps, and technical debt. Replaces the
old local-only `REFACTOR_PLAN.md` (2026-09-01), which was gitignored and never
visible outside one machine. Everything below was checked against the code as of
**2026-09-24**, not inferred from the audit's original claims: several 2026-09-01
findings had already been fixed by the time this document was written, and are
listed in "Recently fixed" instead of repeated here as open work.

## How to use this document

- Each item names a file, states the current behavior, and says what "done"
  looks like. Prefer that over re-deriving the problem from scratch.
- Status tags: `OPEN` (confirmed, not started), `PARTIAL` (some of it landed),
  `PENDING AUDIT` (investigation was never finished, steps to reproduce are
  given instead of a finding).
- Before starting an item, re-check it against current code. File:line
  references drift as the app changes.
- When you close an item, delete it from here (or move it to "Recently fixed"
  with the commit) rather than leaving a stale checkmark. This file is only
  useful if it stays accurate.

---

## Critical: security and correctness

All five items originally here were fixed and verified on 2026-09-24 (real
JWT forgery attempt tested and rejected; kudos send re-tested end to end with
a second demo user; polls/suggestions actions re-tested end to end): mobile
JWTs now sign with `AUTH_SECRET` instead of a hardcoded fallback; kudos
send/redeem now run at Serializable isolation; the Helm liveness probe now
points at `/api/health/live` with a `startupProbe` added; `castVote`,
`submitSuggestion`, `toggleVote`, and `addComment` all now check the
module-enabled flag; the comment-reply notification call is now
`.catch()`-wrapped. See commit history for specifics.

---

## Feature gaps

- **OPEN. Dining cart has no checkout.**
  [src/components/dining/cart-widget.tsx:137](src/components/dining/cart-widget.tsx#L137):
  "Place Order" fires `toast.info("Online ordering coming soon")`.
  `src/lib/cart.tsx` holds add/remove/quantity/subtotal client-side state with
  no server action or API route that ever persists an order. Decide whether
  this ships as a real order flow (needs an `Order` model, an admin queue, and
  a submit action) or gets removed from the UI until it does; right now it's a
  dead end a user can click into.

- **OPEN. Admin "Auth providers" page is read-only.**
  [src/app/admin/auth-providers/page.tsx](src/app/admin/auth-providers/page.tsx)
  shows configured/not-configured status badges read from env vars, plus a
  DB-backed local-auth toggle. There's no UI to add/edit LDAP or OIDC
  configuration; that's still env-var only. Likely fine for a self-hosted
  product where ops sets env vars, but worth an explicit decision rather than
  leaving it looking like an unfinished CRUD screen.

- **PARTIAL. Mobile REST API auth is inconsistent across routes.**
  `getMobileUser` (Bearer JWT check) is enforced on `mobile-me` and
  `translate`. The feed, article detail, events, and dining routes have no
  auth check at all, gated only by whether the module is enabled. If the
  intent is "public read of published content," this is fine and should just
  be documented; if the intent was "requires a logged-in employee," it's a
  gap. Decide the intent, then either add the check everywhere or state
  explicitly that these are public reads.

- **OPEN. `orghub-mobile` has three stub screens and a large uncommitted
  working tree.** Separate repo, `/Users/petr.petrenko/Documents/git/orghub-mobile`.
  `app/kudos.tsx`, `app/polls.tsx`, `app/suggestions.tsx` all render
  `<ComingSoonScreen>` and nothing else, despite the web backend fully
  supporting all three. Separately and more urgently: as of 2026-09-24 the
  working tree has ~2500 lines of uncommitted changes across 11 tracked files
  plus 29 untracked files (dining screens, calendar, comments, likes, an API
  client, auth). Only two commits exist in the repo's history
  ("Initial commit" and "Mobile design unification"). This work is at risk of
  being lost (accidental checkout, disk loss, wrong branch) until it's
  committed. Commit it first, then decide the three stub screens' priority.

---

## Design unification (not started)

A full 5-phase plan already exists at
`/Users/petr.petrenko/.claude/plans/zesty-sprouting-frost.md` (written this
session, approved in concept, zero phases executed). Summary: the app has
three competing design languages (a dead shadcn/semantic-token layer with zero
imports, ~1500 hand-written gray-scale utility classes, and two correctly-built
but under-used primitives, `Panel` and `PageHeader`). The plan is to make the
dead token layer live, migrate everything onto it in five shippable phases
(foundation, admin, portal, dining editors, cleanup), and verify visually
after each phase in both themes. Read that file in full before starting;
it has the exact class-to-token mapping table and file lists per phase.

---

## Performance

Root-cause item first, the rest multiply in impact once it's fixed:

- **OPEN. Root layout blocks all route caching.**
  [src/app/layout.tsx:1](src/app/layout.tsx#L1) still sets
  `export const dynamic = "force-dynamic"` because it reads settings from the
  DB on every request. Move `getSettings()` into an `unstable_cache` with a
  `"settings"` tag, or push it down into individual pages, so the rest of the
  app can actually be cached.

Everything else, roughly ordered by blast radius:

- **OPEN** [src/app/(portal)/page.tsx:216-219,243](src/app/(portal)/page.tsx#L216):
  feed still runs a full `articleReaction.findMany` to populate `liked`, which
  no rendered component reads on the feed. Delete the query and the field.
- **OPEN** [src/app/(portal)/kudos/page.tsx:80-84](src/app/(portal)/kudos/page.tsx#L80):
  the kudos recipient picker still does an unbounded `user.findMany`. Replace
  with a typeahead server action, `take: 20`.
- **OPEN** [src/components/article-body.tsx:4](src/components/article-body.tsx#L4):
  every public article/page render still imports the full Tiptap editor
  (toolbar + all extensions) just to get `EDITOR_EXTENSIONS`. Zero
  `next/dynamic` usage anywhere in `src/`. Extract the extensions list to its
  own module, render stored content server-side via `@tiptap/html`, lazy-load
  the actual `Editor` component only in the admin content form.
- **OPEN**: feed, kudos, and article-detail pages still chain dependent query
  stages after their main `Promise.all` (reactions, poll, votes, top-kudos,
  etc.) instead of parallelizing what doesn't actually depend on prior
  results.
- **OPEN** [src/lib/views.ts](src/lib/views.ts) `recordView` and
  [src/app/(portal)/kudos/page.tsx:67](src/app/(portal)/kudos/page.tsx#L67)
  (`createNotification` → web push) both still block the response with a
  write during render. Zero uses of `after()` (`next/server`) anywhere.
  Move both there.
- **OPEN** [src/app/admin/page.tsx](src/app/admin/page.tsx): the dashboard's
  top-articles query still does `orderBy: { views: { _count: "desc" } }` over
  the entire `ArticleView` relation to take 5. Add a denormalized `viewCount`
  incremented in `recordView`.
- **PARTIAL** revalidation gaps: `deleteRedeemType` still doesn't revalidate
  `/kudos` ([kudos.ts:404-408](src/lib/actions/kudos.ts#L404)); `castVote`
  still only revalidates `/polls` + the admin page, missing the 4 portal
  sidebar render sites; `saveDiningSettings` still calls the broad
  `revalidateSettings()` on every currency change
  ([settings.ts:227](src/lib/actions/settings.ts#L227)). (Upload, sold-out
  toggle, redeemKudos, and sendKudos revalidation were already fixed.)
- **OPEN** [src/lib/actions/dining.ts:52,61,78,91,101](src/lib/actions/dining.ts#L52):
  still calls the over-broad `revalidatePath("/dining", "layout")` on five
  different mutations, invalidating far more than changed.
- **PARTIAL** [src/lib/actions/dining.ts](src/lib/actions/dining.ts) reorder
  helpers (sections, sort orders) still issue N sequential `UPDATE` statements
  per reorder instead of one batched query. (`nav.ts`'s equivalents are now at
  least wrapped in `$transaction`, just not batched into one statement yet.)
- **PARTIAL** [src/lib/actions/media-migrate.ts](src/lib/actions/media-migrate.ts):
  the per-file reference-fixup loop is now parallelized with `Promise.all`;
  the per-user Gravatar-fetch-and-upload loop is still a fully sequential
  `for`, will time out at scale (5000 users x ~300ms = 25+ min).
- **PARTIAL** image sizing: `week-menu-cell`, the feed thumbnail, and the
  media grid now all pass a `?w=` width param. The dining announcements page's
  banner image still doesn't
  ([src/app/(portal)/dining/[id]/announcements/page.tsx](<src/app/(portal)/dining/[id]/announcements/page.tsx>),
  around line 57).
- **PARTIAL** [src/app/(portal)/articles/[id]/page.tsx:288-301](<src/app/(portal)/articles/[id]/page.tsx#L288>)
  still duplicates `PortalPageLayout`'s sidebar branching by hand instead of
  using the component, which now has 3 other consumers and wraps sidebars in
  Suspense.

---

## UI and design system polish

Smaller items, independent of the design-unification phases above:

- **OPEN.** `Field` (the accessible-label wrapper in
  [src/components/ui/field.tsx](src/components/ui/field.tsx)) is used in
  exactly one file. Six dining/admin files each define their own local `lbl`
  class string instead:
  `kudos-redeem-types-panel.tsx`, `new-venue-form.tsx`, `dish-list.tsx`,
  `venue-settings-form.tsx`, `location-form.tsx`, `topics-list.tsx`.
- **OPEN.** Required-field asterisks aren't accessible in 10 places: 7 files
  put a literal `*` inside the label's own text (screen readers read it as
  "asterisk"), 3 use `<span className="text-red-500">*</span>` with no
  `aria-hidden`
  (`_form.tsx:63`, `send-kudos-button.tsx:103,207`, `week-picker-create.tsx:79`).
  `Field` already does this correctly at field.tsx:29, nothing routes through
  it yet.
- **PARTIAL.** [src/components/dining/location-form.tsx:83](src/components/dining/location-form.tsx#L83):
  the delete trigger is still a `<span onClick>`, not keyboard-focusable, and
  its delete flow still hand-rolls confirm buttons instead of `ConfirmDialog`.
  Same for `venue-settings-form.tsx`'s delete flow (~line 124-145). (Modal
  backdrop color/blur was inconsistent across 9 files, dimmed with no blur in
  some, two different blurred grays in others; normalized to
  `bg-black/25 backdrop-blur-[2px]` everywhere, matching `ConfirmDialog`, on
  2026-09-24.)
- **OPEN.** `submit-button.tsx` uses `px-4` / `disabled:opacity-70`; the
  canonical shape documented in `STYLE_GUIDE.md:211` is `px-3.5` /
  `disabled:opacity-60`. Several dining buttons still hand-roll their own
  non-canonical padding instead of using `<SubmitButton>`.
- **NEEDS A DECISION, not urgent.** `text-gray-400 dark:text-gray-500` (58
  occurrences) may be backwards for contrast: `gray-500` is dimmer than
  `gray-400`, so it reduces contrast on a dark background where more contrast
  is usually wanted. Check against WCAG AA before propagating the pattern
  further; this mostly gets superseded by the design-unification plan's move
  to `text-muted-foreground` anyway.

---

## Testing and CI

- **OPEN. Tests aren't part of CI at all.**
  [.github/workflows/docker.yml](.github/workflows/docker.yml)'s `verify` job
  runs `tsc` and `eslint`, never `npx vitest run`. Add it.
- **OPEN. `src/__tests__/rbac.test.ts` fails at import time**, not from a
  logic bug: `Cannot find module '.../node_modules/next/server' imported from
  next-auth/lib/env.js`, an ESM resolution mismatch between this Next.js
  version and vitest's module resolution. The other two suites
  (`format-price.test.ts`, `actions.auth.test.ts`, 12 tests) pass. Fix the
  import resolution (likely a vitest alias/moduleNameMapper for `next/server`)
  before wiring tests into CI, otherwise CI goes red on arrival.
- **OPEN. Coverage is minimal.** Three test files total, one of them broken.
  Nothing tests dining, kudos, polls, suggestions, or the authorization
  boundary per server action (a VIEWER rejected, an EDITOR out of scope
  rejected, an ADMIN allowed). That authorization matrix is the highest
  value test to add next: cheap with a seeded DB, highest blast radius if
  silently broken.
- **PENDING AUDIT. Input validation and IDOR review never finished.** No
  validation library in `package.json` (no zod, no valibot). Server actions
  read `formData.get(...) as string` directly and generally don't check that a
  client-supplied `id` belongs to the caller's scope. To reproduce the
  investigation: for each action in `src/lib/actions/`, check whether inputs
  are length-bounded, numbers are NaN-checked, enums are validated against
  their union, and whether the `id` argument is checked against the caller's
  role/scope before the mutation runs. Also re-check
  [src/app/api/upload/route.ts](src/app/api/upload/route.ts) for file-type/size
  limits and path traversal in the storage key, and
  [src/app/uploads/[...path]/route.ts](<src/app/uploads/[...path]/route.ts>)
  for whether serving is authenticated or freely enumerable.

---

## Documentation

- **OPEN.** No `CONTRIBUTING.md` or `CHANGELOG.md`. For an AGPL project
  accepting outside deployments, a documented upgrade path (how to run
  `prisma migrate deploy` against a live instance, given history was squashed
  to `0000_baseline` on 2026-09-01) matters more than either.
- **OPEN.** README doesn't mention the 13-file Helm chart under `deploy/`,
  pgbouncer, backup/restore, or how to upgrade an existing deployment.
- **OPEN.** [docs/adding-a-module.md:76](docs/adding-a-module.md#L76) tells a
  contributor to "add action strings to audit.ts" but doesn't say to actually
  call `logAudit` at each mutation. Kudos and dining now call it in several
  places (see "Recently fixed") but not comprehensively, likely for exactly
  this reason: the doc never states it as a required step. Rewrite it to
  require both.

---

## Dead-code and duplication audits (never completed)

Two audits from the original 2026-09-01 pass died before finishing. Steps to
reproduce are given so a future pass doesn't have to redesign the
investigation; nothing here is a confirmed finding.

- **PENDING AUDIT: unused exports and duplicated logic.** The
  ordered-CRUD-list pattern (named rows, up/down reorder, inline add, delete)
  visibly repeats across `venue-tags-editor.tsx`, `nutrition-params-editor.tsx`,
  and the section-handling inside `fixed-menu-editor.tsx` (categories-editor.tsx
  and meal-slots-editor.tsx, the other two originally cited, were deleted this
  session when their functionality was folded into `dish-list.tsx` and
  `meal-structure-editor.tsx`). Quantify the remaining overlap; a shared
  `OrderedListEditor` may or may not still be worth extracting for what's left.
  Also check for duplicated type declarations (`Entry`, `ModifierGroup`, `Tag`,
  `NutritionParam` shapes are redeclared inline in at least `entry-card.tsx`
  and `fixed-menu-editor.tsx`) and unused exports across `src/lib/` and
  `src/components/` (grep each exported symbol for import sites, excluding
  Next.js framework exports like `default`/`GET`/`POST`/`middleware`).
- **PENDING AUDIT: unused Prisma schema fields.** Never checked. Method: list
  every field in `prisma/schema.prisma`, grep each name under `src/`, flag any
  with zero reads or writes.

---

## Recently fixed

Confirmed fixed as of 2026-09-24, listed so nobody re-investigates them:
Docker image now splits into `migrator`/`runner` stages; container runs as
`nextjs`, Helm sets `runAsNonRoot`/`readOnlyRootFilesystem`; CI runs
`tsc`+`eslint` before build; `postinstall: prisma generate` exists;
`translateArticle` requires a role; `docker-compose.yml` runs migrations
before the app starts; seed script requires `SEED_ADMIN_PASSWORD` and no
longer resets the password on re-seed; AGPL source-offer footer link exists;
Google OAuth references removed from README/.env.example (never implemented);
CI Actions are SHA-pinned with Dependabot watching them; most `P4`
dark-mode/theme-token findings from the original audit (inputClass, toaster,
error-state, table-pagination, redeemable-balance, sold-out badge colors,
dead `dark:bg-gray-950`, dining skeleton shimmer, loading.tsx radius mismatch);
most `P5` performance findings (word-count no longer needs the article body,
pinned-articles query bounded and gated, comments paginated, orphaned-media
scan gated to its own tab, image derivative caching, missing DB indexes,
article revalidatePath keyed by id, `WeekMenu` unique constraint declared in
schema, unused `@tiptap/extension-character-count` removed, misplaced deps
moved to `devDependencies`); this same session's larger pass fixing loading
states, mutation error handling, confirm dialogs, and accessibility gaps
across the dining module and elsewhere (see commits `f2866ea`, `cbf4e95`,
`9b0411e`).

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

- **DECIDED (2026-09-24), still OPEN as a feature. Dining cart has no checkout.**
  [src/components/dining/cart-widget.tsx:137](src/components/dining/cart-widget.tsx#L137):
  "Place Order" fires `toast.info("Online ordering coming soon")`.
  `src/lib/cart.tsx` holds add/remove/quantity/subtotal client-side state with
  no server action or API route that ever persists an order. Decision: leave
  as is rather than either building a full `Order` model + admin queue (a real
  feature, not a bug fix) or deleting the cart UI (would throw away working
  code for no reason). The toast is honest, not a silent failure, so this is
  a scoped-out feature, not a correctness bug. Building the real order flow
  is a legitimate future roadmap item on its own, not a quick fix.

- **OPEN. Admin "Auth providers" page is read-only.**
  [src/app/admin/auth-providers/page.tsx](src/app/admin/auth-providers/page.tsx)
  shows configured/not-configured status badges read from env vars, plus a
  DB-backed local-auth toggle. There's no UI to add/edit LDAP or OIDC
  configuration; that's still env-var only. Likely fine for a self-hosted
  product where ops sets env vars, but worth an explicit decision rather than
  leaving it looking like an unfinished CRUD screen.

- **RESOLVED (2026-09-24). Mobile REST API's auth split is intentional, not a gap.**
  `getMobileUser` is enforced on `mobile-me` and `translate` only; feed,
  article detail, events, and dining reads have no auth check. Checked
  against the web portal's own model: [src/middleware.ts](src/middleware.ts)'s
  `matcher` only protects `/admin/:path*`, `/login`, and the auth callback,
  so the portal feed/events/dining pages are ALSO publicly readable
  server-side (`(portal)/page.tsx` calls `getCurrentUser()` for conditional
  UI, never redirects an anonymous visitor). Mutations (comment, react,
  translate) require auth in both the web actions and the mobile routes.
  The mobile API mirrors the web app's actual public-read/authenticated-write
  design; this was a correct read of an unfinished-looking gap, not a bug.

- **FIXED (2026-09-24). `orghub-mobile`'s uncommitted work is now committed**
  (commit `4b8f872`, 43 files). No remote is configured on that repo, so this
  was purely a local-disk-loss risk; it's closed now.
- **OPEN. `orghub-mobile` has three stub screens.**
  `app/kudos.tsx`, `app/polls.tsx`, `app/suggestions.tsx` all render
  `<ComingSoonScreen>` and nothing else, despite the web backend fully
  supporting all three, and despite `lib/useAuth.ts`/`lib/api.ts` already
  existing to build them on. Decide priority for building these three out.

- **FIXED (2026-09-24). Admin Events form said "Create article" instead of
  "Create event".** `content-form.tsx` is correctly shared between Articles
  and Events (events are `Article` rows with `eventDate` fields, so the
  field-visibility logic is right to treat them the same), but its button
  copy read `` `Create ${kind}` `` where `kind` is hardcoded to `"article"`
  for the events pages. Added an `entityLabel` override prop, wired it to
  `"Event"` on both `admin/events/new` and `admin/events/[id]/edit`.

---

## Deeper functional assessment (2026-09-24, hands-on)

Went module by module against the live demo DB, not just reading code.
Confirmed working correctly with no changes needed: admin Users (last-admin
demotion/deactivation is blocked both in the UI, disabled controls, and
server-side in `users.ts`, not just one or the other), Audit log (real
categorized history, not a stub), Suggestions admin moderation (hide/show
toggle and status dropdown both persist correctly), Kudos send end to end
with a second user (including the Serializable-isolation change from the
critical-fixes pass), Polls voting, Suggestions submit/vote/comment.

Could not directly browser-verify the admin create/edit flows for Articles,
Pages, and Events (anywhere `content-form.tsx`'s Tiptap editor is mounted):
simulating a submit-button click on those specific forms falls through to
a native browser GET instead of reaching React's `onSubmit`, reproducibly,
even after a multi-second wait post-navigation. The `onSubmit`/`preventDefault`
code is unremarkable and matches every other working form in the app, and
real articles/events already exist in the demo DB proving the flow works
for actual users, so treat this as a local testing-tool limitation, not a
found bug, and verify by reading the action code rather than by clicking
through it. See `project_orghub_local_dev.md` memory for the exact repro.

**FIXED (2026-09-24). `deleteMediaBulk` only cleared `Article.coverImage`.**
[src/lib/actions/media.ts](src/lib/actions/media.ts) deletes the storage
object and the `Media` row for whatever's selected in the media browser, but
the reference-cleanup only ever nulled `Article.coverImage`. Seven other
fields `findOrphanedObjects` (a few lines above it, in the same file) already
knows how to check were left pointing at a URL that now 404s forever:
`Dish.photo`, `FixedMenuEntry.photo`, `WeekMenuEntry.photo`,
`MonthlyTopic.bannerImage`, `MonthlyTopicHighlight.image`, `User.avatarUrl`,
`SiteSettings.logoUrl`/`logoOnLightUrl`. Added the matching `updateMany` for
each, verified end to end against the live demo DB (created a throwaway
`Media` row, pointed `User.avatarUrl` at it, ran the transaction directly,
confirmed both `avatarUrl` and the `Media` row were correctly cleared).
**Not covered by this fix, still a real gap:** images embedded inside
Article/Page rich-text body content. `findOrphanedObjects` walks that JSON
to find broken-image candidates but nothing rewrites the JSON on delete, so
a media file that's embedded in an article body (not just used as a cover
image) still breaks silently. Fixing that needs a Tiptap-JSON-aware
node-replacement step, not a simple `updateMany`.

Assessed via code review (not hands-on, see the testing-tool limitation
above extends to any admin form; these five don't use content-form.tsx
though, so they're lower-risk to verify hands-on next time regardless):
Navigation reordering, layout/sidebar-widget settings, module toggles,
dining-currency settings, and Categories and Announcements admin CRUD are
all well-validated (enum membership checked, XSS-safe URL validation on
logo/brand fields, a real guard against disabling local auth with no other
provider configured, audit logging on every mutation). No further findings.

Not yet assessed at all: Media upload and the "browse uploaded"/insert-
into-editor flow, Translation (any provider), orghub-mobile's actual screens
on a device.

---

## Design unification (Phase 1 done, Phases 2-5 not started)

Full plan at `/Users/petr.petrenko/.claude/plans/zesty-sprouting-frost.md`,
written earlier this session assuming zero phases were done. **That
assumption was wrong, re-checked 2026-09-24**: Phase 1 (Foundation) is
already fully implemented, apparently by a session outside this
conversation's visible history. Verified directly against current code, not
against the plan's own description of what it expected to find:
`globals.css` already has `--primary: var(--brand)` and the lightened
`--background` in both `:root` and `.dark`, with comments explaining why;
`layout.tsx` already uses `bg-background`/`text-foreground`, no
`.dark body` override left to remove; `card.tsx` already uses
`border border-border`, not a ring; `button.tsx` sizes are already `h-9
px-4` / `h-8 px-3` with a comment matching the plan's own reasoning almost
verbatim; `badge.tsx` is already `rounded-full`; `field.tsx`'s `inputClass`
is already token-based and `Panel` is already a `Card` composition;
`page-header.tsx` already uses `text-foreground`/`text-muted-foreground`.
Every other primitive in `src/components/ui/` (`admin-table`, `stat-card`,
`empty-state`, `toaster`, `confirm-dialog`, `table-pagination`, `skeleton`,
`avatar`, `delete-button`, `status-toggle`, `reject-button`) has zero
`gray-*`/`bg-white` classes. `submit-button.tsx` no longer exists as a
separate file (folded into `button.tsx`).

**What's actually still open**: the primitives are correct and ready, but
the individual page and component files mostly don't use them yet. Re-ran
the plan's own Phase-5 audit command against current code:

```
bg-white                   205
text-gray-[0-9]            1231
border-gray-[0-9]          509
dark:bg-gray-[0-9]         165
dark:text-gray-[0-9]       327
dark:border-gray-[0-9]     166
```

Comparable to the plan's original count (slightly higher in places: this
session's own earlier UX-audit fixes and new loading.tsx files added more
hand-written gray classes before this roadmap item was reassessed). So the
real remaining work is Phases 2 through 5 as originally scoped (admin, then
portal, then dining editors, then cleanup) applying the already-correct
primitives, not rebuilding them. Read the plan file for the exact
class-to-token mapping table and per-phase file lists; treat its "Фаза 1"
section as historical, already done, and skip straight to "Фаза 2".

**FIXED (2026-09-24).** `src/components/ui/separator.tsx`: confirmed zero
imports anywhere in `src/` (the plan's Phase 5 said to check this after all
phases; already true now, no reason to wait). Deleted.

**Phase 2 progress (2026-09-24).** Every page under `src/app/admin/` is now
migrated to tokens and verified with `tsc`/`eslint` (visual check still
pending, see below) — confirmed with
`grep -rlE 'text-gray-[0-9]|border-gray-[0-9]|bg-gray-[0-9]|bg-white' src/app/admin`
returning nothing except `admin/layout.tsx`, which is the sidebar and is
supposed to stay hardcoded dark (see the plan's own note on this). Along the
way, also found and removed a separate, smaller problem specific to the
Suggestions admin pages (`suggestions/page.tsx`, `suggestions/[id]/page.tsx`,
`suggestions/[id]/_admin-form.tsx`, `suggestions/categories/_manager.tsx`,
`suggestions/loading.tsx`): live, correctly-token-based classes sitting next
to a *dead* `dark:` variant of the exact same or a conflicting gray class
(e.g. `text-foreground dark:text-muted-foreground`, `bg-card p-4
dark:border-gray-800 dark:bg-gray-900`). Since admin is forced light-mode,
those `dark:` classes never activate; they're pure clutter and were deleted
rather than resolved. Updated audit counts against the whole `src/app` +
`src/components` tree:

```
bg-white                   169  (was 205)
text-gray-[0-9]           1030  (was 1231)
border-gray-[0-9]          448  (was 509)
dark:bg-gray-[0-9]         159  (was 165)
dark:text-gray-[0-9]       314  (was 327)
dark:border-gray-[0-9]     160  (was 166)
```

**Not yet visually verified**: `preview_start` is still stuck this entire
session (see `project_orghub_local_dev.md` memory) — verified by type-check/
lint and diff review only. Confirm in both themes before trusting it fully,
especially the `<Panel>` conversions and the Suggestions dark: cleanup.

Admin components, smaller ones done (2026-09-24): `module-toggle.tsx`,
`gravatar-toggle.tsx`, `local-auth-toggle.tsx` (the shared toggle-switch
shape: track `bg-gray-200` → `bg-border`, knob `bg-white` → `bg-card`),
`category-manager.tsx`, `layout-form.tsx`, `sidebar-widgets-form.tsx`,
`user-row-actions.tsx`.

**Phase 2 complete (2026-09-24).** The remaining larger components are also
done: `content-form.tsx`, `editor.tsx`, `brand-form.tsx`, `media-picker.tsx`,
`kudos-redeem-types-panel.tsx`, `media-grid.tsx`, `poll-form.tsx`,
`kudos-settings-form.tsx`, `nav-manager.tsx`, `translation-settings-form.tsx`,
`poll-results.tsx`, `media-page-client.tsx`. `boolean-toggle.tsx` and
`sidebar-order-manager.tsx` from the plan's original list no longer exist,
deleted as dead code earlier this session. Two things worth flagging from
this batch specifically:

- `media-grid.tsx` had 11 `dark:*-gray-*` classes that I myself added earlier
  this same session (before re-discovering that admin is forced light-mode),
  not inherited debt. Removed them along with the light-mode migration.
- `media-picker.tsx`'s `MediaPickerField`'s `tone === "dark"` branch
  (`border-gray-700 bg-gray-800`) was correctly left alone: that's a
  deliberate "preview this logo against a permanently dark swatch" prop for
  brand-form's logo-on-dark-background preview, unrelated to the app's theme
  system, not a missed gray class.

Whole-tree audit counts, `src/app` + `src/components`:

```
bg-white                   137  (was 205 at session start)
text-gray-[0-9]            856  (was 1231)
border-gray-[0-9]          375  (was 509)
dark:bg-gray-[0-9]         156  (was 165)
dark:text-gray-[0-9]       308  (was 327)
dark:border-gray-[0-9]     157  (was 166)
```

Phase 2 (admin) is done per the plan's own file list. Remaining counts are
almost entirely Phase 3 (portal, 12 pages + components) and Phase 4 (dining
editors, 12 files) territory; read the plan for both file lists before
starting either.

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

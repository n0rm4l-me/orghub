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
pending, see below), confirmed with
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
session (see `project_orghub_local_dev.md` memory), verified by type-check/
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

- **OPEN, harder than it looks: do not just delete the line.**
  [src/app/layout.tsx:1](src/app/layout.tsx#L1) sets
  `export const dynamic = "force-dynamic"`. `getSettings()`
  ([src/lib/settings.ts:17](src/lib/settings.ts#L17)) is already wrapped in
  `unstable_cache` with a `"settings"` tag and a comment saying this was done
  specifically "so the root layout no longer forces the entire app to be
  dynamic", but nobody removed the export after adding the cache. **Tried
  removing it 2026-09-25: it breaks the production build itself, not just a
  runtime cache-hit-rate concern.** Without `force-dynamic`, Next.js attempts
  to statically prerender pages (starting with `/_not-found`) at build time,
  which executes the root layout's `await getSettings()`, which needs a live
  DB connection, one that doesn't exist in the Cloud Build/Docker build
  environment (only the deployed pod can reach `orghub-postgres`). Confirmed
  with a real `npx next build`: `PrismaClientKnownRequestError: Can't reach
  database server at orghub-postgres`, build exits 1. This would have broken
  every future deploy if pushed. Reverted; diff came back to exactly the
  original file. A real fix needs to address the build-time DB dependency
  itself (give Cloud Build network access to a throwaway/read replica DB, or
  restructure so the root layout doesn't need a DB read to render, e.g. move
  the brand-color `<style>` injection to a client component that fetches it,
  or accept a build-time fallback color when the DB is unreachable) before
  touching the `force-dynamic` export again. Verify any future attempt with
  `npx next build` locally, not just `tsc`, before pushing.

Everything else, roughly ordered by blast radius:

- **FIXED 2026-09-25**
  [src/app/(portal)/page.tsx](src/app/(portal)/page.tsx): the feed's
  `articleReaction.findMany` → `likedIds` → `liked` field chain was dead (no
  rendered component read it). Removed the query and the field. Verified with
  `tsc --noEmit`, `eslint`, and a full `npx next build`.
- **FIXED 2026-09-25**
  [src/app/(portal)/kudos/page.tsx](src/app/(portal)/kudos/page.tsx): the
  kudos recipient picker's unbounded `user.findMany` is gone. Added
  `searchKudosRecipients` in
  [src/lib/actions/kudos.ts](src/lib/actions/kudos.ts) (`take: 20`,
  name/email `contains`, active-only, excludes self);
  [src/components/send-kudos-button.tsx](src/components/send-kudos-button.tsx)
  now debounces (200ms) and calls it instead of filtering a full user list
  client-side, tracking the selected recipient as its own object instead of
  looking it up by id from that list. Only data-fetching/state logic changed;
  the file's portal-facing `dark:`/`gray-*` styling was deliberately left
  untouched (Phase 3 of the design-unification plan is still deferred).
  Verified with `tsc --noEmit`, `eslint`, and a full `npx next build`.
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
- **FIXED 2026-09-25** [src/lib/views.ts](src/lib/views.ts) `recordView`
  (called from
  [articles/[id]/page.tsx:74](<src/app/(portal)/articles/[id]/page.tsx#L74>))
  and the kudos page's monthly-reset `createNotification` → web push
  ([kudos/page.tsx:60](<src/app/(portal)/kudos/page.tsx#L60>)) no longer block
  the response. Both moved into `after()` (`next/server`): nothing rendered
  on either page depended on their result (the view *count* shown is read
  from an earlier query, before this visit's view is recorded). Verified with
  `tsc --noEmit`, `eslint`, and a full `npx next build`.
- **OPEN** [src/app/admin/page.tsx](src/app/admin/page.tsx): the dashboard's
  top-articles query still does `orderBy: { views: { _count: "desc" } }` over
  the entire `ArticleView` relation to take 5. Add a denormalized `viewCount`
  incremented in `recordView`.
- **FIXED 2026-09-25** revalidation gaps: `deleteRedeemType` now revalidates
  `/kudos` too ([kudos.ts:429-435](src/lib/actions/kudos.ts#L429)); `castVote`
  now also revalidates the 4 portal sidebar render sites (`/`, `/events`,
  `/kudos`, `/articles/[id]`) alongside `/polls` + the admin page
  ([polls.ts:223-228](src/lib/actions/polls.ts#L223)); `saveDiningSettings`
  now revalidates `/dining` + `/admin/dining` (`"layout"`) plus the settings
  cache tag instead of the site-wide `revalidateSettings()`
  ([settings.ts:227-230](src/lib/actions/settings.ts#L227)).
- **PARTIAL, judgment call 2026-09-25** [src/lib/actions/dining.ts](src/lib/actions/dining.ts):
  narrowed the 3 mutations whose broad `revalidatePath("/dining", "layout")`
  was clearly wrong for their blast radius: `createVenue`, `updateVenue`,
  `deleteVenue` only ever affect the `/dining` listing and their own
  `/dining/${id}`, never *other* venues, so the layout-wide call was purely
  wasted invalidation. Left `updateLocation` and `deleteLocation` on the broad
  call: a location's timezone genuinely affects the "today" highlight and
  slot status on every venue underneath it (documented in the existing
  comment), and deleting a location is a structural cascade. Narrowing those
  correctly would need a query to enumerate affected venues, which trades a
  real (if small) staleness-risk for a gain that's already mostly moot: the
  root layout is `force-dynamic`, so there's no server-side full-route cache
  for any of this to protect in the first place. The only thing any of these
  `revalidatePath` calls actually invalidates today is the *editing admin's
  own* client-side Router Cache. Given that, don't spend more effort chasing
  the remaining two; the risk/reward doesn't clear the bar.
- **WON'T FIX, judgment call 2026-09-25** [src/lib/actions/dining.ts](src/lib/actions/dining.ts)
  reorder helpers (sections, sort orders, fixed-menu entries) issue N
  `updateMany` calls per reorder inside a `$transaction([...])` array, one
  round-trip-per-row, but already one atomic transaction. Collapsing that
  further into a single raw-SQL statement (`UPDATE ... FROM (VALUES ...)`)
  would need hand-written SQL per call site for a genuine gain that's tiny at
  this data's actual scale (admin-curated lists of tens of rows, not
  thousands): worse trade than the revalidation item above, correctness risk
  in hand-rolled SQL against a real gain of a few extra round-trips on a rare
  admin action. Not worth it unless a specific venue is shown to have hundreds
  of entries.
- **FIXED 2026-09-25** [src/lib/actions/media-migrate.ts](src/lib/actions/media-migrate.ts):
  the per-user Gravatar-fetch-and-upload loop was fully sequential (5000 users
  x ~300ms = 25+ min). Now processes in batches of 10 concurrent requests
  instead of one `Promise.all` over every user (which would just get
  rate-limited by Gravatar) or one-at-a-time. Verified with `tsc --noEmit`,
  `eslint`, and a full `npx next build`.
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

- **FIXED 2026-09-25** [.github/workflows/docker.yml](.github/workflows/docker.yml)'s
  `verify` job now runs `npx vitest run` after `tsc`/`eslint`.
- **FIXED 2026-09-25** [src/__tests__/rbac.test.ts](src/__tests__/rbac.test.ts)
  no longer fails at import time. Root cause: `next-auth` does `import ... from
  "next/server"` with no extension; Next 16.3.2 ships no `exports` map for
  that package, so Node's strict ESM resolver (which Vitest's SSR
  externalization hands `next-auth` off to, bypassing Vite's own resolver and
  any `resolve.alias`) can't find it, while Next's own bundler resolves it
  extension-optionally and never hits this. Fix: added `test.server.deps.inline:
  ["next-auth"]` to [vitest.config.ts](vitest.config.ts), forcing `next-auth`
  through Vite's resolver instead. (Tried a `resolve.alias` for `next/server`
  first: didn't help on its own, because externalized deps skip
  `resolve.alias` entirely; removed it once `deps.inline` alone proved
  sufficient.) All 3 suites (19 tests) now pass, verified once locally and
  once with a fully stripped environment (`env -i`, no `DATABASE_URL` or
  anything else set) to confirm it'll actually pass in GitHub Actions' clean
  runner, not just this machine.
- **PARTIAL 2026-09-25.** Added
  [src/__tests__/actions.roles.test.ts](src/__tests__/actions.roles.test.ts):
  a VIEWER rejected from an ADMIN-only action (`createLocation`,
  `deleteKudos`), an ADMIN allowed (`deleteKudos`), and the case that
  actually matters, since it's the one bug pattern that silently over- or
  under-scopes instead of just failing: an EDITOR rejected from a venue
  under a *different* location (`upsertMealSlots`) alongside an EDITOR
  allowed on their *own* location's venue, so the scoping filter is proven
  to reject correctly without also locking out legitimate access. Followed
  the existing `actions.auth.test.ts` mocking style (no DB, no seed data);
  the venue-scoping mock's `findFirst` actually inspects `where.locationId`
  rather than always returning the row, otherwise the out-of-scope test
  would pass without exercising anything. Still open: dining, polls,
  suggestions have zero coverage beyond this, and the matrix only covers 2
  of the ~15 action files.
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

## Dead-code and duplication audits

Both pending audits from the original 2026-09-01 pass were completed
2026-09-25. Findings and what was actually done follow; anything not marked
FIXED is a documented decision, not an oversight.

### Unused exports and duplicated logic

- **FIXED.** Deleted 2 whole dead files
  ([src/components/ui/button.tsx](src/components/ui/button.tsx),
  [src/components/ui/badge.tsx](src/components/ui/badge.tsx): zero imports of
  either anywhere), 3 unused variants in otherwise-live files
  (`AvatarBadge`/`AvatarGroup`/`AvatarGroupCount` from
  [avatar.tsx](src/components/ui/avatar.tsx), `CardAction` from
  [card.tsx](src/components/ui/card.tsx)), un-exported
  [toaster.tsx](src/components/ui/toaster.tsx)'s `toastManager` (only used
  inside its own file), and 2 dead server actions superseded by newer ones
  that do the same job: `upsertCategories`
  ([dining.ts](src/lib/actions/dining.ts), superseded by
  `upsertSlotsAndCategories`) and `updateAdminNote`
  ([suggestions.ts](src/lib/actions/suggestions.ts), superseded by
  `updateSuggestionStatus`'s optional `adminNote` param). `upsertMealSlots`
  (dining.ts) was *also* dead in production, but was the one still kept alive
  by this same day's own new `actions.roles.test.ts`, added before this audit
  ran; repointed that test at `upsertSlotsAndCategories` (which needs the
  exact same auth + location-scoping) and deleted `upsertMealSlots` too.
- **FIXED.** Consolidated 4 display-only shapes that were byte-for-byte
  identical across 6+ files into
  [src/lib/dining-types.ts](src/lib/dining-types.ts): `NutritionParam`,
  `VenueTag` (was also spelled `Tag` in 2 files, same fields, picked one
  name), and the `entry-card.tsx`/`fixed-menu-view.tsx` pair's `Entry`
  (renamed `MenuEntry` to avoid a generic name)/`ModifierOption`/
  `ModifierGroup`. Pure type change, verified by `tsc --noEmit` alone being a
  complete correctness proof here (types are erased at runtime, so "compiles"
  and "correct" are the same claim for this specific kind of edit, unlike
  almost everything else in this file). Also ran `eslint`, the full test
  suite, and `npx next build`.
  **Deliberately left un-consolidated** (real, schema-backed drift, not
  sloppiness): `dish-list.tsx`'s `ModifierOption`/`ModifierGroup` has no
  `color` field, matching Prisma's `DishModifierOption` (no color column);
  `fixed-menu-editor.tsx`'s adds `dishId`+`order` on top of the display
  `Entry` because editors need to persist those. Merging either into the
  shared type would mean adding a dead field to one side or stripping a real
  one from the other. `week-menu-cell.tsx`'s own `EntryData` (no `id?`) vs.
  `week-menu-grid.tsx`'s `EntryData` (has `id?`) despite the grid passing its
  own `EntryData` into `WeekMenuCell` as that exact prop: compiles today only
  because TS doesn't flag excess properties on a variable, only on a literal,
  so `WeekMenuCell` has no type-safe way to read `entry.id` even though it's
  present at runtime. Nothing currently needs it inside `WeekMenuCell`, so
  left alone, but worth a look if that ever changes.
- **NOT DONE, judgment call.** The ordered-CRUD-list pattern (named rows,
  up/down reorder, inline add, delete) in `venue-tags-editor.tsx` and
  `nutrition-params-editor.tsx` really does share ~40 near-identical lines
  each (~28-31% of both files: `update`/`removeRow`/`moveRow`/the up-down
  button JSX/the Add-Save footer, all rename-only diffs) out of ~130-145
  total. A `useOrderedRows<T>` hook is a defensible extraction for just these
  two. Didn't do it this pass: unlike the type consolidation above, a hook
  extraction changes runtime control flow in live interactive admin editors,
  and `preview_start` has been broken all session, so there'd be no way to
  visually confirm reorder/add/delete still work afterward beyond code
  review. Do this once visual verification is available again.
  `fixed-menu-editor.tsx`'s section/entry handling looks similar at a glance
  but isn't the same duplication: it reorders via drag-and-drop (not
  up/down buttons), persists each mutation immediately through its own
  dedicated action (not one batched "save all"), and nests two levels
  (sections containing entries) instead of one flat list. Unifying it with
  the other two would need an abstraction with escape hatches for all three
  differences, a worse trade than the current duplication. If anything gets
  extracted from this file, the better-scoped target is a `useDragReorder`
  hook shared between its own section-drag and entry-drag blocks (currently
  near-byte-identical to *each other*, not to the other two editors).

### Unused Prisma schema fields

- **OPEN, needs a product decision, not a refactor.** 6 fields have zero
  reads or writes anywhere in `src/` (verified against `prisma/seed.ts` and
  migrations too; there's no raw SQL in this codebase to hide a usage from
  grep): `User.externalId`, `User.organizationId`, `Article.organizationId`
  (+ its own index), `Page.organizationId`, `Venue.workingDays` (superseded
  by the fully-wired `WeekMenu.closedDays`), and `SiteSettings.portalWidth`
  (has a 3-preset doc comment and every sibling layout setting is wired
  through `layout-form.tsx` → `saveLayout`; this one alone was never added to
  that form). All five trace only to the `0000_baseline` migration, so
  they've been dormant since the 2026-09-01 squash, not a recent regression.
  Whoever stubbed in `organizationId` on 3 models was clearly heading toward
  multi-tenancy and never got further: no mention of it anywhere in this
  file, the README, or docs/. Deleting these is a schema migration on a live
  database; decide intent first (is multi-tenancy still wanted? is
  `portalWidth` a real feature to finish or a leftover?) rather than dropping
  columns to tidy up.
- **`MonthlyTopicHighlight`** (whole model: `weekLabel`, `image`, `name`,
  `description`, `order`) is reachable dead code, not just an unused field:
  the backend fully supports it (`upsertTopic()` in dining.ts creates/
  updates/deletes highlight rows) but its only caller,
  `topics-list.tsx`'s `TopicForm`, hardcodes `highlights: []` on every save,
  and no portal page renders `topic.highlights` (the actual "Announcements"
  UI doesn't reference highlights at all; `/topics` routes now just redirect
  there). No row can ever be created through the live UI. Same "decide
  intent, then migrate" caveat as above applies before dropping the model.
- **Needs a look, lower confidence:** `Venue.orderingEnabled` is unused but
  is almost certainly reserved for the dining-cart checkout feature this
  file's Feature Gaps section already documents as *decided-to-defer*, not
  an unrelated dead flag: treat as reserved, not a deletion candidate, unless
  the cart's fate is being decided too. `AuditLog.userAgent` is written on
  every audit entry but never displayed (its sibling `ip` *is* shown in the
  admin audit page); could be an oversight (add a UI column) or intentional
  "log more than we show" hygiene. `Session`/`VerificationToken` (NextAuth's
  own models) look structurally unreachable given this app uses JWT sessions
  and only Credentials/Okta providers, but `@auth/prisma-adapter` may still
  need the delegate to exist for its TS contract even if unused at runtime;
  don't remove either without checking the adapter still compiles.

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

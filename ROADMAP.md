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

## Framework currency (Next.js 16)

This repo's `AGENTS.md`/`CLAUDE.md` (gitignored, "AI assistant config files")
carry a real, first-party Next.js 16.3.2 block (confirmed genuine by reading
`node_modules/next/dist/server/lib/generate-agent-files.js`'s source, not just
trusting the text) pointing at `node_modules/next/dist/docs/` for
version-matched docs, since training data can be stale for a fast-moving
framework. Worth an occasional skim, not just a one-time read; a
`node_modules` reinstall/upgrade regenerates it. What came out of reading it
once, 2026-09-25:

- **FIXED.** `src/middleware.ts` renamed to
  [src/proxy.ts](src/proxy.ts) (function renamed `middleware` → `proxy` too):
  the `middleware` filename/export are deprecated in Next.js 16 in favor of
  `proxy`, purely a naming/convention change, same signature, same matcher
  config, verified with `tsc`, `eslint`, `vitest`, and a real `npx next
  build`. Not urgent (still works either way, `next build`'s own output
  labels the route "Proxy (Middleware)" regardless of which filename is
  used), but there's no reason to carry a deprecated name forward.
- **Worth knowing, not changed:** `revalidateTag` calls in
  [settings.ts](src/lib/actions/settings.ts) already correctly pass a second
  argument (`{}`, a valid empty `CacheLifeConfig`) since Next.js 16 made the
  single-argument form a type error, so whoever wrote `revalidateSettings()`
  already knew about this. The docs note `revalidateTag` is meant for
  stale-while-revalidate semantics and recommend `updateTag` (new in Next.js
  16, Server-Actions-only) for read-your-own-writes cases, which arguably
  describes `revalidateSettings()` better (an admin saving settings likely
  wants to see their own change immediately, not tolerate brief staleness).
  Didn't switch it: no evidence of an actual staleness problem right now, and
  swapping a working call for a "more semantically correct" one on a doc's
  general advice alone, without a concrete symptom, isn't a great trade.
  Worth trying `updateTag` if an admin ever reports settings appearing to lag
  after saving.
- **Not checked yet, flagging for whoever picks this up:** the same docs
  cover React 19.2 (View Transitions, `useEffectEvent`, `Activity`), stable
  `cacheLife`/`cacheTag` (drop the `unstable_` prefix if used anywhere, grep
  turned up none in `src/`), `next/image` default changes
  (`minimumCacheTTL` 60s→4h, `qualities` now `[75]` only, local
  query-string images need `localPatterns.search`), and Cache Components
  (`cacheComponents` config, opt-in). None of these came up as an active
  problem in this pass, but nobody has gone through this app's `next/image`
  usage or Server Component structure specifically checking for them.

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

- **RESOLVED 2026-09-25. Read-only by design, not an unfinished screen.**
  [src/app/admin/auth-providers/page.tsx](src/app/admin/auth-providers/page.tsx)
  already says so explicitly in its own `PageHeader` description
  ("Configured through environment variables, not this screen"), redacts the
  Okta secret and LDAP bind password rather than showing them, and has a
  code comment explaining why: these are exactly the class of credential
  (SSO client secrets, directory bind passwords) that shouldn't round-trip
  through a browser form into the database when env-var injection at the
  ops/infra layer is the more secure pattern. Re-read the page in full
  before deciding: this isn't a gap, it's a deliberate, already-correct
  design choice that just needed crediting as one.

- **RESOLVED (2026-09-24). Mobile REST API's auth split is intentional, not a gap.**
  `getMobileUser` is enforced on `mobile-me` and `translate` only; feed,
  article detail, events, and dining reads have no auth check. Checked
  against the web portal's own model: [src/proxy.ts](src/proxy.ts)'s
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
`gray-*`/`bg-white` classes.

**Correction, 2026-09-25: the "`submit-button.tsx` no longer exists, folded
into `button.tsx`" line above was wrong.**
[src/components/submit-button.tsx](src/components/submit-button.tsx) exists
right now, is a different component (wraps `useFormStatus()` for
progressive-enhancement `<form action={serverAction}>` submissions with no
client state, not a styling variant of `Button`), and doesn't import from
`button.tsx` at all. Not clear whether this was a stale observation or a
straightforward mistake by whoever verified Phase 1; flagging so nobody
trusts it without checking again themselves.

**Near-miss, 2026-09-25: this session's own dead-exports audit (see
"Dead-code and duplication audits" below) deleted
[button.tsx](src/components/ui/button.tsx) and
[badge.tsx](src/components/ui/badge.tsx) for having zero current
importers**, without cross-referencing this section first, which already
documented them as Phase 1 foundation work verified complete and correct,
just not yet adopted anywhere. Caught by re-reading this section afterward
and restored both files to their exact pre-deletion content (`git show` on
the parent commit). The actually-dead primitives from that same audit pass
(`AvatarBadge`/`AvatarGroup`/`AvatarGroupCount`, `CardAction`, the exported
`toastManager`) were not named anywhere in the design-unification plan and
stayed removed. Lesson for whoever runs the next dead-code pass on
`src/components/ui/`: cross-check this section before deleting anything
there, "zero importers" and "dead" are not the same claim for a primitive
that's mid-rollout.

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
- **FIXED 2026-09-25, all 3 pages that had this pattern.**
  [src/app/(portal)/page.tsx](<src/app/(portal)/page.tsx>) (the feed): the
  `lastFeedVisitAt` lookup, active-poll data, and top-kudos data were 3
  separate sequential `await`s after the main `Promise.all`, even though
  none of the three depends on either of the others (only on
  `user`/`settings`, both already resolved). Merged into one `Promise.all`.
  [src/app/(portal)/kudos/page.tsx](<src/app/(portal)/kudos/page.tsx>): same
  pattern, active-poll data and top-kudos data merged the same way.
  [src/app/(portal)/articles/[id]/page.tsx](<src/app/(portal)/articles/[id]/page.tsx>):
  the current user's like-reaction lookup and active-poll data were
  sequential despite being independent (both only need `user`/`article.id`,
  already resolved); merged. All three keep each poll lookup's own internal
  2-step dependency (fetch the poll, then its votes) sequential inside an
  extracted `loadActivePollData()`, since that one genuinely can't be
  parallelized. Verified each with `tsc`, `eslint`, `vitest`, and a full
  `npx next build`; re-read each extracted function against its original
  field-by-field since these are the highest-traffic pages and can't be
  visually checked right now (the feed page's version was additionally
  live-verified via curl after deploy).
- **FIXED 2026-09-25** [src/lib/views.ts](src/lib/views.ts) `recordView`
  (called from
  [articles/[id]/page.tsx:74](<src/app/(portal)/articles/[id]/page.tsx#L74>))
  and the kudos page's monthly-reset `createNotification` → web push
  ([kudos/page.tsx:60](<src/app/(portal)/kudos/page.tsx#L60>)) no longer block
  the response. Both moved into `after()` (`next/server`): nothing rendered
  on either page depended on their result (the view *count* shown is read
  from an earlier query, before this visit's view is recorded). Verified with
  `tsc --noEmit`, `eslint`, and a full `npx next build`.
- **CHECKED AGAINST REAL DATA, NOT ACTIONABLE YET, 2026-09-25.**
  [src/app/admin/page.tsx](src/app/admin/page.tsx)'s top-articles query does
  `orderBy: { views: { _count: "desc" } }` over the entire `ArticleView`
  relation to take 5, and a denormalized `viewCount` incremented in
  `recordView` would avoid that. Checked the live staging DB before doing the
  migration: `ArticleView` currently has **6 rows** across 20 published
  articles. This query is a `GROUP BY`+`ORDER BY`+`LIMIT 5` with a foreign-key
  index on `articleId`; at 6 rows it's microseconds regardless of indexing.
  There's no current performance problem to fix. A denormalized counter also
  isn't free to add correctly: `_count.views` counts *distinct viewers*
  (`ArticleView` is upserted per `{articleId,userId}`, not per pageview,
  per `recordView`'s own upsert semantics), so a `viewCount` column would
  need to increment only on a genuinely new viewer, not on a repeat
  visitor's `viewedAt` touch, meaning `recordView`'s `upsert` would need to
  become a `create`-and-catch-P2002-on-conflict instead (upsert's return
  value doesn't distinguish which branch fired). That's real complexity and
  a real place to introduce a silent counting bug, for zero measured benefit
  today. Revisit if `ArticleView` actually grows large enough for this
  specific query to show up in a slow-query log, not preemptively.
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
- **FIXED 2026-09-25.** Image sizing: `week-menu-cell`, the feed thumbnail,
  the media grid, and now the dining announcements page's banner image
  (`?w=800`, matching the feed's featured-card image, both are `w-full`
  hero images of a similar scale inside a comparable max-width container)
  all pass a `?w=` width param.
- **PARTIAL** [src/app/(portal)/articles/[id]/page.tsx:288-301](<src/app/(portal)/articles/[id]/page.tsx#L288>)
  still duplicates `PortalPageLayout`'s sidebar branching by hand instead of
  using the component, which now has 3 other consumers and wraps sidebars in
  Suspense.

---

## UI and design system polish

Smaller items, independent of the design-unification phases above:

- **FIXED 2026-09-25.** Navigation had a visible layout jump on every route
  change: each `loading.tsx` skeleton was a fixed, generic shape, so when
  the real page resolved (portal: with or without `PortalPageLayout`'s
  sidebar; admin: whatever that page's actual content turned out to be) the
  content reflowed. Root cause wasn't "the skeleton is the wrong shape",
  it's that Next.js only shows a route's `loading.tsx` fallback at all when
  navigation takes long enough to need one; for the common fast case it
  already keeps the previous page on screen and swaps directly, so removing
  the fallback entirely (rather than making it layout-aware per module)
  also removes the jump, not just makes it prettier. Deleted all 32
  `loading.tsx` files (10 portal, 22 admin) and the now-fully-orphaned
  `src/components/skeletons.tsx`. Added
  [nextjs-toploader](https://www.npmjs.com/package/nextjs-toploader) (zero
  new transitive dependencies, peer deps `next >= 6`/`react >= 16`) for the
  slower-navigation case instead, wrapped in
  [src/components/top-loader.tsx](src/components/top-loader.tsx) rather than
  mounted directly: the bar spans the full viewport width at `y=0`
  regardless of section, so a single fixed color can't read against both
  the portal's brand-colored sticky header and admin's plain light
  background (admin has no top bar of its own). The wrapper reads the
  pathname and picks white for the portal (matching the header's own
  `text-white` convention) or the brand color for admin. First attempt
  shipped with a single `color="var(--brand)"` for both, which is exactly
  invisible in the portal since it draws the brand color on top of the
  brand-colored header; caught only after asking the user to check the
  deployed result twice, `preview_start` still being broken this session.
  Also tried `scrollbar-gutter: stable` on `html` alongside this, to stop a
  second, unrelated jump when a page crosses the scroll threshold; reverted
  same day, it reserves the scrollbar's width even on pages that don't need
  one, leaving a permanent empty strip against the same full-bleed header.
  User chose to keep the occasional cross-threshold jump over a
  permanent, always-visible gap. Verified with `tsc`, `eslint`, the full
  test suite, and `npx next build` at every step; the color fix and the
  scrollbar-gutter revert are both still only confirmed by reasoning about
  the code, not by seeing them, same `preview_start` limitation.
- **OPEN.** `Field` (the accessible-label wrapper in
  [src/components/ui/field.tsx](src/components/ui/field.tsx)) is used in
  exactly one file. Six dining/admin files each define their own local `lbl`
  class string instead:
  `kudos-redeem-types-panel.tsx`, `new-venue-form.tsx`, `dish-list.tsx`,
  `venue-settings-form.tsx`, `location-form.tsx`, `topics-list.tsx`.
- **FIXED 2026-09-25.** Required-field asterisks are accessible everywhere
  now: the 7 files that put a literal `*` inside the label's own text
  (`kudos-redeem-types-panel.tsx`, `dish-list.tsx`, `new-venue-form.tsx` x2,
  `venue-settings-form.tsx`, `add-venue-dialog.tsx`, `location-form.tsx`,
  `topics-list.tsx`) now wrap it in `<span aria-hidden="true">`, and the 4
  (not 3, `week-picker-create.tsx:79` used `text-red-400` not `-500` so an
  exact-string search had missed it) that already used a styled span just
  needed the `aria-hidden` attribute added
  (`_form.tsx:63`, `send-kudos-button.tsx:107,211`, `week-picker-create.tsx:79`).
  Zero visual change (`aria-hidden` doesn't affect rendering), verified with
  `tsc`, `eslint`, the test suite, and `npx next build`. `Field`
  (field.tsx:29) still does this correctly for anything that routes through
  it, which remains just the one file noted below.
- **CORRECTED, smaller than described 2026-09-25.**
  [src/components/dining/location-form.tsx:83](src/components/dining/location-form.tsx#L83)
  does wrap its `trigger` prop in `<span onClick={handleOpen}>`, but checked
  both real call sites (`admin/dining/page.tsx:46,69`): `trigger` is always a
  real `<button>` there, so keyboard activation already works today (Enter/
  Space on the focused button fires a native click that bubbles up to the
  span's handler). The latent risk is real but hasn't manifested: a future
  caller passing a non-interactive `trigger` (an icon, a styled `div`) would
  get an unfocusable one. Didn't fix it: the honest fix is
  `cloneElement(trigger, { onClick: handleOpen })` instead of wrapping, which
  changes the prop's effective type and has its own edge cases (multiple
  children, an already-set `onClick`), not a risk-free change for a bug that
  doesn't exist yet. Separately, its delete flow's "hand-rolled instead of
  `ConfirmDialog`" is also true but not a bug: it's an inline arm/confirm
  button swap (click once to arm, again to confirm), a genuinely different
  interaction from `ConfirmDialog`'s modal, not a broken or inaccessible copy
  of it. `venue-settings-form.tsx`'s delete flow, by contrast, already *is* a
  full modal with the same backdrop treatment `ConfirmDialog` uses
  (`bg-black/25 backdrop-blur-[2px]`), just not literally routed through the
  shared component. Consolidating either onto `ConfirmDialog` is a real UX
  change (replacing an inline pattern with a modal, or a hand-rolled modal
  with the shared one) that should be visually checked before shipping, not
  assumed safe from a code diff.
- **CITATION DOESN'T HOLD UP, needs a human call, not a mechanical fix
  2026-09-25.** Re-checked this against the then-current (local-only, not
  committed) `STYLE_GUIDE.md` before touching `submit-button.tsx`:
  `disabled:opacity-60` doesn't appear anywhere in it (only `opacity-40`,
  on unrelated Cancel/Delete examples); `px-3.5` does exist, but on the
  "Primary action (CTA in PageHeader)" `<Link>` pattern, a different button
  role with a different sizing approach (`py-2`-driven height, not
  `submit-button.tsx`'s fixed `h-9`). This session's own design-unification
  plan (`.claude/plans/zesty-sprouting-frost.md`) set `h-9`/`px-4` as the
  target size for the primitive `Button` component, which is what
  `submit-button.tsx` already matches. Not making an unverified change on a
  citation that didn't check out. `STYLE_GUIDE.md` was deleted the same day
  (superseded by the committed
  [docs/design-guidelines.md](docs/design-guidelines.md), which documents
  the same `h-9`/`px-4` target), so the "reconcile the two docs" half of
  this note no longer applies; the "several dining buttons hand-roll their
  own padding instead of using `<SubmitButton>`" half is still worth
  someone's time regardless.
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
- **PARTIAL, extended 2026-09-25.** Added
  [src/__tests__/actions.roles.test.ts](src/__tests__/actions.roles.test.ts):
  a VIEWER rejected from an ADMIN-only action (`createLocation`,
  `deleteKudos`), an ADMIN allowed (`deleteKudos`), and the case that
  actually matters, since it's the one bug pattern that silently over- or
  under-scopes instead of just failing: an EDITOR rejected from a venue
  under a *different* location (`upsertSlotsAndCategories`) alongside an
  EDITOR allowed on their *own* location's venue, so the scoping filter is
  proven to reject correctly without also locking out legitimate access.
  The venue-scoping mock's `findFirst` actually inspects `where.locationId`
  rather than always returning the row, otherwise the out-of-scope test
  would pass without exercising anything.
  Added [actions.polls.test.ts](src/__tests__/actions.polls.test.ts) (VIEWER
  rejected / EDITOR allowed on `createPoll`, unauthenticated rejected from
  `castVote`) and
  [actions.suggestions.test.ts](src/__tests__/actions.suggestions.test.ts)
  (EDITOR rejected / ADMIN allowed on `deleteSuggestion`, and
  `deleteComment`'s ownership-or-role check: a VIEWER can delete their own
  comment, can't delete someone else's, an EDITOR can delete anyone's).
  All follow the same no-DB mocking style as `actions.auth.test.ts`. Still
  open: kudos beyond `deleteKudos`, and most non-authorization logic
  (validation, notification side effects, the `isAdminReply` flag
  `addComment` computes from the caller's role) have no coverage; the
  matrix now covers 4 of ~15 action files.
- **AUDIT COMPLETE 2026-09-25. One HIGH-severity finding, fixed same day.**
  Read every file in `src/lib/actions/` (20 files), both upload routes,
  `rbac.ts`, `dining-scope.ts`, `storage.ts`, and the schema. Full findings
  below; headline result: **no classic IDOR** (no case where a
  lower-privileged role can touch another user's row it has no business
  relationship to) anywhere in `src/lib/actions/`. `dining.ts`'s
  `findEditableVenue`/`locationFilter` venue-scoping (already tested,
  `actions.roles.test.ts`) checked out as correct for every mutator in that
  file, not just the two already covered by a test.
  - **FIXED, HIGH severity: stored XSS via SVG upload.**
    [src/app/api/upload/route.ts](src/app/api/upload/route.ts) allowlisted
    `image/svg+xml`, excluded it from the resize/re-encode pass (served
    byte-for-byte), and `next.config.ts` has no `Content-Security-Policy`.
    Any authenticated user, any role, could upload an SVG containing
    `<script>`, get back a same-origin `/uploads/...` URL, and share it: a
    victim (including an ADMIN) navigating to that URL directly (a link
    click, not an `<img>` render, since `<img>`-loaded SVGs don't execute
    scripts) would run the attacker's script with their own live session.
    Removed `image/svg+xml` from the upload allowlist. Verified 2
    already-existing SVGs in the live DB before deciding whether to touch
    the serving side too: one is the site's actual live logo
    (`SiteSettings.logoUrl`), admin-uploaded, rendered only via `<img>`
    (which doesn't execute embedded scripts), so left the serving-side MIME
    mapping alone rather than break that, since the fix that matters is
    closing the upload path for untrusted/low-privilege users, not
    retroactively distrusting 2 known-benign, admin-uploaded files. Added
    [src/__tests__/upload-route.test.ts](src/__tests__/upload-route.test.ts)
    so this can't silently regress (asserts SVG is rejected regardless of
    role, and that `getCurrentUser()` is actually what gates the route).
  - **FIXED, same file: auth bypassed the deactivated-user check.** The
    route called `auth()` directly instead of `getCurrentUser()`
    ([rbac.ts](src/lib/rbac.ts) documents exactly why this distinction
    matters: JWT role claims go stale, and only `getCurrentUser()` re-checks
    `active` in the DB). A deactivated/off-boarded user could still upload
    through this one route as long as their session hadn't expired, even
    though every server action correctly rejects them. Switched to
    `getCurrentUser()`.
  - **FIXED, defense in depth:**
    [src/app/uploads/[...path]/route.ts](<src/app/uploads/[...path]/route.ts>)
    passed the path parameter straight to the storage backend with no
    rejection of `..` segments anywhere in the app code. Not confirmed
    exploitable (depends on infra: reverse proxy normalization, whether the
    S3-compatible backend would even honor a traversal key), but there's no
    reason to rely on that when a one-line rejection removes the question
    entirely. Confirmed serving *is* intentionally unauthenticated
    (matches the "public-read" portal design already documented above) and
    the storage key itself can't be influenced by a client-supplied filename
    (built from `randomUUID()`, not `file.name`), so no other change needed
    there.
  - **Lower-severity triage list: all FIXED 2026-09-25.** None of these are
    IDOR or let one user touch another's private data, they were
    data-integrity/robustness gaps.
    [announcements.ts](src/lib/actions/announcements.ts) `createAnnouncement`/
    `updateAnnouncement`: `linkUrl` had no scheme validation (an EDITOR could
    store a `javascript:` URI). Added the same `validUrl()` check
    [nav.ts](src/lib/actions/nav.ts) already uses for quick links (this
    codebase's convention is a small local copy per file rather than a
    shared export, matching `settings.ts`'s `validImageUrl`, so followed
    that).
    [kudos.ts](src/lib/actions/kudos.ts) `sendKudos`: `amount` now capped at
    10,000 regardless of the monthly-budget setting; `value` is now checked
    against `settings.kudosValues`' parsed set rather than accepted as any
    string (matches the UI, which already only offers those as button
    choices).
    [polls.ts](src/lib/actions/polls.ts) `parsePoll`: each option's text is
    now capped at 200 characters (count was already bounded, length wasn't).
    [comments.ts](src/lib/actions/comments.ts) `addComment`: the article
    lookup now requires `published: true`; a reply's `parentId` is now
    checked against the same `articleId` rather than accepted from any
    article.
    [reactions.ts](src/lib/actions/reactions.ts) `toggleReaction` and
    [suggestions.ts](src/lib/actions/suggestions.ts) `toggleVote`: both now
    check the target row exists (and, for suggestions, isn't hidden) before
    creating a vote/reaction, matching the pattern `addComment` already used
    in the same file.
    Verified with `tsc --noEmit`, `eslint`, the full `vitest` suite (35
    tests, unchanged), and a real `npx next build`.

---

## Documentation

- **FIXED 2026-09-25.** Added [docs/design-guidelines.md](docs/design-guidelines.md):
  colors (the token table plus what stays hardcoded and why), the
  admin-always-light-mode rule (previously only a code comment and a
  `CONTRIBUTING.md` bullet), radius/padding/typography/icon conventions,
  a z-index scale (didn't exist; documented the target scale plus every
  current usage that doesn't conform yet, listed by name rather than
  refactored blind), a layout-stability section written directly from two
  incidents shipped the same day (the `loading.tsx`/layout-jump fix and its
  own color-contrast bug, the `scrollbar-gutter: stable` tradeoff and
  revert), and a primitives reference (`PageHeader`, `Panel`,
  `ConfirmDialog`, `EmptyState`, `AdminTable`, `PortalPageLayout`,
  `Button`/`Badge` with an honest 0-adoption note rather than implying
  they're already in use). Requested by the user explicitly, for agents and
  human contributors alike. Superseded and deleted the old
  `STYLE_GUIDE.md`: it was local-only (gitignored), which can't serve human
  contributors at all, and its color guidance predated the token system by
  weeks. Folded its still-accurate sections (`AdminTable` column reference,
  `EditorHeader`, `EmptyState`, icon sizes, admin page structure) into the
  new file rather than losing them. Also fixed
  [docs/adding-a-module.md](docs/adding-a-module.md)'s module-checklist
  step that told new contributors to add `dark:bg-gray-800
  dark:border-gray-700 dark:text-gray-*` to every card, directly
  contradicting the migration this whole section documents, and its layout
  step that still described the pre-`PortalPageLayout` manual
  `showLeft`/`showRight` pattern.
- **FIXED 2026-09-25.** Added [CONTRIBUTING.md](CONTRIBUTING.md) (setup
  pointer, the 3 checks to run before a PR, module-adding pointer,
  conventions), linked from README. Still no `CHANGELOG.md`; lower priority,
  no tagged releases exist yet for one to track against.
- **FIXED 2026-09-25.** README now has a
  [Deployment section](README.md#deployment) covering the Helm chart, how to
  install/upgrade, that migrations run automatically, and an honest note that
  backup/restore isn't implemented (no snapshot mechanism exists for the
  bundled Postgres `StatefulSet`).
- **FIXED 2026-09-25.** [docs/adding-a-module.md](docs/adding-a-module.md)'s
  audit-log section now explicitly requires both steps: add the action
  string, *and* actually call `logAudit` at the mutation site (with an
  example). It previously only said the first, which is likely why kudos and
  dining's own audit coverage is inconsistent (see "Recently fixed").

---

## Dead-code and duplication audits

Both pending audits from the original 2026-09-01 pass were completed
2026-09-25. Findings and what was actually done follow; anything not marked
FIXED is a documented decision, not an oversight.

### Unused exports and duplicated logic

- **PARTLY REVERTED, see the note in "Design unification" above.** Initially
  deleted `button.tsx`/`badge.tsx` for having zero current importers; both
  were actually Phase 1 design-unification foundation work, verified
  complete and intentionally awaiting adoption, not dead. Restored to their
  exact pre-deletion content. Still deleted: 3 unused variants in
  otherwise-live files
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

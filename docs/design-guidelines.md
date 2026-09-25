# Design guidelines

Reference for AI agents and human contributors, for admin and portal alike.
Follow these patterns exactly; if a new pattern is genuinely needed, add it
here in the same change that introduces it, so this file and the code never
drift apart again.

This file replaces the old `STYLE_GUIDE.md` (local-only, gitignored, last
updated before the token migration below). If you find a copy of it lying
around, it's stale; this file is the current one.

---

## Colors: tokens, not gray-scale utilities

Every surface, border, and text color comes from a CSS custom property
declared in [src/app/globals.css](../src/app/globals.css), registered as a
Tailwind color via `@theme inline` so the usual utilities work
(`bg-card`, `text-muted-foreground`, `border-border`, ...).

| Use | Token | Never write |
|---|---|---|
| Page background | `bg-background` | `bg-gray-50`, `dark:bg-[...]` |
| Card, panel, table, input surface | `bg-card` | `bg-white` |
| Dropdown, popover, dialog surface | `bg-popover` | `bg-white` |
| Nested block inside a card, panel footer | `bg-muted` | `bg-gray-50`, `bg-gray-100` |
| Divider, track | `bg-border` / `border-border` | `bg-gray-200`, `border-gray-200` |
| Heading, primary text | `text-foreground` | `text-gray-900/800/700` |
| Secondary text, captions, placeholders | `text-muted-foreground` | `text-gray-600/500/400` |
| Hover surface | `hover:bg-muted` | `hover:bg-gray-50/100` |

Do **not** add a paired `dark:` class next to a token class. The token
already has a `.dark` value in `globals.css`; a `dark:bg-gray-900` sitting
next to `bg-card` overrides the token in dark mode and reintroduces exactly
the inconsistency this system exists to remove.

**Exceptions, left alone on purpose:**
- Status colors (`red`, `amber`, `emerald`, `green`, `blue` and their `-400`
  through `-700` shades) carry meaning, not surface. Keep them literal.
- Brand color: `bg-brand`, `text-brand`, `border-brand`, `bg-brand/10`, never
  a hardcoded hex. `--brand` is injected per-request from
  `SiteSettings.primaryColor`; a hardcoded color can't follow a tenant's
  configured brand.
- The admin sidebar (`src/app/admin/layout.tsx`, `admin-mobile-sidebar.tsx`,
  `admin-nav.tsx`) is deliberately always dark, in both themes. It uses
  `bg-gray-900` and the `.scrollbar-on-dark` utility on purpose; the
  `--sidebar` tokens exist in `globals.css` but are unused here because in
  light mode they resolve to near-white, which would defeat the point.

## Admin is always light mode

`/admin` never renders in dark mode, regardless of the user's saved theme
preference. The root layout's inline theme script
([src/app/layout.tsx](../src/app/layout.tsx)) explicitly skips adding the
`dark` class when `location.pathname` starts with `/admin`. Practical
consequence: never add a `dark:` variant to anything that only renders
under `/admin`. If you're writing a component that's used in both admin and
the portal, the token classes handle this correctly on their own (they
simply never hit their dark values under `/admin`); a hand-written `dark:`
override is redundant there and misleading everywhere else.

## Radius and padding

| Radius | Use |
|---|---|
| `rounded-full` | Pills, avatars, dots |
| `rounded-lg` | Buttons, inputs, small controls |
| `rounded-xl` | Cards, panels, dialogs |

Card padding: `p-4` for compact/dense cards (stat cards, list rows), `p-5`
for a page-level panel section. Don't reach for `p-6` or `p-8` on new cards;
they're legacy sizes from before this scale, not a deliberate second tier.

## Typography

| Use | Class |
|---|---|
| Page title | `PageHeader` component, not a raw `<h1>` |
| Section heading | `text-sm font-semibold uppercase tracking-wide text-muted-foreground` |
| Table header | `text-xs font-semibold tracking-wide text-muted-foreground uppercase` |
| Primary cell text | `text-sm font-medium text-foreground` |
| Secondary cell text | `text-xs text-muted-foreground` |
| Monospace (paths, IPs) | `font-mono text-xs text-muted-foreground` |

Weight: `font-semibold` for headings and emphasis, never `font-bold` in new
code. It's a pre-token holdover (36 occurrences as of 2026-09-25); one step
heavier than the rest of the type scale intends.

## Icons

Library: `lucide-react`. `aria-hidden` on every decorative icon;
`aria-label` on every icon-only button.

| Context | Size |
|---|---|
| Button icon | `size-4` |
| Cell icon button | `size-3.5` |
| Table header icon | `size-3.5` |
| Inline indicator | `size-3` |

## z-index scale

No `z-index` above the low, purely-local values (`z-10`/`20`/`30`/`40`, used
for stacking within a single component, e.g. an avatar badge over its
image) should be invented ad hoc. Use one of these:

| Layer | Value | Used by |
|---|---|---|
| Sticky in-page chrome | `z-50` | Portal header |
| Overlay that must clear sticky chrome | `z-[60]` | Skip-to-content link, dropdown/autocomplete panels |
| Modal backdrop | `z-[90]` | `ConfirmDialog` |
| Modal content | `z-[95]` | `ConfirmDialog` (backdrop + 5, so content always paints above its own backdrop) |
| Full-screen mobile drawer | `z-[100]` | Mobile nav menu, admin mobile sidebar |
| Toast / notification | `z-[150]` | Toast viewport (must clear an open modal, so a toast is never trapped behind one) |

`nextjs-toploader`'s bar is a third-party default at `1600`; leave it,
nothing in the app should ever need to paint above it.

**Not yet conforming, fix opportunistically rather than in a mechanical
sweep** (each of these needs a real look at what's actually stacking, not a
find-and-replace): `cart-widget.tsx`'s backdrop at `z-[49]` (one below the
header, so the header stays on top of it, possibly intentional, possibly
not); `send-kudos-button.tsx`'s dialog and `admin-mobile-sidebar.tsx`'s
drawer both at `z-[200]`, which should be `90`/`95` and `100` respectively
per the table above; `redeemable-balance.tsx`'s hand-rolled dialog, which
duplicates `ConfirmDialog`'s backdrop/content values instead of using the
component.

## Avoiding layout shift and jank

This app had two real, shipped instances of this in September 2026; both
are captured here so they don't recur.

- **Never ship a route's `loading.tsx` (or any Suspense fallback) with a
  fixed shape that doesn't match what the real content can look like.**
  Next.js only renders a route's `loading.tsx` at all when the navigation is
  slow enough to need a fallback; for the common fast case it keeps the
  previous page on screen and swaps directly once the new one is ready. A
  skeleton whose width or layout doesn't match the destination page (e.g. a
  single-column skeleton for a page that actually renders with a sidebar)
  causes a visible reflow right as real content arrives, on every slow
  navigation. If you can't make the fallback match the real layout
  precisely, don't add one; a global navigation indicator
  ([src/components/top-loader.tsx](../src/components/top-loader.tsx)) is
  what covers the slow case now, site-wide, instead of a per-route
  skeleton. This app no longer has any route-level `loading.tsx` at all,
  on purpose; don't add one back without re-reading this paragraph.
  **This rule applies to every `<Suspense fallback={...}>` in the app, not
  just `loading.tsx` files.** The first pass at this fix only searched for
  the literal file convention (`find -name loading.tsx`) and missed
  `PortalPageLayout`'s own inline Suspense boundary around its sidebar
  widgets, a single generic block standing in for several
  differently-shaped ones; a user had to catch that one live. Whenever
  this rule is the reason for a change, verify with both of these, not
  just one:
  ```
  find src/app -name "loading.tsx"
  grep -rn "Suspense" src/app src/components --include="*.tsx"
  ```
  then read every `fallback=` at each hit and check it actually matches
  what streams in. A dead end there (both commands return nothing) is
  itself the confirmation to record, not a step to skip because the
  literal file type you started from already came back empty.
- **A full-viewport-width fixed element's color has to survive being drawn
  over every background it can land on, not just the one you tested
  against.** The top-loading bar spans `left: 0; width: 100%` at `y=0`
  regardless of which section of the app is active. A single fixed
  `color="var(--brand)"` is invisible in the portal specifically because
  the sticky header directly underneath it is *also* `bg-brand` (a bar the
  same color as what it's drawn on top of doesn't read as a bar at all);
  the same value works fine in admin, which has no colored bar at that
  position. `top-loader.tsx` picks per-section for exactly this reason;
  don't collapse it back to one static color without checking what sits at
  `y=0` in every section that mounts it.
- **A focus ring goes on the outermost bordered container, never on both an
  inner element and its wrapper.** Applying `focus:ring-2` to an editable
  inner element that already sits inside a bordered card produces two
  concentric rings (the wrapper's border, then a visibly separate ring
  nested inside it), which reads as a rendering glitch, not a focus state.
  Put `focus-within:border-brand focus-within:ring-2
  focus-within:ring-brand/20` on the outer card and `focus:outline-none` on
  the inner editable element, matching
  [src/components/ui/field.tsx](../src/components/ui/field.tsx)'s
  `inputClass`. `src/components/editor.tsx` had exactly this bug.
- **`scrollbar-gutter: stable` is a real, considered tradeoff, not a free
  fix.** It reserves the scrollbar's width on every page, whether or not
  that particular page is tall enough to need a scrollbar, so it trades "no
  shift when a scrollbar appears" for "a permanent empty strip on every
  page that doesn't scroll." Whether that trade is worth it depends
  entirely on whether anything sits flush against the true viewport edge:
  this app's sticky header is full-bleed and brand-colored, so the reserved
  strip reads as a visible seam of page background right next to it, on
  every short page, all the time. Tried it 2026-09-25, reverted the same
  day; the occasional real shift on a short-to-tall navigation was judged
  less bad than a permanent, always-visible gap. Don't re-add it without
  checking what's flush against the viewport edge in the section you're
  fixing.

## Primitives

Prefer these over hand-rolled markup. If you're about to write a `<div>`
with a border, background, and rounded corners that holds a heading and
some content, it's a `Panel`; if you're about to write a fixed backdrop
with a centered white box, it's a `ConfirmDialog`.

### PageHeader

The single source of truth for page headings, admin and portal alike.
[src/components/ui/page-header.tsx](../src/components/ui/page-header.tsx),
29 usages as of 2026-09-25.

```tsx
<PageHeader
  title="Announcements"
  description="3 active · 12 total"   // optional, a count or short context line
  action={<NewButton />}               // optional, rendered flush right
  back={{ href: "/admin", label: "Dashboard" }}  // optional back link above the heading
/>
```

Admin edit/new pages use `EditorHeader` instead (never `PageHeader`):

```tsx
import { EditorHeader } from "@/components/editor-header"

<EditorHeader
  backHref="/admin/announcements"   // the list page
  backLabel="Announcements"          // must match the sidebar nav item label exactly
  title="Edit announcement"
  liveHref={published ? `/.../${id}` : undefined}  // optional "View live" link
/>
```

### Panel

A bordered card for one setting or a small grouped section.
[src/components/ui/field.tsx](../src/components/ui/field.tsx), 21 usages.
Built as a thin wrapper over `Card`/`CardHeader`/`CardTitle`/`CardContent`.

```tsx
<Panel title="Optional heading" description="Optional context line.">
  <div className="flex items-center justify-between gap-6">
    <div>
      <p className="text-sm font-medium text-foreground">Setting name</p>
      <p className="mt-0.5 text-xs text-muted-foreground">Description.</p>
    </div>
    <ToggleOrControl />
  </div>
</Panel>
```

Settings pages wrap the whole page (including `PageHeader`) in one
`max-w-3xl space-y-10`; don't nest a second width container inside it.

### ConfirmDialog

Every destructive action (delete, reset, revoke) needs a focus-trapped
modal, never a browser `confirm()` and never a hand-rolled 2-click inline
pattern. [src/components/ui/confirm-dialog.tsx](../src/components/ui/confirm-dialog.tsx),
7 usages.

```tsx
<ConfirmDialog
  open={open}
  onOpenChange={setOpen}
  title="Delete this item?"
  description="This permanently removes it. This can't be undone."
  destructive       // reddens the confirm button; omit for a non-destructive confirmation
  pending={pending}  // shows a spinner and disables both buttons mid-request
  onConfirm={handleConfirm}
/>
```

A few call sites still hand-roll the same backdrop-and-centered-box pattern
instead of using this component (`redeemable-balance.tsx` is one). That's
duplication worth fixing when you're already touching that file, not
urgent enough to chase on its own.

### EmptyState

```tsx
<EmptyState
  icon={IconComponent}
  title="No items yet"
  description="Short explanation of what items are for."
  action={{ label: "Create first item", href: "/admin/.../new" }}
/>
```

Use a different title/description when a filter is active and matches
nothing (`"Nothing matched"` / `"Try a different search term..."`, action
label `"Show all items"`) rather than reusing the zero-state copy.

### AdminTable

Use for every admin list table; never write raw `<table>` markup in an
admin list page. [src/components/ui/admin-table.tsx](../src/components/ui/admin-table.tsx).

```tsx
import { AdminTable } from "@/components/ui/admin-table"
import type { AdminTableCol } from "@/components/ui/admin-table"

const columns: AdminTableCol<Row>[] = [
  { id: "title", header: "Title", render: (row) => <Link href={...}>{row.title}</Link> },
  { id: "updated", header: "Updated", width: "w-24", type: "date", render: (row) => ... },
  { id: "actions", header: "Actions", width: "w-28", type: "actions", render: (row) => <>...</> },
]

<AdminTable columns={columns} rows={rows} rowKey={(r) => r.id} rowAlign="middle" />
```

| `type` | Header align | When to use |
|---|---|---|
| `text` (default) | left | Title, message, name |
| `date` | left | Dates, timestamps |
| `center` | center | Status, category, role, yes/no |
| `number` | center | Counts, numeric values |
| `icon` | center | Icon-only columns (pin, star) |
| `reorder` | n/a | Drag handles |
| `actions` | center | Edit/delete buttons, auto-wraps in a centered flex row |

`rowAlign="middle"` when every cell in a row is single-line (so a badge and
its row's text sit on the same baseline); the default `"top"` for
variable-height rows (article bodies, audit entries). On raw `<table>`
markup in the portal (not `AdminTable`), add `className="align-middle"` to
each `<tr>` for the same effect.

For a location or other long text cell, give `truncate` a fixed-width
parent to measure against:

```tsx
<span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
  <Icon className="size-3 shrink-0" aria-hidden />
  <span className="truncate" title={fullText}>{fullText}</span>
</span>
```

### PortalPageLayout

The sidebar/content split for portal pages.
[src/components/portal-page-layout.tsx](../src/components/portal-page-layout.tsx),
10 usages, all 12 portal pages except the feed (which has its own mobile-only
inline sidebar block).

```tsx
<PortalPageLayout
  layout={settings.xLayout}       // "content" | "sidebar-left" | "sidebar-right" | "sidebar-both"
  sidebarOrder={settings.sidebarOrder}
  leftSidebarOrder={settings.leftSidebarOrder}
  eventsEnabled={enabled.has("events")}
  pollsEnabled={enabled.has("polls")}
  kudosEnabled={enabled.has("kudos")}
  gravatarsEnabled={settings.gravatarsEnabled}
  hideActivePoll   // pass true on the polls listing page itself; redundant there
>
  {content}
</PortalPageLayout>
```

Don't hand-roll the `flex items-start gap-8` + two sticky `<aside>` split
this replaces; it also owns fetching the sidebar widgets
(`PortalSidebarPanel`), so a hand-rolled copy would need to duplicate that
too.

### Button and Badge

[src/components/ui/button.tsx](../src/components/ui/button.tsx) and
[badge.tsx](../src/components/ui/badge.tsx) are real, tokens-based, and
correctly sized to match this app's existing hand-rolled buttons (`h-9
px-4` default, not shadcn's smaller stock default). As of 2026-09-25
neither has a single real usage anywhere in the app; every button and
badge in both admin and the portal is still a hand-written `<Link>` or
`<button>` with its own Tailwind classes.

**Prefer `Button`/`Badge` in any new code.** Don't feel obligated to migrate
an existing hand-rolled button just because you're nearby; that's a real UI
change worth its own verified, visually-checked pass, not a drive-by edit.

```tsx
<Button variant="default">Save</Button>          // brand-filled, primary action
<Button variant="outline">Cancel</Button>         // bordered, secondary action
<Button variant="destructive" size="sm">Delete</Button>
<Button variant="ghost" size="icon"><Icon /></Button>

<Badge>Active</Badge>
<Badge variant="outline">Draft</Badge>
```

Existing hand-rolled equivalents, for reference until they migrate:

```tsx
{/* Primary action (e.g. CTA in a PageHeader) */}
<Link className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm
  font-medium text-white transition hover:brightness-95 active:brightness-90">
  <Plus className="size-4" aria-hidden /> New item
</Link>

{/* Secondary action */}
<Link className="inline-flex items-center rounded-lg border border-border bg-card px-3.5 py-2
  text-sm font-medium text-foreground transition hover:bg-muted">
  Label
</Link>

{/* Icon button, e.g. in an AdminTable actions cell */}
<button aria-label="Action description" className="grid size-7 place-items-center rounded-md
  text-muted-foreground transition hover:bg-muted hover:text-foreground">
  <Icon className="size-3.5" aria-hidden />
</button>
```

## Page structure (admin list pages)

```tsx
export default async function AdminXxxPage({ searchParams }) {
  await requireRole("EDITOR")  // or "ADMIN"
  // ...data fetching...
  return (
    <div>
      <PageHeader title="..." description="N published · M drafts" action={<NewButton />} />
      <AdminFilters basePath="/admin/..." query={query} status={status} placeholder="Search ..." />
      {total === 0 ? (
        <EmptyState ... />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <AdminTable ... />
        </div>
      )}
      {total > PER_PAGE && <TablePagination ... />}
    </div>
  )
}
```

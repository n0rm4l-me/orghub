# OrgHub UI Style Guide

Reference for AI agents and contributors. Follow these patterns exactly — do not introduce new ones without updating this file.

---

## Admin tables

Use the `AdminTable` component (`src/components/ui/admin-table.tsx`) for all admin list tables. Do not write raw `<table>` markup in admin list pages.

### AdminTable usage

```tsx
import { AdminTable } from "@/components/ui/admin-table"
import type { AdminTableCol } from "@/components/ui/admin-table"

type Row = { id: string; title: string; updatedAt: Date }

const columns: AdminTableCol<Row>[] = [
  {
    id: "title",
    header: "Title",
    type: "text",   // optional, defaults to "text"
    render: (row) => <Link href={`/admin/.../${row.id}/edit`}>{row.title}</Link>,
  },
  {
    id: "updated",
    header: "Updated",
    width: "w-24",
    type: "date",
    render: (row) => row.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  },
  {
    id: "actions",
    header: "Actions",
    width: "w-28",
    type: "actions",       // auto-wraps content in flex items-center justify-center gap-1.5
    render: (row) => <><EditLink id={row.id} /><DeleteButton ... /></>,
  },
]

// rowAlign="top" (default) for variable-height rows; "middle" for single-line rows
<AdminTable columns={columns} rows={rows} rowKey={(r) => r.id} rowAlign="middle" />
```

### Column types

| `type` | Header align | Cell classes | When to use |
|---|---|---|---|
| `text` (default) | left | `px-5 py-3` | Title, message, name |
| `date` | left | `px-5 py-3 text-xs whitespace-nowrap text-gray-400` | Dates, timestamps |
| `center` | center | `px-5 py-3 text-center` | Status, category, role, yes/no |
| `number` | center | `px-2 py-3 text-center text-xs text-gray-400` | Counts, numeric values |
| `icon` | center | `px-0.5 py-3 !align-middle text-center` | Icon-only columns (pin, star) |
| `reorder` | — | `px-1.5 py-2 !align-middle` | Drag handles |
| `actions` | center | `px-5 py-3` + `flex justify-center` wrapper | Edit/delete buttons |

### Actions cell

The `actions` type automatically wraps rendered content in:
```tsx
<div className="flex items-center justify-center gap-1.5">{content}</div>
```

### Column widths (reference)

Date-only columns: `w-24`. Date+time or multi-line date: `w-36`–`w-56` depending on content. Actions: `w-28`. Status: `w-24`–`w-28`. Icon-only (pin, star): `w-9`. Title column: no width (auto, takes remaining space).

### rowAlign

Use `rowAlign="middle"` for tables where all rows are single-line (Events, Users, Polls). Use the default `"top"` for tables with variable-height rows (Articles, Announcements, Audit).

### Location / long text cells

Use a block flex container so `truncate` has a fixed parent width to measure against:

```tsx
<span className="flex min-w-0 items-center gap-1 text-xs text-gray-500">
  <Icon className="size-3 shrink-0" aria-hidden />
  <span className="truncate" title={fullText}>{fullText}</span>
</span>
```

### Row hover

AdminTable adds `hover:bg-gray-50/70 transition-colors group` to every `<tr>` automatically.

---

## Editor pages (edit / new)

All admin edit and new pages must use `EditorHeader` (never `PageHeader`):

```tsx
import { EditorHeader } from "@/components/editor-header"

<EditorHeader
  backHref="/admin/announcements"   // the list page
  backLabel="Announcements"         // matches the nav item label
  title="Edit announcement"
  liveHref={published ? `/.../${id}` : undefined}  // optional "View live" link
/>
```

Rules:
- `backLabel` must match the sidebar nav item label exactly (e.g. "Articles", "Events", "Polls", "Announcements", "Pages")
- Events are articles with `eventDate` set — their edit page lives at `/admin/events/[id]/edit` and uses `backHref="/admin/events"`
- After creating a new event (`/admin/articles/new?kind=event`), redirect to `/admin/events/{id}/edit`

---

## Forms and settings panels

### Section heading

```tsx
<h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
  Section name
</h2>
```

### Panel (bordered card for a single setting)

```tsx
<Panel>
  <div className="flex items-center justify-between gap-6">
    <div>
      <p className="text-sm font-medium text-gray-900">Setting name</p>
      <p className="mt-0.5 text-xs text-gray-500">Description.</p>
    </div>
    <ToggleOrControl />
  </div>
</Panel>
```

### Settings page layout

Wrap the entire page (including `<PageHeader>`) in `max-w-3xl space-y-10`. Do not create nested width containers — all sections sit at the same level.

```tsx
<div className="max-w-3xl space-y-10">
  <PageHeader title="..." description="..." />
  <section>...</section>
  <section>...</section>
</div>
```

---

## Buttons

### Primary action (CTA in PageHeader)

```tsx
<Link
  href="/admin/.../new"
  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white transition hover:brightness-95 active:brightness-90"
>
  <Plus className="size-4" aria-hidden />
  New item
</Link>
```

### Secondary action (outline)

```tsx
<Link
  href="..."
  className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
>
  Label
</Link>
```

### Icon button (in Actions cell)

```tsx
<button
  aria-label="Action description"
  className="grid size-7 place-items-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
>
  <Icon className="size-3.5" aria-hidden />
</button>
```

---

## Typography

| Use | Class |
|---|---|
| Page title | `PageHeader` component |
| Section heading | `text-sm font-semibold uppercase tracking-wide text-gray-400` |
| Table header | `text-xs font-semibold tracking-wide text-gray-400 uppercase` (on `<tr>`) |
| Primary cell text | `text-sm font-medium text-gray-900` |
| Secondary cell text | `text-xs text-gray-400` |
| Monospace (paths, IPs) | `font-mono text-xs text-gray-400` |
| Truncated cell | `truncate` on `<td>` or inner element |

---

## Colors

All brand-color references use `bg-brand`, `text-brand`, `ring-brand`, `focus:ring-brand/20`. Never hardcode hex in JSX — use the CSS variable set by `--brand` in `<style>` from settings.

Status colors:
- Active / Published: `bg-emerald-500` dot, `text-gray-600`
- Disabled / Draft: `bg-red-400` dot, `text-red-600`
- Pending / Scheduled: `bg-amber-400` dot, `text-gray-600`

---

## Icons

Library: `lucide-react`. Always add `aria-hidden` to decorative icons. Use `aria-label` on icon-only buttons. Standard sizes:

| Context | Class |
|---|---|
| Button icon | `size-4` |
| Cell icon button | `size-3.5` |
| Table header icon | `size-3.5` |
| Inline indicator | `size-3` |
| Avatar fallback | — |

---

## Empty states

```tsx
<EmptyState
  icon={IconComponent}
  title="No items yet"
  description="Short explanation of what items are for."
  action={{ label: "Create first item", href: "/admin/.../new" }}
/>
```

When filtering is active and returns nothing:

```tsx
<EmptyState
  icon={IconComponent}
  title="Nothing matched"
  description="Try a different search term or clear the status filter."
  action={{ label: "Show all items", href: "/admin/..." }}
/>
```

---

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
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table>...</table>
        </div>
      )}
      {total > PER_PAGE && <TablePagination ... />}
    </div>
  )
}
```

Settings pages use `max-w-3xl space-y-10` wrapper instead of `<div>`.
